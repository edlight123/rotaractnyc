import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  return adminAuth.verifySessionCookie(sessionCookie, true);
}

async function getMemberRole(uid: string) {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.data()?.role as string | undefined;
}

// Get service hours — own entries for members, all entries for board+
export async function GET(request: NextRequest) {
  try {
    const { uid } = await getSession();
    const role = await getMemberRole(uid);
    const isBoard = role && ['board', 'treasurer', 'president'].includes(role);

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'pending' | 'all' | undefined

    let query = adminDb.collection('serviceHours') as FirebaseFirestore.Query;

    // Board can see all; members only their own
    if (!isBoard) {
      query = query.where('memberId', '==', uid);
    } else if (filter === 'pending') {
      query = query.where('status', '==', 'pending');
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();

    const hours = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(hours);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching service hours:', error);
    return NextResponse.json({ error: 'Failed to fetch service hours' }, { status: 500 });
  }
}

// Log service hours
export async function POST(request: NextRequest) {
  try {
    const { uid } = await getSession();
    const body = await request.json();

    // Fetch member name
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const memberName = memberDoc.data()?.displayName || '';

    const entry = {
      memberId: uid,
      memberName,
      eventId: body.eventId || null,
      eventTitle: body.eventTitle || body.eventName || '',
      hours: Math.min(Math.max(Number(body.hours) || 0, 0.25), 24),
      date: body.date || new Date().toISOString().split('T')[0],
      notes: body.notes || '',
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('serviceHours').add(entry);

    return NextResponse.json({ id: docRef.id, ...entry }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error logging service hours:', error);
    return NextResponse.json({ error: 'Failed to log hours' }, { status: 500 });
  }
}

// Approve / reject service hours (board+ only)
export async function PATCH(request: NextRequest) {
  try {
    const { uid } = await getSession();
    const role = await getMemberRole(uid);
    if (!role || !['board', 'treasurer', 'president'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { entryId, status: newStatus } = body;

    if (!entryId || !['approved', 'rejected'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'entryId and status (approved|rejected) required' },
        { status: 400 },
      );
    }

    const entryRef = adminDb.collection('serviceHours').doc(entryId);
    const entryDoc = await entryRef.get();
    if (!entryDoc.exists) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await entryRef.update({
      status: newStatus,
      reviewedBy: uid,
      reviewedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating service hours:', error);
    return NextResponse.json({ error: 'Failed to update hours' }, { status: 500 });
  }
}
