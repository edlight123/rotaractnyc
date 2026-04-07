import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { adminDb } from '@/lib/firebase/admin';
import { isValidEmail } from '@/lib/utils/sanitize';
import { sendEmail } from '@/lib/email/send';
import { guestTicketConfirmationEmail } from '@/lib/email/templates';

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
    const { eventId, name, email, phone } = await request.json();

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

    // Verify event is published and public
    if (!event.published || event.visibility !== 'public') {
      return NextResponse.json(
        { error: 'This event is not available for public registration.' },
        { status: 403 },
      );
    }

    // Determine price: check early bird first, otherwise use guestPrice
    let priceCents: number;
    const now = new Date();
    if (
      event.earlyBirdPrice != null &&
      event.earlyBirdDeadline &&
      now < new Date(event.earlyBirdDeadline)
    ) {
      priceCents = Math.round(Number(event.earlyBirdPrice) * 100);
    } else {
      priceCents = Math.round(Number(event.guestPrice || 0) * 100);
    }

    // Free event: create RSVP directly
    if (priceCents === 0) {
      await adminDb.collection('guest_rsvps').add({
        eventId,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        status: 'going',
        ticketType: 'guest',
        paidAmount: 0,
        paymentStatus: 'free',
        createdAt: new Date().toISOString(),
      });

      // Send confirmation email for free ticket
      try {
        const emailContent = guestTicketConfirmationEmail(name, {
          title: event.title || 'Event',
          date: event.date || '',
          time: event.time || '',
          location: event.location || '',
          slug: event.slug || eventId,
        }, 0);

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title} — Guest Ticket`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/events/${event.slug || eventId}?rsvp=success`,
      cancel_url: `${SITE_URL}/events/${event.slug || eventId}?rsvp=cancelled`,
      metadata: {
        type: 'guest_event_ticket',
        eventId,
        guestName: name,
        guestEmail: email,
        guestPhone: phone || '',
        ticketType: 'guest',
        amountCents: String(priceCents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Guest event checkout error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed. Please try again later.' },
      { status: 500 },
    );
  }
}
