import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { isValidEmail } from '@/lib/utils/sanitize';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email/send';
import { waitlistConfirmationEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limit: 3 waitlist joins per 60s per IP
  const rlKey = getRateLimitKey(request, 'event-waitlist');
  const rl = await rateLimit(rlKey, { max: 3, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { eventId, email } = await request.json();

    if (!eventId || !email) {
      return NextResponse.json(
        { error: 'Event ID and email are required.' },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    // Verify event exists
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;
    const eventTitle: string = eventData.title || 'Event';
    const eventSlug: string = eventData.slug || eventId;

    // Check for duplicate waitlist entries
    const existingSnap = await adminDb
      .collection('event_waitlist')
      .where('eventId', '==', eventId)
      .where('email', '==', email.toLowerCase())
      .where('status', '==', 'waiting')
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { message: 'You are already on the waitlist for this event.' },
        { status: 200 },
      );
    }

    await adminDb.collection('event_waitlist').add({
      eventId,
      email: email.toLowerCase(),
      status: 'waiting',
      createdAt: new Date().toISOString(),
    });

    // Await the send. Returning first leaves this promise unsettled, and a
    // serverless function can be frozen the instant its response goes out —
    // dropping the request to Resend mid-flight. Joining the waitlist must
    // still succeed if Resend is down, so a failure is logged, not thrown.
    const emailResult = await sendEmail({
      to: email,
      ...waitlistConfirmationEmail(email, eventTitle, eventSlug),
    }).catch((err) => {
      console.error('[Waitlist] Confirmation email failed:', err);
      return { success: false as const, error: err?.message || 'send failed' };
    });

    if (!emailResult.success) {
      console.error('[Waitlist] Confirmation email not sent:', emailResult.error);
    }

    return NextResponse.json(
      { message: 'Successfully joined the waitlist.', emailSent: emailResult.success },
      { status: 201 },
    );
  } catch (error) {
    console.error('Waitlist join error:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again later.' },
      { status: 500 },
    );
  }
}