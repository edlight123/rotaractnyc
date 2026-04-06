/**
 * Stripe webhook event handlers.
 */
import type Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { recordDuesPayment } from '@/lib/services/dues';
import { upsertRSVP } from '@/lib/services/events';
import { createTransaction } from '@/lib/services/finance';

/**
 * 5.1 — Idempotency: check if we already processed this Stripe session.
 */
async function isAlreadyProcessed(sessionId: string): Promise<boolean> {
  const snap = await adminDb
    .collection('transactions')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();
  return !snap.empty;
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // 5.1 — Idempotency guard
  if (await isAlreadyProcessed(session.id)) {
    console.log('Webhook already processed for session:', session.id);
    return;
  }

  // 5.5 — Handle missing metadata
  if (!session.metadata) {
    console.error('Missing metadata on checkout session:', session.id);
    return;
  }

  const { type, memberId, memberType, cycleId, cycleName, eventId, ticketType } = session.metadata;

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
      stripeSessionId: session.id,
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
      stripeSessionId: session.id,
    });
  }

  // 5.6 — Track donations in Firestore
  if (type === 'donation') {
    await createTransaction({
      type: 'income',
      category: 'Donations',
      amount: (session.amount_total || 0) / 100,
      description: `Donation — $${((session.amount_total || 0) / 100).toFixed(2)}`,
      date: new Date().toISOString(),
      createdBy: 'stripe',
      createdAt: new Date().toISOString(),
      paymentMethod: 'stripe',
      stripeSessionId: session.id,
      email: session.customer_email || undefined,
      status: 'completed',
    });
  }
}

export async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  console.error('Payment failed:', intent.id, intent.last_payment_error?.message);
  // Could send notification email here
}

/**
 * 5.7 — Handle expired checkout sessions for analytics.
 */
export async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  console.log('Checkout session expired:', session.id, {
    email: session.customer_email,
    metadata: session.metadata,
    amountTotal: session.amount_total,
  });
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    default:
      // Unhandled event type
      break;
  }
}
