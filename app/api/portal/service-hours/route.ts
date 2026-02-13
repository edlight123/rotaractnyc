import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

// Get service hours for current user
export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    const snapshot = await adminDb
      .collection('serviceHours')
      .where('memberId', '==', uid)
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    const hours = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(hours);
  } catch (error) {
    console.error('Error fetching service hours:', error);
    return NextResponse.json({ error: 'Failed to fetch service hours' }, { status: 500 });
  }
}

// Log service hours
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const body = await request.json();

    const entry = {
      memberId: uid,
      eventId: body.eventId || null,
      eventTitle: body.eventTitle || body.eventName || '',
      hours: Number(body.hours),
      date: body.date || new Date().toISOString().split('T')[0],
      notes: body.notes || '',
      status: 'pending', // pending | approved | rejected
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('serviceHours').add(entry);

    return NextResponse.json({ id: docRef.id, ...entry }, { status: 201 });
  } catch (error) {
    console.error('Error logging service hours:', error);
    return NextResponse.json({ error: 'Failed to log hours' }, { status: 500 });
  }
}
