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

    // Support both POST body and query params for flexibility
    let memberId: string | null = null;
    let timestamp: string | null = null;
    let signature: string | null = null;

    try {
      const body = await request.json();
      memberId = body.memberId || null;
      timestamp = body.timestamp || null;
      signature = body.signature || null;
    } catch {
      // Fallback to query params
      const { searchParams } = new URL(request.url);
      memberId = searchParams.get('m');
      timestamp = searchParams.get('t');
      signature = searchParams.get('sig');
    }

    if (!memberId || !timestamp || !signature) {
      return NextResponse.json({ error: 'Missing required parameters (memberId/m, timestamp/t, signature/sig)' }, { status: 400 });
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
    const eventName = eventDoc.data()?.title || 'Event';

    // Detect duplicate check-in
    if (rsvpDoc.exists && rsvpDoc.data()?.checkedIn) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        eventName,
        checkedInAt: rsvpDoc.data()?.checkedInAt || now,
      });
    }

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

    return NextResponse.json({ success: true, eventName, checkedInAt: now });
  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
