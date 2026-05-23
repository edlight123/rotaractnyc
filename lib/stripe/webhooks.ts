/**
 * Stripe webhook event handlers.
 *
 * Refactored architecture (P1 #9):
 * - Modular handlers keyed by metadata.type
 * - handleCheckoutCompleted dispatches to: dues, member_event, guest_event, donation
 * - Each handler is independently testable
 * - Added: member refund RSVP update (P0 #1), checkout expiry cleanup (P0 #5),
 *   partial refund support (P2 #15), payment failed RSVP cleanup (P2 #16),
 *   tier info in confirmation emails (P1 #10)
 */
import type Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { recordDuesPayment } from '@/lib/services/dues';
import { upsertRSVP } from '@/lib/services/events';
import { createTransaction } from '@/lib/services/finance';
import { adjustTierSoldCount, releaseTierSpot } from '@/lib/services/tierTracking';
import { logAuditEvent } from '@/lib/services/auditLog';
import { sendEmail } from '@/lib/email/send';
import { guestTicketConfirmationEmail, memberTicketConfirmationEmail, donationThankYouEmail } from '@/lib/email/templates';
import { generateTicketQRCodeUrls } from '@/lib/utils/qrcode';

/**
 * Idempotency: check if we already processed a Stripe event.
 *
 * Uses a Firestore transaction on the `processed_webhooks` collection to
 * atomically read-and-write, preventing duplicates even under concurrent
 * webhook deliveries for the same Stripe event ID.
 */
async function markEventProcessed(eventId: string): Promise<boolean> {
  try {
    const ref = adminDb.collection('processed_webhooks').doc(eventId);
    const alreadyProcessed = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return true;
      tx.set(ref, {
        processedAt: new Date().toISOString(),
        ttl: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      return false;
    });
    return alreadyProcessed;
  } catch (err) {
    console.error('[Webhook] Idempotency check failed:', err);
    // On transaction failure (e.g., write contention), assume already processed
    return true;
  }
}

// ── Donor CRM helpers ──────────────────────────────────────────────────

interface DonorRecord {
  name: string;
  email: string;
  lastDonationDate: string;
  lastDonationAmountCents: number;
  totalDonatedCents: number;
  totalDonationCount: number;
  stripeSessionIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

async function upsertDonorRecord(params: {
  name: string;
  email: string;
  amountCents: number;
  stripeSessionId: string;
}): Promise<void> {
  const docId = params.email.toLowerCase();
  const ref = adminDb.collection('donors').doc(docId);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = new Date().toISOString();

    if (!snap.exists) {
      tx.set(ref, {
        name: params.name,
        email: params.email.toLowerCase(),
        lastDonationDate: now,
        lastDonationAmountCents: params.amountCents,
        totalDonatedCents: params.amountCents,
        totalDonationCount: 1,
        stripeSessionIds: [params.stripeSessionId],
        createdAt: now,
        updatedAt: now,
      } satisfies DonorRecord);
    } else {
      const existing = snap.data()! as DonorRecord;
      tx.update(ref, {
        name: params.name,
        lastDonationDate: now,
        lastDonationAmountCents: params.amountCents,
        totalDonatedCents: (existing.totalDonatedCents || 0) + params.amountCents,
        totalDonationCount: (existing.totalDonationCount || 0) + 1,
        stripeSessionIds: [
          ...(existing.stripeSessionIds || []),
          params.stripeSessionId,
        ].slice(-20), // keep last 20 session IDs
        updatedAt: now,
      });
    }
  });
}

/**
 * Legacy check: also look up by session/PI ID for backward compat.
 */
async function isSessionProcessed(sessionId: string): Promise<boolean> {
  const snap = await adminDb
    .collection('transactions')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();
  return !snap.empty;
}

/** Fetch event data from Firestore. Returns null if not found. */
async function fetchEventData(eventId: string) {
  const doc = await adminDb.collection('events').doc(eventId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    title: d.title || 'Event',
    date: d.date || '',
    time: d.time || '',
    location: d.location || '',
    slug: d.slug || eventId,
    pricing: d.pricing,
  };
}

