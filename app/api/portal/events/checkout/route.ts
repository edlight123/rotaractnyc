import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { eventHasEnded } from '@/lib/utils/eventTime';
import { cookies } from 'next/headers';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { tryReserveTierSpot, releaseTierSpot } from '@/lib/services/tierTracking';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://rotaractnyc.org';

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-events'), { max: 10, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment processing is not configured.' },
        { status: 503 },
      );
    }

    // Authenticate member
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;

    let uid: string | null = null;
    let isMember = false;

    if (sessionCookie) {
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        uid = decoded.uid;
        isMember = true;
      } catch {
        // Invalid session — treat as guest
      }
    }

    const body = await request.json();
    const { eventId, ticketType, tierId, promoCode, paymentMethod = 'stripe', proofUrl, embedded = false, quantity: rawQuantity = 1 } = body;
    const quantity = Math.max(1, Math.min(10, parseInt(String(rawQuantity), 10) || 1));

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Fetch event from Firestore
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventDoc.data()!;

    // Ticket sales / registration close once the event has ended.
    if (eventHasEnded(event as { date?: string; endDate?: string })) {
      return NextResponse.json({ error: 'This event has ended — registration is closed.' }, { status: 410 });
    }

    // ── P0-1: Capacity check ──
    // Sum *tickets* (RSVP.quantity) rather than counting RSVP docs — a single
    // member can hold multi-ticket RSVPs, so a doc-count under-reports demand
    // and would let an event over-sell its capacity. Guest tickets are
    // tracked in guest_rsvps; include them too.
    if (event.capacity) {
      const [memberSnap, guestSnap] = await Promise.all([
        adminDb.collection('rsvps')
          .where('eventId', '==', eventId)
          .where('status', '==', 'going')
          .get(),
        adminDb.collection('guest_rsvps')
          .where('eventId', '==', eventId)
          .where('status', '==', 'going')
          .get(),
      ]);
      const sumQty = (snap: FirebaseFirestore.QuerySnapshot) =>
        snap.docs.reduce((s, d) => s + (d.data().quantity || 1), 0);
      const currentGoing = sumQty(memberSnap) + sumQty(guestSnap);
      if (currentGoing + quantity > event.capacity) {
        return NextResponse.json({ error: 'This event is sold out. No tickets remaining.' }, { status: 409 });
      }
    }

    if (!event.pricing) {
      return NextResponse.json({ error: 'This is a free event — no payment required.' }, { status: 400 });
    }

    // Determine price
    const now = new Date();
    let priceCents: number;
    let priceLabel: string;
    let resolvedTierId: string | undefined;

    // ── Tier-based pricing (takes precedence) ──
    if (event.pricing.tiers?.length) {
      let tier = tierId
        ? event.pricing.tiers.find((t: any) => t.id === tierId)
        : undefined;

      if (!tier) {
        // Pick the first available tier
        tier = event.pricing.tiers
          .filter((t: any) => {
            if (t.deadline && new Date(t.deadline) < now) return false;
            if (t.capacity != null && (t.soldCount ?? 0) >= t.capacity) return false;
            return true;
          })
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
      }

      if (!tier) {
        return NextResponse.json({ error: 'All ticket tiers are sold out or expired.' }, { status: 409 });
      }

      // Check tier availability
      if (tier.deadline && new Date(tier.deadline) < now) {
        return NextResponse.json({ error: `The "${tier.label}" tier has expired.` }, { status: 409 });
      }
      if (tier.capacity != null && (tier.soldCount ?? 0) + quantity > tier.capacity) {
        return NextResponse.json({ error: `Not enough remaining capacity in "${tier.label}" tier for quantity ${quantity}.` }, { status: 409 });
      }

      // Respect min/max quantity per tier if defined
      if (tier.minQuantity && quantity < tier.minQuantity) {
        return NextResponse.json({ error: `The "${tier.label}" tier requires a minimum of ${tier.minQuantity} tickets.` }, { status: 400 });
      }
      if (tier.maxQuantity && quantity > tier.maxQuantity) {
        return NextResponse.json({ error: `The "${tier.label}" tier allows a maximum of ${tier.maxQuantity} tickets.` }, { status: 400 });
      }

      priceCents = isMember && ticketType !== 'guest' ? tier.memberPrice : tier.guestPrice;
      priceLabel = tier.label;
      resolvedTierId = tier.id;
    } else {
      // ── Legacy flat pricing ──
      const earlyBirdActive =
        event.pricing.earlyBirdPrice != null &&
        event.pricing.earlyBirdDeadline &&
        new Date(event.pricing.earlyBirdDeadline) > now;

      if (earlyBirdActive) {
        priceCents = event.pricing.earlyBirdPrice;
        priceLabel = 'Early Bird';
      } else if (isMember && ticketType !== 'guest') {
        priceCents = event.pricing.memberPrice;
        priceLabel = 'Member';
      } else {
        priceCents = event.pricing.guestPrice;
        priceLabel = 'Guest';
      }
    }

    // ── P0-2: Tier atomic reservation ──
    let tierReservationId: string | null = null;
    if (resolvedTierId) {
      const tier = event.pricing.tiers?.find((t: any) => t.id === resolvedTierId);
      if (tier?.capacity != null) {
        const reserved = await tryReserveTierSpot(eventId, resolvedTierId, tier.capacity, quantity);
        if (!reserved) {
          return NextResponse.json({ error: `The "${tier.label}" tier just sold out. Please try another tier.` }, { status: 409 });
        }
        tierReservationId = resolvedTierId;
      }
    }

    // If price is 0 (free for members), just RSVP directly
    if (priceCents === 0) {
      if (!uid) {
        if (tierReservationId) await releaseTierSpot(eventId, tierReservationId, quantity);
        return NextResponse.json({ error: 'You must be logged in to claim a free member ticket.' }, { status: 401 });
      }
      const rsvpRef = adminDb.collection('rsvps').doc(`${uid}_${eventId}`);
      const existingFreeSnap = await rsvpRef.get();
      const existingFree = existingFreeSnap.exists ? (existingFreeSnap.data() as any) : null;
      const isAdditiveFree = !!existingFree && existingFree.status === 'going';
      await rsvpRef.set(
        {
          memberId: uid,
          eventId,
          status: 'going',
          ticketType: priceLabel.toLowerCase(),
          tierId: resolvedTierId || null,
          // For additional free claims, increment quantity rather than overwrite
          ...(isAdditiveFree
            ? { quantity: FieldValue.increment(quantity) }
            : { quantity, paidAmount: 0 }),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return NextResponse.json({ free: true, message: 'Free ticket — you\'re in!' });
    }

    // ── P0-5: Require authentication for paid tickets ──
    if (!uid) {
      if (tierReservationId) {
        await releaseTierSpot(eventId, tierReservationId, quantity);
      }
      return NextResponse.json({ error: 'You must be logged in to purchase tickets.' }, { status: 401 });
    }

    // Handle offline payment methods
    if (paymentMethod !== 'stripe') {
      // Create pending offline payment record (one row per submission so the
      // treasurer sees each pending payment separately when a member buys
      // additional tickets after a previous purchase).
      const offlinePaymentRef = adminDb.collection('offlinePayments').doc();
      await offlinePaymentRef.set({
        type: 'event',
        relatedId: eventId,
        relatedName: event.title,
        memberId: uid,
        memberName: null,
        memberEmail: null,
        amount: priceCents * quantity,
        quantity,
        method: paymentMethod,
        tierId: resolvedTierId || null,
        tierReservationId: tierReservationId,
        status: 'pending',
        proofUrl: proofUrl || null,
        submittedAt: new Date().toISOString(),
        confirmedAt: null,
        confirmedBy: null,
      });

      const rsvpRef = adminDb.collection('rsvps').doc(`${uid}_${eventId}`);
      const existingOfflineSnap = await rsvpRef.get();
      const existingOffline = existingOfflineSnap.exists ? (existingOfflineSnap.data() as any) : null;
      const isAdditiveOffline = !!existingOffline && existingOffline.status === 'going';
      await rsvpRef.set(
        {
          memberId: uid,
          eventId,
          status: 'going',
          ticketType: priceLabel.toLowerCase(),
          tierId: resolvedTierId || null,
          // Additional purchases: increment quantity, leave paidAmount alone
          // (it'll be incremented when the treasurer confirms each offline
          // payment separately). Don't downgrade an already-paid RSVP back
          // to pending_offline.
          ...(isAdditiveOffline
            ? {
                quantity: FieldValue.increment(quantity),
                ...(existingOffline.paymentStatus !== 'paid'
                  ? { paymentStatus: 'pending_offline' }
                  : {}),
              }
            : {
                quantity,
                paidAmount: 0,
                paymentStatus: 'pending_offline',
              }),
          paymentMethod: paymentMethod,
          offlinePaymentId: offlinePaymentRef.id,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return NextResponse.json({
        success: true,
        message: `Offline payment (${paymentMethod}) pending confirmation.`,
        offlinePaymentId: offlinePaymentRef.id,
      });
    }

    // ── P2-22: Validate promo code for member checkout ──
    let finalPriceCents = priceCents;
    let promoApplied = false;
    let promoUsedId: string | null = null;
    if (promoCode) {
      const promosSnapshot = await adminDb.collection('promoCodes')
        .where('code', '==', promoCode.trim().toUpperCase())
        .where('active', '==', true)
        .limit(1)
        .get();
      if (!promosSnapshot.empty) {
        const promo = promosSnapshot.docs[0].data() as any;
        const promoNow = new Date();
        if (promo.startsAt && new Date(promo.startsAt) > promoNow) {
          return NextResponse.json({ error: 'Promo code is not yet active.' }, { status: 400 });
        }
        if (promo.expiresAt && new Date(promo.expiresAt) < promoNow) {
          return NextResponse.json({ error: 'Promo code has expired.' }, { status: 400 });
        }
        if (promo.maxUses && (promo.usedCount ?? 0) >= promo.maxUses) {
          return NextResponse.json({ error: 'Promo code usage limit reached.' }, { status: 400 });
        }
        if (promo.eventIds?.length && !promo.eventIds.includes(eventId)) {
          return NextResponse.json({ error: 'Promo code is not valid for this event.' }, { status: 400 });
        }
        if (promo.type === 'percentage') {
          finalPriceCents = Math.round(priceCents * (1 - (promo.amount || 0) / 100));
        } else {
          finalPriceCents = Math.max(0, priceCents - (promo.amount || 0));
        }
        if (finalPriceCents < 50) finalPriceCents = 50; // Stripe minimum
        promoApplied = true;
        promoUsedId = promosSnapshot.docs[0].id;
        // Increment after successful Stripe session creation (prevents leaked usage on failure)
      }
    }

    // Hold a ref for post-Stripe increment
    const promoDocRef = promoUsedId
      ? adminDb.collection('promoCodes').doc(promoUsedId)
      : null;

    // Create Stripe checkout session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} — ${priceLabel} Ticket${promoApplied ? ' (Promo Applied)' : ''}`,
            description: `${event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''} · ${event.location || ''}`,
          },
          unit_amount: finalPriceCents,
        },
        quantity,
      },
    ];

    const metadata = {
      type: 'event_ticket',
      eventId,
      memberId: uid,
      ticketType: priceLabel.toLowerCase(),
      tierId: resolvedTierId || '',
      tierReservationId: tierReservationId || '',
      quantity: String(quantity),
      amountCents: String(finalPriceCents * quantity),
      originalAmountCents: String(priceCents * quantity),
      eventTitle: event.title,
      promoCode: promoApplied ? promoCode : '',
    };

    if (embedded) {
      let receiptEmail: string | undefined;
      try {
        const userRecord = await adminAuth.getUser(uid);
        receiptEmail = userRecord.email ?? undefined;
      } catch {
        // proceed without email
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalPriceCents * quantity,
        currency: 'usd',
        ...(receiptEmail ? { receipt_email: receiptEmail } : {}),
        metadata,
      });
      if (promoDocRef) await promoDocRef.update({ usedCount: FieldValue.increment(1) });
      return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${SITE_URL}/portal/events?ticket=success&event=${eventId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/portal/events?ticket=cancelled`,
      metadata,
    });

    if (promoDocRef) await promoDocRef.update({ usedCount: FieldValue.increment(1) });
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Event checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session.' },
      { status: 500 },
    );
  }
}
