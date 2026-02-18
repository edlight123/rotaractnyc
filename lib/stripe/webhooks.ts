/**
 * Stripe webhook event handlers.
 */
import type Stripe from 'stripe';
import { recordDuesPayment } from '@/lib/services/dues';
import { upsertRSVP } from '@/lib/services/events';
import { createTransaction } from '@/lib/services/finance';

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { type, memberId, memberType, cycleId, cycleName, eventId, ticketType, duesDocId } = session.metadata || {};

  if (type === 'dues' && memberId && memberType) {
    // cycleId is the canonical field; cycleName is kept for backward compat
    const resolvedCycleId = cycleId || cycleName || 'unknown';

    await recordDuesPayment({
      memberId,
      cycleId: resolvedCycleId,
      memberType: memberType as 'professional' | 'student',
      amount: session.amount_total || 0,
      status: 'PAID',
      stripePaymentId: session.payment_intent as string,
    });

    // Record as income transaction
    await createTransaction({
      type: 'income',
      category: 'Dues',
      amount: (session.amount_total || 0) / 100,
      description: `Dues payment — ${memberType} (${resolvedCycleId})`,
      date: new Date().toISOString(),
      createdBy: 'stripe',
      createdAt: new Date().toISOString(),
      paymentMethod: 'stripe',
      relatedMemberId: memberId,
    });
  }

  if ((type === 'event' || type === 'event_ticket') && eventId && memberId) {
    await upsertRSVP({
      eventId,
      memberId,
      memberName: session.customer_email || 'Member',
      status: 'going',
    });

    await createTransaction({
      type: 'income',
      category: 'Events',
      amount: (session.amount_total || 0) / 100,
      description: `Event ticket — ${ticketType || 'member'}`,
      date: new Date().toISOString(),
      createdBy: 'stripe',
      createdAt: new Date().toISOString(),
      paymentMethod: 'stripe',
      relatedMemberId: memberId,
    });
  }
}

export async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  console.error('Payment failed:', intent.id, intent.last_payment_error?.message);
  // Could send notification email here
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    default:
      // Unhandled event type
      break;
  }
}