/** Send a member ticket confirmation email (branded, no membership upsell). */
async function sendMemberTicketConfirmationEmail(
  name: string,
  email: string,
  memberId: string,
  eventId: string,
  amountCents: number,
  tierId?: string,
  quantity = 1,
): Promise<void> {
  try {
    if (!email) return;
    const event = await fetchEventData(eventId);
    if (!event) return;
    const tier = tierId ? event.pricing?.tiers?.find((t: any) => t.id === tierId) : undefined;
    let qrCodes: string[] | undefined;
    try {
      // One QR code per ticket so a member who buys N tickets can hand each
      // guest their own scannable code. Signed against the member id (not
      // the tier id — that was the previous bug) so the check-in endpoint
      // can validate the signature.
      //
      // Use HOSTED PNG URLs (not data URIs) because Gmail and several other
      // email clients strip data: images and render a broken-image
      // placeholder. The /api/events/qr route serves PNGs from the same
      // signed parameters.
      if (eventId && memberId) qrCodes = generateTicketQRCodeUrls(eventId, memberId, quantity);
    } catch { /* QR generation is best-effort */ }
    const content = memberTicketConfirmationEmail(
      name,
      { ...event, tierLabel: tier?.label, quantity },
      amountCents,
      qrCodes,
    );
    await sendEmail({ to: email, subject: content.subject, html: content.html, text: content.text });
  } catch (err) {
    console.error('Failed to send member ticket confirmation email:', err);
  }
}

/** Send a guest ticket confirmation email. P1 #10: includes tier info. */
async function sendTicketConfirmationEmail(
  name: string,
  email: string,
  eventId: string,
  amountCents: number,
  tierLabel?: string,
  quantity = 1,
): Promise<void> {
  try {
    if (!email) return;
    const event = await fetchEventData(eventId);
    if (!event) return;
    let qrCodes: string[] | undefined;
    try {
      // Use the lower-cased email as a stable holder id for guest tickets.
      // Hosted PNG URLs avoid Gmail's data-URI image stripping.
      qrCodes = generateTicketQRCodeUrls(eventId, email, quantity);
    } catch { /* QR generation is best-effort */ }
    // Suppress the "Consider joining Rotaract NYC" upsell when the buyer
    // is already a member (e.g. a member who used the public guest flow
    // instead of the portal). Best-effort lookup — falls back to the
    // upsell if the query fails.
    let isMember = false;
    try {
      const memberSnap = await adminDb
        .collection('members')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();
      isMember = !memberSnap.empty;
    } catch { /* default to non-member */ }
    const content = guestTicketConfirmationEmail(
      name,
      { ...event, tierLabel, quantity },
      amountCents,
      qrCodes,
      { isMember },
    );
    await sendEmail({ to: email, subject: content.subject, html: content.html, text: content.text });
  } catch (err) {
    console.error('Failed to send guest ticket confirmation email:', err);
  }
}

// ── Decomposed checkout handlers (P1 #9) ─────────────────────────────────

/** Handle dues payment checkout completion */
async function handleDuesPayment(session: Stripe.Checkout.Session): Promise<void> {
  const { memberId, memberType, cycleId, cycleName } = session.metadata ?? {};
  if (!memberId || !memberType) {
    console.error('[DuesHandler] Missing memberId or memberType for dues payment.');
    return;
  }

  const resolvedCycleId = cycleId || cycleName || 'unknown';

  await recordDuesPayment({
    memberId,
    cycleId: resolvedCycleId,
    memberType: memberType as 'professional' | 'student',
    amount: session.amount_total || 0,
    status: 'PAID',
    stripePaymentId: session.payment_intent as string,
  });

  await createTransaction({
    type: 'income',
    category: 'Dues',
    amount: session.amount_total || 0,
    description: `Dues payment — ${memberType} (${resolvedCycleId})`,
    date: new Date().toISOString(),
    createdBy: 'stripe',
    createdAt: new Date().toISOString(),
    paymentMethod: 'stripe',
    relatedMemberId: memberId,
    stripeSessionId: session.id,
  });
}

