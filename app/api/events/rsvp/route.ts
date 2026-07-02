import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { eventHasEnded } from '@/lib/utils/eventTime';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { isValidEmail } from '@/lib/utils/sanitize';
import { sendEmail } from '@/lib/email/send';
import { guestRsvpConfirmationEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limit: 5 RSVPs per 60s per IP
  const rlKey = getRateLimitKey(request, 'guest-rsvp');
  const rl = await rateLimit(rlKey, { max: 5, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await request.json();
    const { eventId, name, email, phone } = body;

    // Validation
    if (!eventId || !name?.trim() || !email?.trim()) {
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

    // Verify event exists and is published + public
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const event = eventDoc.data()!;
    if (event.status !== 'published' || !event.isPublic) {
      return NextResponse.json({ error: 'Event is not available for registration.' }, { status: 400 });
    }

    // Ticket sales / registration close once the event has ended.
    if (eventHasEnded(event as { date?: string; endDate?: string })) {
      return NextResponse.json({ error: 'This event has ended — registration is closed.' }, { status: 410 });
    }

    // Determine if this event requires payment.
    // For tier-based pricing: paid if any tier has a non-zero guestPrice.
    // For legacy pricing: paid if guestPrice > 0.
    let isPaid = false;
    const pricing = event.pricing || null;
    if (pricing) {
      if (pricing.tiers?.length) {
        isPaid = pricing.tiers.some((t: any) => (t.guestPrice ?? 0) > 0);
      } else {
        isPaid = (pricing.guestPrice ?? 0) > 0;
      }
    }

    // P0 #3: Better dedup — only block if they have an active (going/maybe) RSVP
    // Allow retry for cancelled, expired, payment_failed, or refunded RSVPs.
    //
    // For PAID events we skip this check entirely so that guests can buy
    // additional tickets after a previous purchase. Each ticket purchase
    // creates its own guest_rsvps record via the checkout flow, so dedup
    // here would incorrectly block legitimate repeat customers.
    if (!isPaid) {
      const existingSnap = await adminDb
        .collection('guest_rsvps')
        .where('eventId', '==', eventId)
        .where('email', '==', email.toLowerCase().trim())
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0].data();
        const activeStatuses = ['going', 'maybe', 'pending'];
        if (activeStatuses.includes(existing.status)) {
          return NextResponse.json(
            { error: 'You have already registered for this event.'
              + (existing.status === 'pending' ? ' Your payment is still being processed.' : '') },
            { status: 409 },
          );
        }
        // If their previous RSVP was cancelled/expired/failed/refunded, allow re-registration
      }
    }

    // For paid events, redirect to checkout
    if (isPaid && pricing) {
      return NextResponse.json({
        requiresPayment: true,
        guestPrice: pricing.guestPrice ?? 0,
        earlyBirdPrice: pricing.earlyBirdPrice,
        earlyBirdDeadline: pricing.earlyBirdDeadline,
        tiers: pricing.tiers || undefined,
        message: 'This event requires a ticket purchase.',
      });
    }

    // Check capacity (combine member RSVPs + guest RSVPs).
    // Sum *tickets* (RSVP.quantity) rather than counting docs — multi-ticket
    // RSVPs would otherwise be under-counted and let the event over-sell.
    if (event.capacity) {
      const [memberRsvpSnap, guestRsvpSnap] = await Promise.all([
        adminDb.collection('rsvps').where('eventId', '==', eventId).where('status', '==', 'going').get(),
        adminDb.collection('guest_rsvps').where('eventId', '==', eventId).where('status', '==', 'going').get(),
      ]);
      const sumQty = (snap: FirebaseFirestore.QuerySnapshot) =>
        snap.docs.reduce((s, d) => s + (d.data().quantity || 1), 0);
      const totalGoing = sumQty(memberRsvpSnap) + sumQty(guestRsvpSnap);
      if (totalGoing >= event.capacity) {
        return NextResponse.json(
          { error: 'This event is at full capacity.' },
          { status: 409 },
        );
      }
    }

    // Create guest RSVP for free events
    const guestRsvpRef = adminDb.collection('guest_rsvps').doc();
    const guestRsvpData = {
      eventId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      status: 'going',
      ticketType: 'guest',
      paymentStatus: 'free',
      createdAt: new Date().toISOString(),
    };

    await guestRsvpRef.set(guestRsvpData);

    // Send confirmation email (non-blocking)
    const emailData = guestRsvpConfirmationEmail(name.trim(), {
      title: event.title,
      date: event.date,
      time: event.time || '',
      location: event.location || '',
      slug: event.slug,
    });

    sendEmail({
      to: email.toLowerCase().trim(),
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    }).catch((err) => console.error('Failed to send guest RSVP confirmation:', err));

    return NextResponse.json({
      success: true,
      message: "You're registered! Check your email for confirmation.",
      rsvpId: guestRsvpRef.id,
    });
  } catch (error: any) {
    console.error('Guest RSVP error:', error);
    return NextResponse.json(
      { error: 'Failed to register. Please try again.' },
      { status: 500 },
    );
  }
}
