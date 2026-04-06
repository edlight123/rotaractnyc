import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/donate/verify?session_id=cs_xxx
 *
 * Verifies a Stripe Checkout Session after redirect, ensuring the donation
 * was actually completed (prevents spoofed `success` query params).
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ verified: false, error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const verified =
      session.payment_status === 'paid' && session.status === 'complete';

    return NextResponse.json({ verified, status: session.payment_status });
  } catch (error: any) {
    console.error('Donate verify error:', error.message);
    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 500 });
  }
}
