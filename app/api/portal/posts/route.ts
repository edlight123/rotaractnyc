import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

// Get community posts (portal-only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const snapshot = await adminDb
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const posts = snapshot.docs.map((doc) => serializeDoc({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// Create a community post
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const body = await request.json();

    // Fetch member info for the post
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const memberData = memberDoc.data();

    const post = {
      type: body.type || 'text',
      content: body.content,
      authorId: uid,
      authorName: memberData?.displayName || body.authorName || '',
      authorPhoto: memberData?.photoURL || body.authorPhotoURL || '',
      imageURLs: body.imageURLs || [],
      likeCount: 0,
      commentCount: 0,
      likedBy: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('posts').add(post);

    // Remove FieldValue sentinels that can't be serialised
    const { createdAt, updatedAt, ...safePost } = post;
    return NextResponse.json({ id: docRef.id, ...safePost, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