/** Handle member event ticket checkout completion */
async function handleMemberEventTicket(session: Stripe.Checkout.Session): Promise<void> {
  const { eventId, memberId, ticketType, tierId } = session.metadata ?? {};
  if (!eventId || !memberId) return;

  const quantity = parseInt(session.metadata?.quantity || '1', 10) || 1;

  // Resolve a friendly member display name (falls back to email/customer_email).
  let memberName = session.customer_details?.name || session.customer_email || 'Member';
  let memberPhoto: string | undefined;
  try {
    const userRecord = await adminAuth.getUser(memberId);
    if (userRecord.displayName) memberName = userRecord.displayName;
    if (userRecord.photoURL) memberPhoto = userRecord.photoURL;
  } catch {
    /* best effort — user may not exist in auth */
  }

  const upsertResult = await upsertRSVP({
    eventId,
    memberId,
    memberName,
    memberPhoto,
    status: 'going',
    tierId: tierId || undefined,
    paymentStatus: 'paid',
    paidAmount: session.amount_total || 0,
    quantity,
    stripeSessionId: session.id,
    ticketType: ticketType || 'member',
    additive: true,
  });

  // Stripe sometimes redelivers webhook events. If we already processed
  // this exact session for this RSVP, don't double-count tiers, attendee
  // counts, transactions or confirmation emails.
  if (upsertResult.skipped) {
    console.log('[MemberTicket] Duplicate session; skipping side effects', session.id);
    return;
  }

  if (tierId) await adjustTierSoldCount(eventId, tierId, quantity);

  // Increment attendeeCount on the event document
  try {
    await adminDb.collection('events').doc(eventId).update({
      attendeeCount: FieldValue.increment(quantity),
    });
  } catch (err) {
    console.error('[MemberTicket] Failed to update attendeeCount:', err);
  }

  await createTransaction({
    type: 'income',
    category: 'Events',
    amount: session.amount_total || 0,
    description: `Event ticket — ${ticketType || 'member'}`,
    date: new Date().toISOString(),
    createdBy: 'stripe',
    createdAt: new Date().toISOString(),
    paymentMethod: 'stripe',
    relatedMemberId: memberId,
    stripeSessionId: session.id,
    eventId,
    quantity,
  });

  // Send branded member confirmation email (P1 #10: tier + quantity included)
  try {
    const userRecord = await adminAuth.getUser(memberId);
    if (userRecord.email) {
      // Prefer the member's actual first name (from the members collection)
      // over the auth display name so we don't fall back to "Member" when
      // displayName isn't set, and so we don't greet them with their full name.
      let greetingName = 'there';
      try {
        const memberDoc = await adminDb.collection('members').doc(memberId).get();
        const m = memberDoc.data();
        if (m?.firstName) {
          greetingName = String(m.firstName).trim();
        } else if (userRecord.displayName) {
          greetingName = userRecord.displayName.split(' ')[0] || userRecord.displayName;
        } else if (m?.displayName) {
          greetingName = String(m.displayName).split(' ')[0];
        }
      } catch { /* fall back to userRecord.displayName below */ }
      if (greetingName === 'there' && userRecord.displayName) {
        greetingName = userRecord.displayName.split(' ')[0] || userRecord.displayName;
      }
      await sendMemberTicketConfirmationEmail(
        greetingName,
        userRecord.email,
        memberId,
        eventId,
        session.amount_total || 0,
        tierId || undefined,
        quantity,
      );
    }
  } catch (err) {
    console.error('Failed to send member ticket confirmation email:', err);
  }
}

