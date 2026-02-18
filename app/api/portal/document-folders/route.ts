import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const COLLECTION = 'documentFolders';

// GET — list all folders
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const snapshot = await adminDb.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    const folders = snapshot.docs.map((doc) => serializeDoc({ id: doc.id, ...doc.data() }));
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching document folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// POST — create a new folder
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const memberData = memberDoc.data();
    const role = memberData?.role || 'member';
    if (!['president', 'treasurer', 'board'].includes(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    if (!body.name?.trim())
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });

    const folder = {
      name: body.name.trim(),
      color: body.color || 'gray',
      pinned: body.pinned ?? false,
      createdBy: uid,
      createdByName: memberData?.displayName || '',
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection(COLLECTION).add(folder);
    const { createdAt, ...safeFolder } = folder;
    return NextResponse.json(
      { id: ref.id, ...safeFolder, createdAt: new Date().toISOString() },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

// PATCH — update a folder (rename, pin/unpin, change color)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const role = memberDoc.data()?.role || 'member';
    if (!['president', 'treasurer', 'board'].includes(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });

    const allowed: Record<string, any> = {};
    if (typeof updates.name === 'string') allowed.name = updates.name.trim();
    if (typeof updates.pinned === 'boolean') allowed.pinned = updates.pinned;
    if (typeof updates.color === 'string') allowed.color = updates.color;
    if (Object.keys(allowed).length === 0)
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });

    allowed.updatedAt = FieldValue.serverTimestamp();
    await adminDb.collection(COLLECTION).doc(id).update(allowed);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// DELETE — delete a folder (documents inside become uncategorized)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const role = memberDoc.data()?.role || 'member';
    if (!['president', 'treasurer', 'board'].includes(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('id');
    if (!folderId) return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });

    // Unset folderId on all documents in this folder
    const docsSnap = await adminDb
      .collection('documents')
      .where('folderId', '==', folderId)
      .get();
    const batch = adminDb.batch();
    docsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { folderId: FieldValue.delete() });
    });
    batch.delete(adminDb.collection(COLLECTION).doc(folderId));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
