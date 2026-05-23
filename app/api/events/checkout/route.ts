import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getStripe } from '@/lib/stripe/client';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { adminDb } from '@/lib/firebase/admin';
import { isValidEmail } from '@/lib/utils/sanitize';
import { sendEmail } from '@/lib/email/send';
import { guestTicketConfirmationEmail } from '@/lib/email/templates';
import { generateTicketQRCodeUrls } from '@/lib/utils/qrcode';
import { incrementTierSoldCount, tryReserveTierSpot, decrementTierSoldCount } from '@/lib/services/tierTracking';

export const dynamic = 'force-dynamic';

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://rotaractnyc.org';

export async function POST(request: NextRequest) {
  // Rate limit: 5 checkout attempts per 60s per IP
  const rlKey = getRateLimitKey(request, 'guest-checkout');
  const rl = await rateLimit(rlKey, { max: 5, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const {
      eventId,
      name,
      email,
      phone,
      tierId,
      embedded = false,
      quantity: rawQuantity = 1,
      promoCode,
      customFields,
    } = await request.json();
    const quantity = Math.max(1, Math.min(10, parseInt(String(rawQuantity), 10) || 1));

    // Validate required inputs
    if (!eventId || !name || !email) {
      return NextResponse.json(
        { error: 'Event ID, name, and email are required.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    // Fetch event from Firestore
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const event = eventDoc.data()!;

    const isPublished =
      typeof event.status === 'string'
        ? event.status === 'published'
        : Boolean(event.published);
    const isPublic =
      typeof event.isPublic === 'boolean'
        ? event.isPublic
        : event.visibility === 'public';

    // Verify event is published and public
    if (!isPublished || !isPublic) {
      return NextResponse.json(
        { error: 'This event is not available for public registration.' },
        { status: 403 },
      );
    }

    // P0 #3: Check event-level capacity before allowing checkout.
    // This is a non-authoritative pre-check — the real atomic guard happens
    // inside tryReserveTierSpot for tier-capacity events. For events that
    // use event-level capacity without tiers, this is best-effort.
    // A production hardening would move this into an atomic counter on
    // the event doc itself.
    if (event.capacity) {
      // Sum *tickets* (RSVP.quantity) rather than counting docs — a single
      // member can hold multi-ticket RSVPs, so a doc-count under-reports
      // demand and would let an event over-sell its capacity.
      const [memberRsvpSnap, guestRsvpSnap] = await Promise.all([
        adminDb.collection('rsvps').where('eventId', '==', eventId).where('status', '==', 'going').get(),
        adminDb.collection('guest_rsvps').where('eventId', '==', eventId).where('status', '==', 'going').get(),
      ]);
      const sumQty = (snap: FirebaseFirestore.QuerySnapshot) =>
        snap.docs.reduce((s, d) => s + (d.data().quantity || 1), 0);
      const totalGoing = sumQty(memberRsvpSnap) + sumQty(guestRsvpSnap);
      if (totalGoing + quantity > event.capacity) {
        return NextResponse.json(
          { error: 'This event does not have enough remaining capacity for the requested quantity.' },
          { status: 409 },
        );
      }
    }

    // Support current pricing schema (`event.pricing`) plus legacy flat fields.
    const pricing =
      event.pricing ||
      ((event.memberPrice != null || event.guestPrice != null || event.earlyBirdPrice != null)
        ? {
            memberPrice: Number(event.memberPrice || 0),
            guestPrice: Number(event.guestPrice || 0),
            earlyBirdPrice: event.earlyBirdPrice != null ? Number(event.earlyBirdPrice) : undefined,
            earlyBirdDeadline: event.earlyBirdDeadline || undefined,
          }
        : null);

    if (!pricing) {
      return NextResponse.json(
        { error: 'This event is a free RSVP event. No payment is required.' },
        { status: 400 },
      );
    }

    // ── Promo code validation ──
    let discountPercent = 0;
    let discountCode: string | null = null;
    let promoDocRef: FirebaseFirestore.DocumentReference | null = null;

    if (promoCode) {
      const promoSnap = await adminDb
        .collection('promo_codes')
        .where('code', '==', promoCode.toUpperCase().trim())
        .where('active', '==', true)
        .limit(1)
        .get();

      if (promoSnap.empty) {
        return NextResponse.json({ error: 'Invalid or expired promo code.' }, { status: 400 });
      }

      const promo = promoSnap.docs[0].data()!;
      const promoNow = new Date();

      // Check validity window
      if (promo.validFrom && new Date(promo.validFrom) > promoNow) {
        return NextResponse.json({ error: 'This promo code is not yet active.' }, { status: 400 });
      }
      if (promo.validUntil && new Date(promo.validUntil) < promoNow) {
        return NextResponse.json({ error: 'This promo code has expired.' }, { status: 400 });
      }
      // Check usage limit
      if (promo.maxUses && (promo.usedCount ?? 0) >= promo.maxUses) {
        return NextResponse.json({ error: 'This promo code has reached its usage limit.' }, { status: 400 });
      }
      // Check event-specific restriction
      if (promo.eventId && promo.eventId !== eventId) {
        return NextResponse.json({ error: 'This promo code is not valid for this event.' }, { status: 400 });
      }

      discountPercent = promo.discountPercent ?? 0;
      discountCode = promo.code;
      promoDocRef = promoSnap.docs[0].ref;
      // Increment after successful Stripe session creation (prevents leaked usage on failure)
    }

    // (promoDocRef set above if promo was applied)

    // Determine price: check tiers first, then early bird, then guestPrice
    let priceCents: number;
    let resolvedTierId: string | undefined;
    let tierLabel = 'Guest';
    const now = new Date();

    if (pricing.tiers?.length) {
      // Find the best available tier (non-atomic pre-filter for UX, real
      // reservation happens atomically via tryReserveTierSpot below).
      let tier = tierId
        ? pricing.tiers.find((t: any) => t.id === tierId)
        : undefined;
      if (!tier) {
        tier = pricing.tiers
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
      if (tier.deadline && new Date(tier.deadline) < now) {
        return NextResponse.json({ error: `The "${tier.label}" tier has expired.` }, { status: 409 });
      }

      // 🔒 Atomic reservation — prevents oversell race condition
      if (tier.capacity != null) {
        const reserved = await tryReserveTierSpot(eventId, tier.id, tier.capacity, quantity);
        if (!reserved) {
          return NextResponse.json(
            { error: `The "${tier.label}" tier sold out while you were checking out.` },
            { status: 409 },
          );
        }
      }

      priceCents = tier.guestPrice;
      tierLabel = tier.label;
      resolvedTierId = tier.id;
    } else if (
      pricing.earlyBirdPrice != null &&
      pricing.earlyBirdDeadline &&
      now < new Date(pricing.earlyBirdDeadline)
    ) {
      priceCents = Number(pricing.earlyBirdPrice);
    } else {
      priceCents = Number(pricing.guestPrice || 0);
    }

    // Apply promo discount
    let finalPriceCents = priceCents;
    if (discountPercent > 0) {
      const discountMultiplier = (100 - discountPercent) / 100;
      finalPriceCents = Math.round(priceCents * discountMultiplier);
    }

    // Validate custom fields against event registration questions schema
    if (customFields && event.registrationQuestions?.length) {
      const requiredMissing = event.registrationQuestions
        .filter((q: any) => q.required)
        .some((q: any) => !customFields[q.id]);
      if (requiredMissing) {
        return NextResponse.json({ error: 'Please fill in all required registration fields.' }, { status: 400 });
      }
    }

    // Free event: create RSVP directly
    if (finalPriceCents === 0) {
      const actualQuantity = quantity || 1;
      const now = new Date().toISOString();

      // Create ONE guest_rsvp doc that represents the whole order (quantity
      // captures how many tickets were claimed). Previously we created N
      // duplicate docs each carrying quantity=N, which inflated ticket counts
      // by N² in the purchasers panel and made check-in confusing.
      await adminDb.collection('guest_rsvps').add({
        eventId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        status: 'going',
        ticketType: 'guest',
        tierId: resolvedTierId || null,
        paidAmount: 0,
        paymentStatus: 'free',
        promoCode: discountCode,
        discountPercent,
        customFields: customFields || null,
        quantity: actualQuantity,
        createdAt: now,
      });

      // Track tier capacity (for free tiers without atomic reservation)
      if (resolvedTierId && !pricing.tiers?.find((t: any) => t.id === resolvedTierId)?.capacity) {
        await incrementTierSoldCount(eventId, resolvedTierId, actualQuantity);
      }

      // Increment attendeeCount on the event document
      try {
        await adminDb.collection('events').doc(eventId).update({
          attendeeCount: FieldValue.increment(actualQuantity),
        });
      } catch (err) {
        console.error('[FreeCheckout] Failed to update attendeeCount:', err);
      }

      // Send confirmation email for free ticket
      try {
        let qrCodes: string[] | undefined;
        // Hosted PNG URLs render reliably across email clients (Gmail strips data: URIs).
        try { qrCodes = generateTicketQRCodeUrls(eventId, email, actualQuantity); } catch { /* best-effort */ }

        // Suppress the membership upsell when the buyer is already a member.
        let isMember = false;
        try {
          const memberSnap = await adminDb
            .collection('members')
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();
          isMember = !memberSnap.empty;
        } catch { /* default to non-member */ }

        const emailContent = guestTicketConfirmationEmail(name, {
          title: event.title || 'Event',
          date: event.date || '',
          time: event.time || '',
          location: event.location || '',
          slug: event.slug || eventId,
          quantity: actualQuantity,
        } as any, 0, qrCodes, { isMember });

        await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (emailErr) {
        console.error('Failed to send guest confirmation email:', emailErr);
      }

      return NextResponse.json({ free: true });
    }

    // Create Stripe checkout session for paid event
    const stripe = getStripe();

    const lineItemName = discountCode
      ? `${event.title} — ${tierLabel} Ticket (${discountPercent}% off)`
      : `${event.title} — ${tierLabel} Ticket`;

    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: lineItemName,
          },
          unit_amount: finalPriceCents,
        },
        quantity,
      },
    ];

    // If the Stripe session creation fails, release the reserved spot
    const spotReserved = resolvedTierId != null;

    const metadata: Record<string, string> = {
      type: 'guest_event_ticket',
      eventId,
      guestName: name,
      guestEmail: email,
      guestPhone: phone || '',
      ticketType: 'guest',
      tierId: resolvedTierId || '',
      quantity: String(quantity),
      amountCents: String(priceCents * quantity),
    };

    if (discountCode) metadata.promoCode = discountCode;
    if (discountPercent) metadata.discountPercent = String(discountPercent);
    if (customFields) metadata.customFields = JSON.stringify(customFields);

    try {
      if (embedded) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: priceCents * quantity,
          currency: 'usd',
          receipt_email: email,
          metadata,
        });
        if (promoDocRef) await promoDocRef.update({ usedCount: FieldValue.increment(1) });
        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: email,
        line_items: lineItems,
        success_url: `${SITE_URL}/events/${event.slug || eventId}?rsvp=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE_URL}/events/${event.slug || eventId}?rsvp=cancelled`,
        metadata,
      });

      if (promoDocRef) await promoDocRef.update({ usedCount: FieldValue.increment(1) });
      return NextResponse.json({ url: session.url });
    } catch (stripeError: any) {
      // Release the reserved spot if Stripe session creation fails
      if (spotReserved && resolvedTierId) {
        await decrementTierSoldCount(eventId, resolvedTierId).catch(() => {});
      }
      throw stripeError;
    }
  } catch (error: any) {
    console.error('Guest event checkout error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed. Please try again later.' },
      { status: 500 },
    );
  }
}
