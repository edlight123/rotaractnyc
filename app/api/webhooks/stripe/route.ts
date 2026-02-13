import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !endpointSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // ── Event ticket payment ──
    if (metadata.type === 'event_ticket') {
      const { eventId, memberId, ticketType, amountCents, eventTitle } = metadata;
      try {
        if (memberId && eventId) {
          // Auto-RSVP as "going"
          const rsvpRef = adminDb.collection('rsvps').doc(`${memberId}_${eventId}`);
          await rsvpRef.set(
            {
              memberId,
              eventId,
              status: 'going',
              ticketType: ticketType || 'guest',
              paidAmount: Number(amountCents) || 0,
              stripePaymentId: session.payment_intent as string,
              paidAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          // Record transaction
          await adminDb.collection('transactions').add({
            type: 'income',
            category: 'Event Tickets',
            amount: Number(amountCents) || 0,
            description: `${ticketType} ticket – ${eventTitle || 'Event'}`,
            date: new Date().toISOString(),
            createdBy: memberId || 'guest',
            createdAt: new Date().toISOString(),
          });

          console.log(`Event ticket recorded: ${memberId} → ${eventId}`);
        }
      } catch (err) {
        console.error('Error recording event ticket payment:', err);
      }
    }

    // ── Dues payment ──
    const { memberId, cycleId, memberType, amount } = metadata;

    if (memberId && cycleId) {
      try {
        // Find existing memberDues doc
        const snap = await adminDb
          .collection('memberDues')
          .where('memberId', '==', memberId)
          .where('cycleId', '==', cycleId)
          .limit(1)
          .get();

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            status: 'PAID',
            paidAt: new Date().toISOString(),
            stripePaymentId: session.payment_intent as string,
          });
        } else {
          // Create new dues record
          await adminDb.collection('memberDues').add({
            memberId,
            cycleId,
            memberType: memberType || 'professional',
            amount: Number(amount) || 8500,
            status: 'PAID',
            paidAt: new Date().toISOString(),
            stripePaymentId: session.payment_intent as string,
            createdAt: new Date().toISOString(),
          });
        }

        // Record transaction
        await adminDb.collection('transactions').add({
          type: 'income',
          category: 'Dues',
          amount: Number(amount) || 8500,
          description: `Dues payment – ${memberType || 'professional'}`,
          date: new Date().toISOString(),
          createdBy: memberId,
          createdAt: new Date().toISOString(),
        });

        console.log(`Dues payment recorded for member ${memberId}`);
      } catch (err) {
        console.error('Error recording dues payment:', err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
