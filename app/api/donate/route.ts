import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
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
  const rl = rateLimit(rlKey, { max: 10, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { amount, customAmount } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment processing is not configured.' },
        { status: 503 },
      );
    }

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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Donation to Rotaract NYC',
              description,
            },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/donate?success=true`,
      cancel_url: `${SITE_URL}/donate?cancelled=true`,
      metadata: {
        type: 'donation',
        amountCents: String(cents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Donate checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session.' },
      { status: 500 },
    );
  }
}
