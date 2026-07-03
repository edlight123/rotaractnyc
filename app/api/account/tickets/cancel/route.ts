/**
 * POST /api/account/tickets/cancel
 *
 * Self-serve reservation cancellation for the guest/supporter account area.
 * Works for both ticket kinds surfaced by GET /api/account/tickets:
 *   - kind 'member': `rsvps/{ticketId}` owned via memberId == uid.
 *   - kind 'guest':  `guest_rsvps/{ticketId}` owned via the session's
 *     VERIFIED email matching the doc's email (case-insensitive) — mirrors
 *     the `ownsEmail()` rule used by the tickets GET.
 *
 * Mechanics mirror the portal cancel-ticket route:
 *   - Free RSVPs: flip status (member → 'not_going', guest → 'cancelled'),
 *     decrement event attendeeCount, release any held tier spot. Free
 *     cancellations are allowed any time before the event ends.
 *   - Paid online (Stripe): allowed only up to REFUND_CUTOFF_DAYS before the
 *     event start; a full refund is issued and the RSVP is optimistically
 *     marked cancelled with paymentStatus 'refund_pending'. The
 *     `charge.refunded` webhook finalizes state and adjusts counts.
 *   - Offline / pending offline payments: mark cancelled and flip the
 *     associated `offlinePayments` record to 'rejected' for the treasurer.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { getStripe } from '@/lib/stripe/client';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { decrementTierSoldCount } from '@/lib/services/tierTracking';
import { logAuditEvent, type AuditAction } from '@/lib/services/auditLog';
import { eventHasEnded } from '@/lib/utils/eventTime';

export const dynamic = 'force-dynamic';

const REFUND_CUTOFF_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const rl = await rateLimit(getRateLimitKey(request, 'account-cancel-ticket'), {
    max: 5,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  // ── Authenticate (same pattern as GET /api/account/tickets) ──
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid: string;
  let email: string | null = null;
  let emailVerified = false;
  let actorName = 'Account holder';
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
    email = (decoded.email || '').toLowerCase() || null;
    emailVerified = !!decoded.email_verified;
    if (decoded.name) actorName = String(decoded.name);
    else if (email) actorName = email;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse + validate body ──
  let body: { kind?: string; ticketId?: string; eventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const kind = body.kind;
  const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  if ((kind !== 'member' && kind !== 'guest') || !ticketId || !eventId) {
    return NextResponse.json(
      { error: 'kind ("member" | "guest"), ticketId, and eventId are required.' },
      { status: 400 },
    );
  }

  const collection = kind === 'member' ? 'rsvps' : 'guest_rsvps';

  // ── Load ticket + event ──
  const [ticketSnap, eventSnap] = await Promise.all([
    adminDb.collection(collection).doc(ticketId).get(),
    adminDb.collection('events').doc(eventId).get(),
  ]);

  const notFound = NextResponse.json(
    { error: 'Ticket not found.' },
    { status: 404 },
  );

  if (!ticketSnap.exists) return notFound;
  if (!eventSnap.exists) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  const ticket = ticketSnap.data()!;
  const event = eventSnap.data()!;

  // The ticket must actually belong to the event the caller named — counts
  // are adjusted on that event, so a mismatch would corrupt another event.
  if (ticket.eventId !== eventId) return notFound;

  // ── Ownership ──
  if (kind === 'member') {
    if (ticket.memberId !== uid) return notFound;
  } else {
    const ticketEmail = String(ticket.email || '').toLowerCase();
    if (!emailVerified || !email || ticketEmail !== email) return notFound;
  }

  // ── State guards ──
  if (ticket.status !== 'going') {
    return NextResponse.json(
      { error: 'This reservation has already been cancelled or is not active.' },
      { status: 400 },
    );
  }

  if (eventHasEnded(event)) {
    return NextResponse.json(
      { error: 'This event has already ended, so the reservation can no longer be cancelled.' },
      { status: 400 },
    );
  }

  const quantity = Number(ticket.quantity) || 1;
  const tierId = typeof ticket.tierId === 'string' ? ticket.tierId : null;
  const stripeRef: string | null =
    typeof ticket.stripeSessionId === 'string' ? ticket.stripeSessionId : null;
  const paidAmount = Number(ticket.paidAmount) || 0;
  const paymentStatus: string =
    ticket.paymentStatus || (paidAmount > 0 ? 'paid' : 'free');
  const isPaid =
    paymentStatus === 'paid' || paymentStatus === 'pending_offline' || paidAmount > 0;

  // ── Refund cutoff — PAID tickets only; free RSVPs can cancel any time
  //    before the event ends. ──
  const eventDate = event.date ? new Date(event.date) : null;
  if (isPaid) {
    if (!eventDate || isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: 'Event date is invalid; please contact us to cancel.' },
        { status: 422 },
      );
    }
    const daysUntilEvent = (eventDate.getTime() - Date.now()) / MS_PER_DAY;
    if (daysUntilEvent < REFUND_CUTOFF_DAYS) {
      return NextResponse.json(
        {
          error: `Self-serve cancellations for paid tickets close ${REFUND_CUTOFF_DAYS} days before the event. Please email us if you need help.`,
          cutoffDays: REFUND_CUTOFF_DAYS,
          daysUntilEvent: Math.max(0, Math.floor(daysUntilEvent)),
        },
        { status: 403 },
      );
    }
  }

  // ── Issue Stripe refund (only for actually paid online tickets) ──
  let refundId: string | null = null;
  let refundError: string | null = null;
  const wasPaidOnline = paymentStatus === 'paid' && stripeRef && paidAmount > 0;

  if (wasPaidOnline) {
    try {
      const stripe = getStripe();

      // stripeSessionId may be either a Checkout Session id (cs_…) or a
      // PaymentIntent id (pi_…) depending on which checkout flow was used.
      let paymentIntentId: string | null = null;
      if (stripeRef!.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(stripeRef!);
        paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
      } else if (stripeRef!.startsWith('pi_')) {
        paymentIntentId = stripeRef!;
      }

      if (!paymentIntentId) {
        throw new Error('Could not locate Stripe payment intent for this ticket.');
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          source: 'account_self_serve_cancellation',
          eventId,
          ticketId,
          kind,
          actorId: uid,
        },
      });
      refundId = refund.id;
    } catch (err: any) {
      console.error('[AccountCancelTicket] Stripe refund failed:', err);
      refundError = err?.message || 'Refund failed';
      return NextResponse.json(
        {
          error:
            'We could not process your refund automatically. Please contact us — your reservation has not been cancelled.',
        },
        { status: 502 },
      );
    }
  }

  // ── Update the RSVP ──
  // Member RSVPs use 'not_going', guest RSVPs use 'cancelled' — matching the
  // final states the charge.refunded webhook writes for each collection.
  // For Stripe refunds the webhook flips paymentStatus to 'refunded' and
  // adjusts counts; we optimistically mark the doc here so the UI updates
  // instantly and the ticket can't be double-cancelled.
  const cancelledStatus = kind === 'member' ? 'not_going' : 'cancelled';
  await adminDb.collection(collection).doc(ticketId).update({
    status: cancelledStatus,
    cancelledAt: new Date().toISOString(),
    cancelledBy: 'self',
    ...(refundId ? { stripeRefundId: refundId, paymentStatus: 'refund_pending' } : {}),
    ...(!wasPaidOnline ? { paymentStatus: 'cancelled' } : {}),
    updatedAt: new Date().toISOString(),
  });

  // For non-Stripe paths (free / offline) the webhook won't fire, so adjust
  // counts inline. For Stripe refunds count adjustment is left to the
  // webhook (handleChargeRefunded) to keep a single source of truth.
  if (!wasPaidOnline) {
    if (tierId) {
      try {
        await decrementTierSoldCount(eventId, tierId, quantity);
      } catch (err) {
        console.error('[AccountCancelTicket] Failed to release tier spot:', err);
      }
    }
    try {
      await adminDb.collection('events').doc(eventId).update({
        attendeeCount: FieldValue.increment(-quantity),
      });
    } catch (err) {
      console.error('[AccountCancelTicket] Failed to decrement attendeeCount:', err);
    }

    // Cancel any pending offline payment record
    if (paymentStatus === 'pending_offline' && ticket.offlinePaymentId) {
      try {
        await adminDb
          .collection('offlinePayments')
          .doc(ticket.offlinePaymentId)
          .update({
            status: 'rejected',
            rejectedReason: 'Self-cancelled from account before payment confirmation',
            confirmedAt: new Date().toISOString(),
            confirmedBy: 'self',
          });
      } catch (err) {
        console.error('[AccountCancelTicket] Failed to update offline payment:', err);
      }
    }
  }

  // Audit log (fire-and-forget). Distinct action name for the account-area
  // flow; the AuditAction union lives outside this change's allowed files,
  // so the string is cast — Firestore stores it as-is.
  logAuditEvent('account_ticket_cancel' as AuditAction, uid, actorName, {
    targetId: eventId,
    targetType: 'event',
    details: {
      eventTitle: event.title,
      kind,
      ticketId,
      paymentStatus,
      paidAmount,
      quantity,
      tierId,
      refundId,
      refundError,
    },
  });

  return NextResponse.json({
    success: true,
    refunded: !!refundId,
    message: refundId
      ? 'Your reservation has been cancelled and a refund has been issued. It may take 5–10 business days to appear on your statement.'
      : paymentStatus === 'pending_offline'
      ? 'Your reservation has been cancelled. Any pending payment will be voided.'
      : 'Your reservation has been cancelled.',
  });
}
