import { NextRequest, NextResponse } from 'next/server';
import { adminDb, serializeDoc } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single event by ID
    if (id) {
      const doc = await adminDb.collection('events').doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      return NextResponse.json(serializeDoc({ id: doc.id, ...doc.data() }));
    }

    // List public, published events
    const snapshot = await adminDb
      .collection('events')
      .where('isPublic', '==', true)
      .where('status', '==', 'published')
      .orderBy('date', 'asc')
      .limit(20)
      .get();

    const events = snapshot.docs.map((doc) => serializeDoc({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    // Return default events as fallback
    const { defaultEvents } = await import('@/lib/defaults/data');
    return NextResponse.json(defaultEvents);
  }
}
