import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { incrementTierSoldCount } from '@/lib/services/tierTracking';

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
    const { eventId, ticketType, tierId, paymentMethod = 'stripe', proofUrl } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Fetch event from Firestore
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventDoc.data()!;

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
      if (tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity) {
        return NextResponse.json({ error: `The "${tier.label}" tier is sold out.` }, { status: 409 });
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

    // If price is 0 (free for members), just RSVP directly
    if (priceCents === 0) {
      if (uid) {
        const rsvpRef = adminDb.collection('rsvps').doc(`${uid}_${eventId}`);
        await rsvpRef.set(
          {
            memberId: uid,
            eventId,
            status: 'going',
            ticketType: priceLabel.toLowerCase(),
            tierId: resolvedTierId || null,
            paidAmount: 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        // Track tier capacity
        if (resolvedTierId) {
          await incrementTierSoldCount(eventId, resolvedTierId);
        }
      }
      return NextResponse.json({ free: true, message: 'Free ticket — you\'re in!' });
    }

    // Handle offline payment methods
    if (paymentMethod !== 'stripe') {
      // Create pending offline payment record
      const offlinePaymentRef = adminDb.collection('offlinePayments').doc();
      await offlinePaymentRef.set({
        type: 'event',
        relatedId: eventId,
        relatedName: event.title,
        memberId: uid || null,
        memberName: null,
        memberEmail: null,
        amount: priceCents,
        method: paymentMethod,
        tierId: resolvedTierId || null,
        status: 'pending',
        proofUrl: proofUrl || null,
        submittedAt: new Date().toISOString(),
        confirmedAt: null,
        confirmedBy: null,
      });

      // If authenticated, also mark RSVP as going (with pending payment status)
      if (uid) {
        const rsvpRef = adminDb.collection('rsvps').doc(`${uid}_${eventId}`);
        await rsvpRef.set(
          {
            memberId: uid,
            eventId,
            status: 'going',
            ticketType: priceLabel.toLowerCase(),
            tierId: resolvedTierId || null,
            paidAmount: 0,
            paymentStatus: 'pending_offline',
            paymentMethod: paymentMethod,
            offlinePaymentId: offlinePaymentRef.id,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        // Track tier capacity (reserved even while pending)
        if (resolvedTierId) {
          await incrementTierSoldCount(eventId, resolvedTierId);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Offline payment (${paymentMethod}) pending confirmation.`,
        offlinePaymentId: offlinePaymentRef.id,
      });
    }

    // Create Stripe checkout session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title} — ${priceLabel} Ticket`,
              description: `${event.date ? new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''} · ${event.location || ''}`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/portal/events?ticket=success&event=${eventId}`,
      cancel_url: `${SITE_URL}/portal/events?ticket=cancelled`,
      metadata: {
        type: 'event_ticket',
        eventId,
        memberId: uid || '',
        ticketType: priceLabel.toLowerCase(),
        tierId: resolvedTierId || '',
        amountCents: String(priceCents),
        eventTitle: event.title,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Event checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session.' },
      { status: 500 },
    );
  }
}
