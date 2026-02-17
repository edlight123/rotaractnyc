import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// Get documents for portal
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const snapshot = await adminDb
      .collection('documents')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const documents = snapshot.docs.map((doc) => serializeDoc({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// Create / upload document reference
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const memberData = memberDoc.data();
    const role = memberData?.role || 'member';

    // Only board+ can upload docs
    if (!['president', 'treasurer', 'board'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title || !body.category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }

    const document = {
      title: body.title,
      description: body.description || '',
      category: body.category,
      fileURL: body.fileURL || '',
      linkURL: body.linkURL || '',
      uploadedById: uid,
      uploadedByName: memberData?.displayName || '',
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('documents').add(document);

    // Remove FieldValue sentinel; return a plain ISO string
    const { createdAt, ...safeDoc } = document;
    return NextResponse.json({ id: docRef.id, ...safeDoc, createdAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

// Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const role = memberDoc.data()?.role || 'member';

    if (!['president', 'treasurer', 'board'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');
    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    await adminDb.collection('documents').doc(docId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
