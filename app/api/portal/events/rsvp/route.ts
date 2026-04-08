import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { incrementTierSoldCount, decrementTierSoldCount } from '@/lib/services/tierTracking';

// RSVP to an event
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-rsvp'), { max: 20, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

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

    // Read existing RSVP to track tier sold-count changes
    const rsvpRef = adminDb.collection('rsvps').doc(`${uid}_${eventId}`);
    const existingDoc = await rsvpRef.get();
    const prevStatus = existingDoc.exists ? existingDoc.data()?.status : null;
    const prevTierId = existingDoc.exists ? existingDoc.data()?.tierId : null;

    // Upsert RSVP
    await rsvpRef.set(
      {
        memberId: uid,
        eventId,
        status, // going | maybe | not_going
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Adjust tier sold count when status changes to/from 'going'
    if (prevTierId) {
      const wasGoing = prevStatus === 'going';
      const nowGoing = status === 'going';

      if (!wasGoing && nowGoing) {
        // Re-attending → increment
        await incrementTierSoldCount(eventId, prevTierId);
      } else if (wasGoing && !nowGoing) {
        // Cancelling → decrement to free up the spot
        await decrementTierSoldCount(eventId, prevTierId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing RSVP:', error);
    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 });
  }
}
