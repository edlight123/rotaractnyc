import { NextRequest, NextResponse } from 'next/server';
import { adminDb, serializeDoc } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * Cap on the public event list. Generous enough that nothing is dropped at
 * today's volume (34 events) while still bounding the response as the archive
 * grows.
 */
const EVENT_LIST_LIMIT = 200;

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

    // List public, published events.
    //
    // This was .limit(20) with an ascending sort, which silently returned the
    // 20 *oldest* events. With 34 documents that meant no upcoming event ever
    // appeared in this endpoint at all — the site search index built from it
    // could not find anything current.
    //
    // Newest-first would be the better truncation, but the composite index
    // for (isPublic, status, date DESC) does not exist and the deploy service
    // account lacks datastore.indexAdmin to create it. Raising the cap fixes
    // the actual defect at any realistic volume: 34 events today, ~30 a year.
    // See README note in scripts/deploy-firestore-indexes.mjs.
    const snapshot = await adminDb
      .collection('events')
      .where('isPublic', '==', true)
      .where('status', '==', 'published')
      .orderBy('date', 'asc')
      .limit(EVENT_LIST_LIMIT)
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
