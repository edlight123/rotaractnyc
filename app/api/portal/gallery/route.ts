import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/portal/gallery?eventId=xxx
// Returns gallery images, optionally filtered by eventId.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    let query: FirebaseFirestore.Query = adminDb
      .collection('gallery')
      .orderBy('createdAt', 'desc');

    if (eventId) {
      query = query.where('eventId', '==', eventId);
    }

    const snapshot = await query.limit(200).get();

    const images = snapshot.docs.map((doc) =>
      serializeDoc({ id: doc.id, ...doc.data() }),
    );

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/portal/gallery
// Create gallery image documents. Any active member can upload.
// Body: { urls: string[], eventId?: string, eventTitle?: string, captions?: string[] }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(
    getRateLimitKey(request, 'portal-gallery'),
    { max: 10, windowSec: 60 },
  );
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Verify the member exists and is active
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const memberData = memberDoc.data();
    if (!memberData || memberData.status !== 'active') {
      return NextResponse.json({ error: 'Only active members can upload photos' }, { status: 403 });
    }

    const body = await request.json();
    const { urls, eventId, eventTitle, captions } = body as {
      urls: string[];
      eventId?: string;
      eventTitle?: string;
      captions?: string[];
    };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }

    if (urls.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 photos per upload' }, { status: 400 });
    }

    const uploaderName =
      memberData.displayName ||
      [memberData.firstName, memberData.lastName].filter(Boolean).join(' ') ||
      'Member';

    const batch = adminDb.batch();
    const createdIds: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const docRef = adminDb.collection('gallery').doc();
      const galleryDoc: Record<string, unknown> = {
        url: urls[i],
        caption: captions?.[i] || '',
        event: eventTitle || '',
        date: new Date().toISOString().split('T')[0],
        uploadedBy: uploaderName,
        createdAt: FieldValue.serverTimestamp(),
      };

      if (eventId) {
        galleryDoc.eventId = eventId;
      }

      batch.set(docRef, galleryDoc);
      createdIds.push(docRef.id);
    }

    await batch.commit();

    return NextResponse.json(
      { success: true, count: urls.length, ids: createdIds },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating gallery images:', error);
    return NextResponse.json({ error: 'Failed to upload gallery images' }, { status: 500 });
  }
}
