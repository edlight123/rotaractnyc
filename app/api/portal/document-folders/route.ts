import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const COLLECTION = 'documentFolders';

// ── Helpers ──

async function getAuthenticatedMember(): Promise<{ uid: string; role: string; displayName: string; [key: string]: any } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;

  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    const data = memberDoc.data()!;
    return { uid, role: data.role || 'member', displayName: data.displayName || '', ...data };
  } catch {
    return null;
  }
}

function isBoardOrAbove(role: string) {
  return ['president', 'treasurer', 'board'].includes(role);
}

// ── GET — list all folders ──

export async function GET() {
  try {
    const member = await getAuthenticatedMember();
    if (!member) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .orderBy('order', 'asc')
      .get();

    const folders = snapshot.docs.map((doc) =>
      serializeDoc({ id: doc.id, ...doc.data() }),
    );

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching document folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

// ── POST — create a folder ──

export async function POST(request: NextRequest) {
  try {
    const member = await getAuthenticatedMember();
    if (!member || !isBoardOrAbove(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    // Get next order value
    const lastSnap = await adminDb
      .collection(COLLECTION)
      .orderBy('order', 'desc')
      .limit(1)
      .get();
    const nextOrder = lastSnap.empty ? 0 : ((lastSnap.docs[0].data().order ?? 0) + 1);

    const folder = {
      name: body.name.trim(),
      color: body.color || 'azure',
      icon: body.icon || null,
      pinned: body.pinned ?? false,
      order: nextOrder,
      createdBy: member.uid,
      createdByName: member.displayName || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection(COLLECTION).add(folder);

    return NextResponse.json(
      { id: ref.id, ...folder, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

// ── PATCH — update folder (rename, pin, reorder, change color) ──

export async function PATCH(request: NextRequest) {
  try {
    const member = await getAuthenticatedMember();
    if (!member || !isBoardOrAbove(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const allowed: Record<string, any> = {};
    if (typeof updates.name === 'string' && updates.name.trim()) allowed.name = updates.name.trim();
    if (typeof updates.color === 'string') allowed.color = updates.color;
    if (typeof updates.icon === 'string') allowed.icon = updates.icon;
    if (typeof updates.pinned === 'boolean') allowed.pinned = updates.pinned;
    if (typeof updates.order === 'number') allowed.order = updates.order;

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    allowed.updatedAt = FieldValue.serverTimestamp();
    await adminDb.collection(COLLECTION).doc(id).update(allowed);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

// ── DELETE — delete a folder (moves docs to unfiled) ──

export async function DELETE(request: NextRequest) {
  try {
    const member = await getAuthenticatedMember();
    if (!member || !isBoardOrAbove(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('id');
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    // Un-assign all documents in this folder
    const docsInFolder = await adminDb
      .collection('documents')
      .where('folderId', '==', folderId)
      .get();

    const batch = adminDb.batch();
    docsInFolder.docs.forEach((doc) => {
      batch.update(doc.ref, { folderId: null, updatedAt: FieldValue.serverTimestamp() });
    });
    batch.delete(adminDb.collection(COLLECTION).doc(folderId));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