/** Handle guest event ticket checkout completion */
async function handleGuestEventTicket(session: Stripe.Checkout.Session): Promise<void> {
  const { eventId, guestName, guestEmail, guestPhone, tierId } = session.metadata ?? {};
  if (!eventId) return;

  const quantity = parseInt(session.metadata?.quantity || '1', 10) || 1;
  const email = (guestEmail || '').toLowerCase();

  // Fetch tier label for the email (P1 #10)
  let tierLabel: string | undefined;
  if (tierId) {
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    const tier = eventDoc.data()?.pricing?.tiers?.find((t: any) => t.id === tierId);
    tierLabel = tier?.label;
  }

  // Check for existing guest RSVP by email+eventId and update if found, create if not.
  // ── Idempotency + additive update ──
  // Stripe webhooks can be redelivered, and the same guest can buy tickets
  // across multiple orders. We track each Stripe session id in a
  // `stripeSessionIds[]` array on the guest_rsvp doc:
  //   - If this session is already recorded → skip ALL side effects.
  //   - Otherwise, INCREMENT quantity and paidAmount (don't overwrite) so
  //     multi-order guests aren't silently truncated to their latest purchase.
  const existingSnap = await adminDb
    .collection('guest_rsvps')
    .where('eventId', '==', eventId)
    .where('email', '==', email)
    .limit(1)
    .get();

  let skipSideEffects = false;
  if (existingSnap.empty) {
    await adminDb.collection('guest_rsvps').add({
      eventId,
      name: guestName || 'Guest',
      email,
      phone: guestPhone || null,
      status: 'going',
      ticketType: 'guest',
      tierId: tierId || null,
      tierLabel: tierLabel || null,
      quantity,
      paidAmount: session.amount_total || 0,
      paymentStatus: 'paid',
      stripeSessionId: session.id,
      stripeSessionIds: [session.id],
      promoCode: session.metadata?.promoCode || null,
      discountPercent: session.metadata?.discountPercent ? Number(session.metadata.discountPercent) : null,
      customFields: session.metadata?.customFields ? JSON.parse(session.metadata.customFields) : null,
      createdAt: new Date().toISOString(),
    });
  } else {
    const existingDoc = existingSnap.docs[0];
    const existingData = existingDoc.data() as any;
    const seenSessions: string[] = Array.isArray(existingData.stripeSessionIds)
      ? existingData.stripeSessionIds
      : existingData.stripeSessionId
        ? [existingData.stripeSessionId]
        : [];
    if (seenSessions.includes(session.id)) {
      console.log('[GuestTicket] Duplicate session; skipping side effects', session.id);
      skipSideEffects = true;
    } else {
      await adminDb.collection('guest_rsvps').doc(existingDoc.id).update({
        status: 'going',
        tierId: tierId || existingData.tierId || null,
        tierLabel: tierLabel || existingData.tierLabel || null,
        quantity: FieldValue.increment(quantity),
        paidAmount: FieldValue.increment(session.amount_total || 0),
        paymentStatus: 'paid',
        stripeSessionId: session.id,
        stripeSessionIds: FieldValue.arrayUnion(session.id),
        promoCode: session.metadata?.promoCode || existingData.promoCode || null,
        discountPercent: session.metadata?.discountPercent
          ? Number(session.metadata.discountPercent)
          : existingData.discountPercent ?? null,
        customFields: session.metadata?.customFields
          ? JSON.parse(session.metadata.customFields)
          : existingData.customFields ?? null,
      });
    }
  }

  if (skipSideEffects) return;

  if (tierId) await adjustTierSoldCount(eventId, tierId, quantity);

  // Increment attendeeCount on the event document
  try {
    await adminDb.collection('events').doc(eventId).update({
      attendeeCount: FieldValue.increment(quantity),
    });
  } catch (err) {
    console.error('[GuestTicket] Failed to update attendeeCount:', err);
  }

  await createTransaction({
    type: 'income',
    category: 'Events',
    amount: session.amount_total || 0,
    description: `Guest event ticket — ${guestName || 'Guest'}`,
    date: new Date().toISOString(),
    createdBy: 'stripe',
    createdAt: new Date().toISOString(),
    paymentMethod: 'stripe',
    stripeSessionId: session.id,
    email: guestEmail || undefined,
    eventId,
    quantity,
  });

  await sendTicketConfirmationEmail(
    guestName || 'Guest',
    guestEmail || '',
    eventId,
    session.amount_total || 0,
    tierLabel,
    quantity,
  );
}

