import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rotaractnyc.org';

const PRESET_AMOUNTS: Record<string, { cents: number; label: string }> = {
  '25': { cents: 2500, label: 'Supplies for a service day' },
  '50': { cents: 5000, label: 'Meals for 10 families' },
  '100': { cents: 10000, label: 'Full project sponsorship' },
};

export async function POST(request: NextRequest) {
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
      cents = Math.round(Number(customAmount) * 100);
      description = `Custom donation — $${Number(customAmount).toFixed(2)}`;
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
