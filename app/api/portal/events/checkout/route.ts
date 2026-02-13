import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://rotaractnyc.org';

export async function POST(request: NextRequest) {
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
    const { eventId, ticketType } = body;

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

    // Check early bird
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
            paidAmount: 0,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }
      return NextResponse.json({ free: true, message: 'Free ticket — you\'re in!' });
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
