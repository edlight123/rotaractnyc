import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
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

    // Check if this guest already RSVP'd (by email + eventId)
    const existingSnap = await adminDb
      .collection('guest_rsvps')
      .where('eventId', '==', eventId)
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: 'You have already registered for this event.' },
        { status: 409 },
      );
    }

    // Check capacity (combine member RSVPs + guest RSVPs)
    if (event.capacity) {
      const [memberRsvpSnap, guestRsvpSnap] = await Promise.all([
        adminDb.collection('rsvps').where('eventId', '==', eventId).where('status', '==', 'going').count().get(),
        adminDb.collection('guest_rsvps').where('eventId', '==', eventId).where('status', '==', 'going').count().get(),
      ]);
      const totalGoing = memberRsvpSnap.data().count + guestRsvpSnap.data().count;
      if (totalGoing >= event.capacity) {
        return NextResponse.json(
          { error: 'This event is at full capacity.' },
          { status: 409 },
        );
      }
    }

    // For paid events, don't create RSVP here - redirect to checkout
    if (event.pricing && (event.type === 'paid' || event.type === 'hybrid') && event.pricing.guestPrice > 0) {
      return NextResponse.json({
        requiresPayment: true,
        guestPrice: event.pricing.guestPrice,
        earlyBirdPrice: event.pricing.earlyBirdPrice,
        earlyBirdDeadline: event.pricing.earlyBirdDeadline,
        message: 'This event requires a ticket purchase.',
      });
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
