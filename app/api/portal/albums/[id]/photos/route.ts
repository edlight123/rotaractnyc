import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

async function requireBoard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const doc = await adminDb.collection('members').doc(uid).get();
    const member = doc.data();
    if (!member || !['board', 'treasurer', 'president'].includes(member.role)) return null;
    return { uid, member };
  } catch {
    return null;
  }
}

async function requireMember() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const doc = await adminDb.collection('members').doc(uid).get();
    if (!doc.exists) return null;
    return { uid, member: doc.data()! };
  } catch {
    return null;
  }
}

// GET — list photos in an album (members see all, public sees preview count)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;

  // Check if member (authenticated)
  const member = await requireMember();

  try {
    const albumDoc = await adminDb.collection('albums').doc(albumId).get();
    if (!albumDoc.exists) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const album = albumDoc.data()!;

    let query: FirebaseFirestore.Query = adminDb
      .collection('gallery')
      .where('albumId', '==', albumId)
      .orderBy('order', 'asc');

    // If not authenticated, limit to public preview count
    if (!member) {
      const previewCount = album.publicPreviewCount || 6;
      query = query.limit(previewCount);
    }

    const snap = await query.get();
    const photos = snap.docs.map((doc) => serializeDoc({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      photos,
      totalCount: album.photoCount || 0,
      isFullAccess: !!member,
    });
  } catch (error) {
    console.error('Error fetching album photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

// POST — add photos to an album (board only)
// Body: { urls: string[], storagePaths?: string[], captions?: string[] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(getRateLimitKey(request, 'portal-album-photos'), { max: 10, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const board = await requireBoard();
  if (!board) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: albumId } = await params;

  try {
    const albumDoc = await adminDb.collection('albums').doc(albumId).get();
    if (!albumDoc.exists) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const body = await request.json();
    const { urls, storagePaths, captions } = body as {
      urls: string[];
      storagePaths?: string[];
      captions?: string[];
    };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }

    if (urls.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 photos per upload' }, { status: 400 });
    }

    // Get current max order
    const lastPhotoSnap = await adminDb
      .collection('gallery')
      .where('albumId', '==', albumId)
      .orderBy('order', 'desc')
      .limit(1)
      .get();

    const nextOrder = lastPhotoSnap.empty ? 0 : ((lastPhotoSnap.docs[0].data().order || 0) + 1);

    const batch = adminDb.batch();
    const createdIds: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const docRef = adminDb.collection('gallery').doc();
      batch.set(docRef, {
        albumId,
        url: urls[i],
        storagePath: storagePaths?.[i] || '',
        caption: captions?.[i] || '',
        order: nextOrder + i,
        uploadedBy: board.uid,
        createdAt: new Date().toISOString(),
      });
      createdIds.push(docRef.id);
    }

    // Update album photo count
    batch.update(adminDb.collection('albums').doc(albumId), {
      photoCount: FieldValue.increment(urls.length),
      updatedAt: new Date().toISOString(),
      // Set cover photo if not set
      ...(!(albumDoc.data()!.coverPhotoUrl) && { coverPhotoUrl: urls[0] }),
    });

    await batch.commit();

    return NextResponse.json({ success: true, count: urls.length, ids: createdIds }, { status: 201 });
  } catch (error) {
    console.error('Error adding photos:', error);
    return NextResponse.json({ error: 'Failed to add photos' }, { status: 500 });
  }
}

// DELETE — remove a photo from an album
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const board = await requireBoard();
  if (!board) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: albumId } = await params;
  const photoId = new URL(request.url).searchParams.get('photoId');
  if (!photoId) return NextResponse.json({ error: 'photoId is required' }, { status: 400 });

  try {
    const batch = adminDb.batch();
    batch.delete(adminDb.collection('gallery').doc(photoId));
    batch.update(adminDb.collection('albums').doc(albumId), {
      photoCount: FieldValue.increment(-1),
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