/** Handle donation checkout completion */
async function handleDonationCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const donorName =
    session.metadata?.donorName ||
    session.customer_details?.name ||
    'Donor';
  const rawEmail =
    session.metadata?.donorEmail ||
    session.customer_email ||
    session.customer_details?.email ||
    '';
  const donorEmail = typeof rawEmail === 'string' && rawEmail.includes('@')
    ? rawEmail.toLowerCase()
    : '';
  const amountCents = session.amount_total || 0;

  // Optional event attribution (set when donation came from an event page)
  const eventId = typeof session.metadata?.eventId === 'string' ? session.metadata.eventId : '';
  const eventTitle = typeof session.metadata?.eventTitle === 'string' ? session.metadata.eventTitle : '';
  const donorMessage = typeof session.metadata?.message === 'string' ? session.metadata.message.slice(0, 500) : '';

  // Persist donor to `donors` collection (CRM)
  if (donorEmail) {
    try {
      await upsertDonorRecord({
        name: donorName,
        email: donorEmail,
        amountCents,
        stripeSessionId: session.id,
      });
    } catch (err) {
      console.error('Failed to upsert donor record:', err);
    }
  }

  // Attribute donation to the event when provided
  if (eventId) {
    try {
      const eventRef = adminDb.collection('events').doc(eventId);
      const donationRef = eventRef.collection('donations').doc(session.id);
      await adminDb.runTransaction(async (tx) => {
        const existing = await tx.get(donationRef);
        if (existing.exists) return; // idempotent — already recorded
        tx.set(donationRef, {
          stripeSessionId: session.id,
          donorName,
          donorEmail: donorEmail || null,
          amountCents,
          message: donorMessage || null,
          createdAt: new Date().toISOString(),
        });
        tx.update(eventRef, {
          donationsTotalCents: FieldValue.increment(amountCents),
          donationsCount: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      console.error('Failed to attribute donation to event', eventId, err);
    }
  }

  await createTransaction({
    type: 'income',
    category: 'Donations',
    amount: amountCents,
    description: eventTitle
      ? `Donation (${eventTitle}) — $${(amountCents / 100).toFixed(2)}`
      : `Donation — $${(amountCents / 100).toFixed(2)}`,
    date: new Date().toISOString(),
    createdBy: 'stripe',
    createdAt: new Date().toISOString(),
    paymentMethod: 'stripe',
    stripeSessionId: session.id,
    email: donorEmail || undefined,
    status: 'completed',
  });

  // Audit log
  try {
    await logAuditEvent(
      'donation.created',
      'stripe',
      donorName,
      {
        targetType: 'donation',
        targetId: eventId || undefined,
        details: {
          amountCents,
          donorEmail: donorEmail || 'unknown',
          stripeSessionId: session.id,
          ...(eventId ? { eventId, eventTitle } : {}),
        },
      },
    );
  } catch (err) {
    console.error('Failed to write donation audit log:', err);
  }

  // Send thank-you email to donor
  if (donorEmail) {
    try {
      const content = donationThankYouEmail(donorName, amountCents, eventTitle || undefined, donorMessage || undefined);
      await sendEmail({ to: donorEmail, subject: content.subject, html: content.html, text: content.text });
    } catch (err) {
      console.error('Failed to send donation thank-you email:', err);
    }
  }
}

// ── Main dispatcher (P1 #9: refactored to strategy pattern) ─────────────

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Legacy idempotency guard (backward compat)
  if (await isSessionProcessed(session.id)) {
    console.log('[Webhook] Already processed for session:', session.id);
    return;
  }

  // Handle missing metadata
  if (!session.metadata) {
    console.error('[Webhook] Missing metadata on checkout session:', session.id);
    return;
  }

  const { type } = session.metadata;

  // Strategy-pattern dispatch by type (P1 #9)
  switch (type) {
    case 'dues':
      await handleDuesPayment(session);
      break;
    case 'event':
    case 'event_ticket':
      await handleMemberEventTicket(session);
      break;
    case 'guest_event_ticket':
      await handleGuestEventTicket(session);
      break;
    case 'donation':
      await handleDonationCheckout(session);
      break;
    default:
      console.error('[Webhook] Unknown checkout session type:', type, 'session:', session.id);
  }
}

export async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  // If this PI is from a Checkout Session, the checkout.session.completed handler
  // is the authoritative processor — skip to avoid duplicate RSVPs & transactions.
  if (pi.metadata?.checkout_session_id) {
    console.log('[PI] Skipping — handled by checkout.session.completed:', pi.metadata.checkout_session_id);
    return;
  }

  // Legacy idempotency guard (backward compat)
  if (await isSessionProcessed(pi.id)) {
    console.log('[PI] PaymentIntent already processed:', pi.id);
    return;
  }

  if (!pi.metadata) {
    console.error('[PI] Missing metadata on payment intent:', pi.id);
    return;
  }

  const { type, memberId, eventId, ticketType, tierId } = pi.metadata;
  const quantity = parseInt(pi.metadata.quantity || '1', 10) || 1;
  const amountCents = pi.amount;
  const receiptEmail = pi.receipt_email ?? undefined;
  const guestName = pi.metadata.guestName;
  const guestEmail = pi.metadata.guestEmail;
  const guestPhone = pi.metadata.guestPhone;

  // Member event ticket via PaymentIntent
  if ((type === 'event' || type === 'event_ticket') && eventId && memberId) {
    let memberName = receiptEmail || 'Member';
    let memberPhoto: string | undefined;
    try {
      const userRecord = await adminAuth.getUser(memberId);
      if (userRecord.displayName) memberName = userRecord.displayName;
      if (userRecord.photoURL) memberPhoto = userRecord.photoURL;
    } catch {
      /* best effort */
    }

    const piUpsertResult = await upsertRSVP({
      eventId,
      memberId,
      memberName,
      memberPhoto,
      status: 'going',
      tierId: tierId || undefined,
      paymentStatus: 'paid',
      paidAmount: amountCents,
      quantity,
      stripeSessionId: pi.id,
      ticketType: ticketType || 'member',
      additive: true,
    });

    // Idempotency guard for redelivered PaymentIntent webhooks.
    if (piUpsertResult.skipped) {
      console.log('[PI MemberTicket] Duplicate PaymentIntent; skipping side effects', pi.id);
      return;
    }

    if (tierId) await adjustTierSoldCount(eventId, tierId, quantity);

    // Increment attendeeCount on the event document
    try {
      await adminDb.collection('events').doc(eventId).update({
        attendeeCount: FieldValue.increment(quantity),
      });
    } catch (err) {
      console.error('[PI MemberTicket] Failed to update attendeeCount:', err);
    }

    await createTransaction({
      type: 'income',
      category: 'Events',
      amount: amountCents,
      description: `Event ticket — ${ticketType || 'member'}`,
      date: new Date().toISOString(),
      createdBy: 'stripe',
      createdAt: new Date().toISOString(),
      paymentMethod: 'stripe',
      relatedMemberId: memberId,
      stripeSessionId: pi.id,
      eventId,
      quantity,
    });

    // Send confirmation email
    if (receiptEmail) {
      let tierLabel: string | undefined;
      if (tierId) {
        const eventDoc = await adminDb.collection('events').doc(eventId).get();
        const tier = eventDoc.data()?.pricing?.tiers?.find((t: any) => t.id === tierId);
        tierLabel = tier?.label;
      }
      await sendTicketConfirmationEmail('Member', receiptEmail, eventId, amountCents, tierLabel, quantity);
    }
  }

  // Guest event ticket via PaymentIntent
  if (type === 'guest_event_ticket' && eventId) {
    const email = (guestEmail || receiptEmail || '').toLowerCase();

    let tierLabel: string | undefined;
    if (tierId) {
      const eventDoc = await adminDb.collection('events').doc(eventId).get();
      const tier = eventDoc.data()?.pricing?.tiers?.find((t: any) => t.id === tierId);
      tierLabel = tier?.label;
    }

    const existingSnap = await adminDb
      .collection('guest_rsvps')
      .where('eventId', '==', eventId)
      .where('email', '==', email)
      .limit(1)
      .get();

    let piSkipSideEffects = false;
    if (existingSnap.empty) {
      await adminDb.collection('guest_rsvps').add({
        eventId,
        name: guestName || 'Guest',
        email,
        phone: guestPhone || null,
        status: 'going',
        ticketType: 'guest',
        tierId: tierId || null,
        tierLabel: tierLabel || null,
        quantity,
        paidAmount: amountCents,
        paymentStatus: 'paid',
        stripeSessionId: pi.id,
        stripeSessionIds: [pi.id],
        createdAt: new Date().toISOString(),
      });
    } else {
      const existingDoc = existingSnap.docs[0];
      const existingData = existingDoc.data() as any;
      const seenSessions: string[] = Array.isArray(existingData.stripeSessionIds)
        ? existingData.stripeSessionIds
        : existingData.stripeSessionId
          ? [existingData.stripeSessionId]
          : [];
      if (seenSessions.includes(pi.id)) {
        console.log('[PI GuestTicket] Duplicate PaymentIntent; skipping side effects', pi.id);
        piSkipSideEffects = true;
      } else {
        await adminDb.collection('guest_rsvps').doc(existingDoc.id).update({
          status: 'going',
          tierId: tierId || existingData.tierId || null,
          tierLabel: tierLabel || existingData.tierLabel || null,
          quantity: FieldValue.increment(quantity),
          paidAmount: FieldValue.increment(amountCents),
          paymentStatus: 'paid',
          stripeSessionId: pi.id,
          stripeSessionIds: FieldValue.arrayUnion(pi.id),
        });
      }
    }

    if (piSkipSideEffects) return;

    if (tierId) await adjustTierSoldCount(eventId, tierId, quantity);

    // Increment attendeeCount on the event document
    try {
      await adminDb.collection('events').doc(eventId).update({
        attendeeCount: FieldValue.increment(quantity),
      });
    } catch (err) {
      console.error('[PI GuestTicket] Failed to update attendeeCount:', err);
    }

    await createTransaction({
      type: 'income',
      category: 'Events',
      amount: amountCents,
      description: `Guest event ticket — ${guestName || 'Guest'}`,
      date: new Date().toISOString(),
      createdBy: 'stripe',
      createdAt: new Date().toISOString(),
      paymentMethod: 'stripe',
      stripeSessionId: pi.id,
      email: guestEmail || receiptEmail || undefined,
      eventId,
      quantity,
    });

    await sendTicketConfirmationEmail(
      guestName || 'Guest',
      email || '',
      eventId,
      amountCents,
      tierLabel,
      quantity,
    );
  }

  // Donation via PaymentIntent
  if (type === 'donation') {
    const donorName =
      pi.metadata?.donorName ||
      guestName ||
      'Donor';
    const rawEmail =
      pi.metadata?.donorEmail ||
      receiptEmail ||
      '';
    const donorEmail = typeof rawEmail === 'string' && rawEmail.includes('@')
      ? rawEmail.toLowerCase()
      : '';

    if (donorEmail) {
      try {
        await upsertDonorRecord({
          name: donorName,
          email: donorEmail,
          amountCents,
          stripeSessionId: pi.id,
        });
      } catch (err) {
        console.error('Failed to upsert donor record (PI):', err);
      }
    }

    await createTransaction({
      type: 'income',
      category: 'Donations',
      amount: amountCents,
      description: `Donation — $${(amountCents / 100).toFixed(2)}`,
      date: new Date().toISOString(),
      createdBy: 'stripe',
      createdAt: new Date().toISOString(),
      paymentMethod: 'stripe',
      stripeSessionId: pi.id,
      email: donorEmail || undefined,
      status: 'completed',
    });

    try {
      await logAuditEvent(
        'donation.created',
        'stripe',
        donorName,
        {
          targetType: 'donation',
          details: { amountCents, donorEmail: donorEmail || 'unknown', stripeSessionId: pi.id },
        },
      );
    } catch (err) {
      console.error('Failed to write donation audit log (PI):', err);
    }

    if (donorEmail) {
      try {
        const content = donationThankYouEmail(donorName, amountCents);
        await sendEmail({ to: donorEmail, subject: content.subject, html: content.html, text: content.text });
      } catch (err) {
        console.error('Failed to send donation thank-you email (PI):', err);
      }
    }
  }
}

/**
 * P0 #1 + P2 #15: Handle charge refunded with full member RSVP support.
 * - Full refund → cancel RSVP (both members AND guests)
 * - Partial refund → only record refund amount, keep RSVP active
 * - Decrement tier sold count for full refunds
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const sessionId = charge.metadata?.checkout_session_id || charge.payment_intent as string;
  if (!sessionId) {
    console.error('[Refund] No session or payment intent ID on charge:', charge.id);
    return;
  }

  // P2 #15: Determine if fully refunded
  const isFullyRefunded = charge.amount_refunded >= charge.amount;

  // Update transaction status
  const txnSnap = await adminDb
    .collection('transactions')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();

  if (!txnSnap.empty) {
    await adminDb.collection('transactions').doc(txnSnap.docs[0].id).update({
      status: isFullyRefunded ? 'refunded' : 'partial_refund',
      refundedAt: new Date().toISOString(),
      refundAmount: charge.amount_refunded,
    });
  }

  // P0 #1: Update GUEST RSVP status if fully refunded
  const guestSnap = await adminDb
    .collection('guest_rsvps')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();

  if (!guestSnap.empty && isFullyRefunded) {
    await adminDb.collection('guest_rsvps').doc(guestSnap.docs[0].id).update({
      status: 'cancelled',
      paymentStatus: 'refunded',
      refundedAt: new Date().toISOString(),
    });

    // Decrement tier sold count and attendeeCount
    const guest = guestSnap.docs[0].data()!;
    if (guest.tierId && guest.eventId) {
      try {
        await adjustTierSoldCount(guest.eventId, guest.tierId, -(guest.quantity || 1));
      } catch (err) {
        console.error('[Refund] Failed to adjust tier count for guest:', err);
      }
    }
    if (guest.eventId) {
      try {
        await adminDb.collection('events').doc(guest.eventId).update({
          attendeeCount: FieldValue.increment(-(guest.quantity || 1)),
        });
      } catch (err) {
        console.error('[Refund] Failed to decrement attendeeCount for guest:', err);
      }
    }
  } else if (!guestSnap.empty && !isFullyRefunded) {
    // P2 #15: Partial refund - record but don't change RSVP status
    await adminDb.collection('guest_rsvps').doc(guestSnap.docs[0].id).update({
      refundedAt: new Date().toISOString(),
      refundAmount: charge.amount_refunded,
      partialRefund: true,
    });
  }

  // P0 #1: NEW — Update MEMBER RSVP status if fully refunded
  const memberSnap = await adminDb
    .collection('rsvps')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();

  if (!memberSnap.empty && isFullyRefunded) {
    const rsvp = memberSnap.docs[0].data()!;
    await adminDb.collection('rsvps').doc(memberSnap.docs[0].id).update({
      status: 'not_going',
      refundedAt: new Date().toISOString(),
      paymentStatus: 'refunded',
    });

    // Decrement tier sold count and attendeeCount for member refund
    if (rsvp.tierId && rsvp.eventId) {
      try {
        await adjustTierSoldCount(rsvp.eventId, rsvp.tierId, -(rsvp.quantity || 1));
      } catch (err) {
        console.error('[Refund] Failed to adjust tier count for member:', err);
      }
    }
    if (rsvp.eventId) {
      try {
        await adminDb.collection('events').doc(rsvp.eventId).update({
          attendeeCount: FieldValue.increment(-(rsvp.quantity || 1)),
        });
      } catch (err) {
        console.error('[Refund] Failed to decrement attendeeCount for member:', err);
      }
    }
  } else if (!memberSnap.empty && !isFullyRefunded) {
    // P2 #15: Partial refund for member - record but keep RSVP active
    await adminDb.collection('rsvps').doc(memberSnap.docs[0].id).update({
      refundedAt: new Date().toISOString(),
      refundAmount: charge.amount_refunded,
      partialRefund: true,
    });
  }

  console.log('[Refund] Processed refund for charge:', charge.id, 'fullyRefunded:', isFullyRefunded);
}

/**
 * P2 #16: Handle payment failed — clean up pre-created RSVPs.
 */
export async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  console.error('[PaymentFailed] Payment failed:', intent.id, intent.last_payment_error?.message);

  // Look up any pre-created guest RSVPs tied to this payment intent
  const guestSnap = await adminDb
    .collection('guest_rsvps')
    .where('stripeSessionId', '==', intent.id)
    .limit(1)
    .get();

  if (!guestSnap.empty) {
    const guest = guestSnap.docs[0].data()!;
    // If the RSVP was pre-created with 'pending' payment status, clean it up
    if (guest.paymentStatus === 'pending') {
      await adminDb.collection('guest_rsvps').doc(guestSnap.docs[0].id).update({
        status: 'payment_failed',
        paymentStatus: 'failed',
        failedAt: new Date().toISOString(),
        lastError: intent.last_payment_error?.message || 'Payment failed',
      });
      console.log('[PaymentFailed] Marked pre-created guest RSVP as payment_failed:', guestSnap.docs[0].id);
    }
  }

  // Also check member RSVPs with pending payment
  const memberSnap = await adminDb
    .collection('rsvps')
    .where('stripeSessionId', '==', intent.id)
    .limit(1)
    .get();

  if (!memberSnap.empty) {
    const rsvp = memberSnap.docs[0].data()!;
    if (rsvp.paymentStatus === 'pending') {
      await adminDb.collection('rsvps').doc(memberSnap.docs[0].id).update({
        status: 'payment_failed',
        paymentStatus: 'failed',
        failedAt: new Date().toISOString(),
        lastError: intent.last_payment_error?.message || 'Payment failed',
      });
      console.log('[PaymentFailed] Marked member RSVP as payment_failed:', memberSnap.docs[0].id);
    }
  }
}

