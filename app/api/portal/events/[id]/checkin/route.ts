import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { verifyCheckInSignature } from '@/lib/utils/qrcode';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Require authenticated session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('m');
    const timestamp = searchParams.get('t');
    const signature = searchParams.get('sig');

    if (!memberId || !timestamp || !signature) {
      return NextResponse.json({ error: 'Missing required query parameters (m, t, sig)' }, { status: 400 });
    }

    // Verify the HMAC signature and 24-hour expiry
    if (!verifyCheckInSignature(eventId, memberId, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid or expired check-in link' }, { status: 403 });
    }

    // Verify event exists
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify member exists
    try {
      await adminAuth.getUser(memberId);
    } catch {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Upsert RSVP with check-in data
    const rsvpRef = adminDb.collection('rsvps').doc(`${memberId}_${eventId}`);
    const rsvpDoc = await rsvpRef.get();
    const now = new Date().toISOString();

    if (rsvpDoc.exists) {
      await rsvpRef.update({
        checkedIn: true,
        checkedInAt: now,
      });
    } else {
      await rsvpRef.set({
        memberId,
        eventId,
        status: 'going',
        checkedIn: true,
        checkedInAt: now,
      });
    }

    return NextResponse.json({ success: true, checkedInAt: now });
  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
