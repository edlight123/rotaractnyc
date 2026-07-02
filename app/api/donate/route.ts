import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { eventDonationsClosed } from '@/lib/utils/eventTime';
import { getStripe } from '@/lib/stripe/client';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { clampNumber } from '@/lib/utils/sanitize';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rotaractnyc.org';

const MAX_DONATION_CENTS = 1_000_000; // $10,000 cap

const PRESET_AMOUNTS: Record<string, { cents: number; label: string }> = {
  '25': { cents: 2500, label: 'Supplies for a service day' },
  '50': { cents: 5000, label: 'Meals for 10 families' },
  '100': { cents: 10000, label: 'Full project sponsorship' },
};

export async function POST(request: NextRequest) {
  // Rate limit: 10 checkout attempts per 60 s per IP
  const rlKey = getRateLimitKey(request, 'donate');
  const rl = await rateLimit(rlKey, { max: 10, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const {
      amount,
      customAmount,
      embedded,
      donorName,
      donorEmail,
      idempotencyKey,
      eventId,
      eventTitle,
      eventSlug,
      message,
    } = await request.json();
    const useEmbeddedCheckout = embedded === true;

    // Optional donor message — capped at 500 chars; stripped of control chars
    const safeMessage =
      typeof message === 'string'
        ? message.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 500)
        : '';

    const safeDonorName = donorName || 'Anonymous';
    const safeDonorEmail = donorEmail || '';

    if (!safeDonorName || !safeDonorEmail) {
      return NextResponse.json(
        { error: 'Please provide your name and email.' },
        { status: 400 },
      );
    }

    // Optional: scope this donation to a specific event
    const safeEventId = typeof eventId === 'string' && eventId.length > 0 && eventId.length < 128
      ? eventId
      : '';

    // Event-linked donations close 2 weeks after the event ends. General
    // donations (no eventId) are always open.
    if (safeEventId) {
      const eventSnap = await adminDb.collection('events').doc(safeEventId).get();
      if (eventSnap.exists && eventDonationsClosed(eventSnap.data() as { date?: string; endDate?: string })) {
        return NextResponse.json(
          { error: 'Donations for this event have closed — you can still give anytime at rotaractnyc.org/donate.' },
          { status: 410 },
        );
      }
    }
    const safeEventTitle = typeof eventTitle === 'string' && eventTitle.length > 0
      ? eventTitle.slice(0, 200)
      : '';
    const safeEventSlug = typeof eventSlug === 'string' && eventSlug.length > 0
      ? eventSlug.slice(0, 200)
      : '';

    let cents: number;
    let description: string;

    if (amount && PRESET_AMOUNTS[amount]) {
      cents = PRESET_AMOUNTS[amount].cents;
      description = PRESET_AMOUNTS[amount].label;
    } else if (customAmount && Number(customAmount) >= 5) {
      cents = clampNumber(Math.round(Number(customAmount) * 100), 500, MAX_DONATION_CENTS);
      description = `Custom donation — $${(cents / 100).toFixed(2)}`;
    } else {
      return NextResponse.json(
        { error: 'Please select a donation amount (minimum $5).' },
        { status: 400 },
      );
    }

    const stripe = getStripe();

    const productName = safeEventTitle
      ? `Donation — ${safeEventTitle}`
      : 'Donation to Rotaract NYC';

    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description,
          },
          unit_amount: cents,
        },
        quantity: 1,
      },
    ];

    const metadata: Record<string, string> = {
      type: 'donation',
      amountCents: String(cents),
      donorName: safeDonorName,
      donorEmail: safeDonorEmail,
    };
    if (safeEventId) metadata.eventId = safeEventId;
    if (safeEventTitle) metadata.eventTitle = safeEventTitle;
    if (safeEventSlug) metadata.eventSlug = safeEventSlug;
    // Stripe metadata values are capped at 500 chars per key
    if (safeMessage) metadata.message = safeMessage;

    // 30-minute expiry for donation checkout sessions
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;

    // When tied to an event, redirect back to the event page on success/cancel.
    const successPath = safeEventSlug
      ? `/events/${encodeURIComponent(safeEventSlug)}?donation=success&session_id={CHECKOUT_SESSION_ID}`
      : `/donate?session_id={CHECKOUT_SESSION_ID}`;
    const cancelPath = safeEventSlug
      ? `/events/${encodeURIComponent(safeEventSlug)}?donation=cancelled`
      : `/donate?cancelled=true`;

    if (useEmbeddedCheckout) {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          ui_mode: 'embedded',
          line_items: lineItems,
          expires_at: expiresAt,
          return_url: `${SITE_URL}${successPath}`,
          metadata,
        },
        idempotencyKey
          ? { idempotencyKey: `donate_embedded_${idempotencyKey}` }
          : undefined,
      );

      return NextResponse.json({ clientSecret: session.client_secret });
    }

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: lineItems,
        expires_at: expiresAt,
        success_url: `${SITE_URL}${successPath}`,
        cancel_url: `${SITE_URL}${cancelPath}`,
        metadata,
      },
      idempotencyKey
        ? { idempotencyKey: `donate_redirect_${idempotencyKey}` }
        : undefined,
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Donate checkout error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed. Please try again later.' },
      { status: 500 },
    );
  }
}
