import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

// RSVP to an event
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const body = await request.json();
    const { eventId, status } = body;

    if (!eventId || !status) {
      return NextResponse.json({ error: 'Event ID and status are required' }, { status: 400 });
    }

    const VALID_RSVP_STATUSES = ['going', 'maybe', 'not_going'];
    if (!VALID_RSVP_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid RSVP status. Must be one of: ${VALID_RSVP_STATUSES.join(', ')}` }, { status: 400 });
    }

    // Upsert RSVP
    const rsvpRef = adminDb.collection('rsvps').doc(`${uid}_${eventId}`);
    await rsvpRef.set(
      {
        memberId: uid,
        eventId,
        status, // going | maybe | not_going
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing RSVP:', error);
    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 });
  }
}
