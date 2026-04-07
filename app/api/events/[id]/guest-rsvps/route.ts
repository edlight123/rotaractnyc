import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Verify the user is a board member or admin
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const member = memberDoc.data()!;
    if (!['board', 'president', 'treasurer'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: eventId } = await params;

    // Fetch guest RSVPs for this event
    const snap = await adminDb
      .collection('guest_rsvps')
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .get();

    const guestRsvps = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(guestRsvps);
  } catch (error) {
    console.error('Error fetching guest RSVPs:', error);
    return NextResponse.json({ error: 'Failed to fetch guest RSVPs' }, { status: 500 });
  }
}