/**
 * P0 #5: Handle expired checkout sessions — clean up pre-created RSVPs.
 */
export async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  console.log('[CheckoutExpired] Session expired:', session.id, {
    email: session.customer_email,
    metadata: session.metadata,
    amountTotal: session.amount_total,
  });

  if (!session.metadata) return;

  const { eventId, guestEmail, memberId, type } = session.metadata;

  // Clean up pre-created guest RSVPs that were created via /api/events/checkout free flow
  if (guestEmail && eventId) {
    const guestSnap = await adminDb
      .collection('guest_rsvps')
      .where('eventId', '==', eventId)
      .where('email', '==', guestEmail.toLowerCase())
      .where('paymentStatus', '==', 'pending')
      .limit(1)
      .get();

    if (!guestSnap.empty) {
      await adminDb.collection('guest_rsvps').doc(guestSnap.docs[0].id).update({
        status: 'expired',
        paymentStatus: 'expired',
        expiredAt: new Date().toISOString(),
      });
      console.log('[CheckoutExpired] Cleaned up expired guest RSVP:', guestSnap.docs[0].id);
    }
  }

  // Clean up member RSVPs with pending payment status
  if (memberId && eventId) {
    const memberSnap = await adminDb
      .collection('rsvps')
      .doc(`${memberId}_${eventId}`)
      .get();

    if (memberSnap.exists && memberSnap.data()?.paymentStatus === 'pending') {
      await adminDb.collection('rsvps').doc(`${memberId}_${eventId}`).update({
        status: 'expired',
        paymentStatus: 'expired',
        expiredAt: new Date().toISOString(),
      });
      console.log('[CheckoutExpired] Cleaned up expired member RSVP for:', memberId);
    }
  }

  // Release any atomically reserved tier spots so the capacity is accurate
  const tierId = session.metadata?.tierId;
  const qty = parseInt(session.metadata?.quantity || '1', 10);
  if (tierId && eventId) {
    await releaseTierSpot(eventId, tierId, qty).catch((err) =>
      console.error('[CheckoutExpired] Failed to release tier spot:', err),
    );
    console.log('[CheckoutExpired] Released', qty, 'spot(s) for tier', tierId, 'on event', eventId);
  }
}

// ── Main webhook event router ────────────────────────────────────────────

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // Idempotency: skip if this Stripe event ID was already processed
  if (await markEventProcessed(event.id)) {
    console.log('[Webhook] Already processed event:', event.id);
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      // Unhandled event type — log for awareness
      console.log('[Webhook] Unhandled event type:', event.type);
  }
}