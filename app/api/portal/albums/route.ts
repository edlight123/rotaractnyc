import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

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

// GET — list all albums (for portal)
export async function GET() {
  const board = await requireBoard();
  if (!board) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snap = await adminDb
      .collection('albums')
      .orderBy('date', 'desc')
      .get();

    const albums = snap.docs.map((doc) => serializeDoc({ id: doc.id, ...doc.data() }));
    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    return NextResponse.json({ error: 'Failed to fetch albums' }, { status: 500 });
  }
}

// POST — create a new album
export async function POST(request: NextRequest) {
  const rl = await rateLimit(getRateLimitKey(request, 'portal-albums'), { max: 10, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const board = await requireBoard();
  if (!board) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, slug, description, date, eventId, isPublic, coverPhotoUrl, publicPreviewCount } = body;

    if (!title?.trim() || !slug?.trim() || !date) {
      return NextResponse.json({ error: 'Title, slug, and date are required' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await adminDb.collection('albums').where('slug', '==', slug).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'An album with this slug already exists' }, { status: 409 });
    }

    const ref = await adminDb.collection('albums').add({
      title: title.trim(),
      slug: slug.trim(),
      description: description?.trim() || '',
      date,
      eventId: eventId || null,
      coverPhotoUrl: coverPhotoUrl || null,
      photoCount: 0,
      publicPreviewCount: publicPreviewCount || 6,
      isPublic: isPublic ?? true,
      createdBy: board.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating album:', error);
    return NextResponse.json({ error: 'Failed to create album' }, { status: 500 });
  }
}

// PUT — update an album
export async function PUT(request: NextRequest) {
  const board = await requireBoard();
  if (!board) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }

    await adminDb.collection('albums').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating album:', error);
    return NextResponse.json({ error: 'Failed to update album' }, { status: 500 });
  }
}

// DELETE — remove an album (also deletes its photos)
export async function DELETE(request: NextRequest) {
  const board = await requireBoard();
  if (!board) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });

  try {
    // Delete all photos in the album
    const photosSnap = await adminDb.collection('gallery').where('albumId', '==', id).get();
    const batch = adminDb.batch();
    photosSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(adminDb.collection('albums').doc(id));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting album:', error);
    return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
  }
}
