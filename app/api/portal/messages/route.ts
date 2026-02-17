import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { escapeHtml } from '@/lib/utils/sanitize';

// Get messages for current user (inbox + sent)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox'; // inbox | sent

    const fieldToQuery = folder === 'sent' ? 'fromId' : 'toId';

    const snapshot = await adminDb
      .collection('messages')
      .where(fieldToQuery, '==', uid)
      .orderBy('sentAt', 'desc')
      .limit(50)
      .get();

    const messages = snapshot.docs.map((doc) => serializeDoc({ id: doc.id, ...doc.data() }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Send a message
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
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

    // Fetch recipient info
    const recipientDoc = await adminDb.collection('members').doc(recipientId).get();
    const recipientData = recipientDoc.data();

    const message = {
      fromId: uid,
      fromName: senderData?.displayName || '',
      toId: recipientId,
      toName: recipientData?.displayName || body.toName || '',
      subject: escapeHtml(body.subject || ''),
      body: escapeHtml(content),
      sentAt: new Date().toISOString(),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('messages').add(message);

    // Don't include createdAt (FieldValue sentinel) in response — it can't be serialised
    const { createdAt, ...responseSafe } = message;
    return NextResponse.json({ id: docRef.id, ...responseSafe }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// Mark message as read
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 });
    }

    const msgRef = adminDb.collection('messages').doc(messageId);
    const msgDoc = await msgRef.get();

    if (!msgDoc.exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only recipient can mark as read
    if (msgDoc.data()?.toId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await msgRef.update({ read: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}
