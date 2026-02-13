import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

// Get messages for current user
export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    const snapshot = await adminDb
      .collection('messages')
      .where('recipientId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Send a message
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const body = await request.json();

    const recipientId = body.recipientId || body.toId;
    const content = body.content || body.body;
    if (!recipientId || !content) {
      return NextResponse.json({ error: 'Recipient and content required' }, { status: 400 });
    }

    // Fetch sender info
    const senderDoc = await adminDb.collection('members').doc(uid).get();
    const senderData = senderDoc.data();

    const message = {
      fromId: uid,
      fromName: senderData?.displayName || body.senderName || '',
      toId: recipientId,
      toName: body.toName || '',
      recipientId, // keep for backward compat query
      subject: body.subject || '',
      content,
      sentAt: new Date().toISOString(),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('messages').add(message);

    return NextResponse.json({ id: docRef.id, ...message }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
