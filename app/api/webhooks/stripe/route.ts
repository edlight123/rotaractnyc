import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe/client';
import { markPaymentPaid } from '@/lib/firebase/payments';
import { markDuesPaid, getMemberById } from '@/lib/firebase/members';
import { sendConfirmationEmail } from '@/lib/email/sendOnboarding';
import { processDuesPayment } from '@/lib/firebase/duesCycles';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get the raw body as text
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = constructWebhookEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        console.log('PaymentIntent succeeded:', event.data.object.id);
        // Optional: additional handling for payment_intent.succeeded
        break;

      case 'payment_intent.payment_failed':
        console.error('PaymentIntent failed:', event.data.object.id);
        // Optional: notify admin or member of failed payment
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutSessionCompleted(session: any) {
  try {
    console.log('Processing checkout.session.completed:', session.id);

    const { memberId, email, type, cycleId } = session.metadata;

    if (!memberId || !email) {
      console.error('Missing metadata in session:', session.id);
      return;
    }

    // Handle annual dues payment
    if (type === 'ANNUAL_DUES') {
      if (!cycleId) {
        console.error('Missing cycleId for annual dues payment:', session.id);
        return;
      }

      await processDuesPayment(session.id, session.payment_intent);

      console.log('Processed annual dues payment for member:', memberId, 'cycle:', cycleId);
      return;
    }

    // Handle onboarding dues payment
    if (type === 'DUES') {
      // Mark payment as paid in Firestore
      const payment = await markPaymentPaid(
        session.id,
        session.payment_intent
      );

      if (!payment) {
        console.error('Payment record not found for session:', session.id);
        return;
      }

      await markDuesPaid(memberId, payment.id);
      console.log('Marked dues as paid for member:', memberId);

      // Get updated member info
      const member = await getMemberById(memberId);

      if (member && member.status === 'ACTIVE') {
        // Send confirmation email
        const emailResult = await sendConfirmationEmail({
          firstName: member.firstName,
          email: member.email,
          portalUrl: `${BASE_URL}/portal`,
        });

        if (!emailResult.success) {
          console.error('Failed to send confirmation email:', emailResult.error);
        } else {
          console.log('Sent confirmation email to:', member.email);
        }
      }
    }

    console.log('Successfully processed checkout session:', session.id);
  } catch (error: any) {
    console.error('Error handling checkout session completed:', error);
    // Don't throw - we don't want to return 500 to Stripe
    // Stripe will retry failed webhooks automatically
  }
}

/**
 * Disable body parsing for webhooks (we need raw body for signature verification)
 */
export const dynamic = 'force-dynamic';
