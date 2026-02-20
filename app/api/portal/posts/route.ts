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

    const resolvedName =
      memberData?.displayName ||
      [memberData?.firstName, memberData?.lastName].filter(Boolean).join(' ') ||
      body.authorName ||
      'Member';

    const resolvedRole = (() => {
      const r = memberData?.role as string | undefined;
      if (r === 'president') return 'President';
      if (r === 'treasurer') return 'Treasurer';
      if (r === 'board') return 'Board Member';
      return undefined;
    })();

    const post: Record<string, unknown> = {
      type: body.type || 'text',
      content: body.content,
      authorId: uid,
      authorName: resolvedName,
      authorPhoto: memberData?.photoURL || body.authorPhotoURL || '',
      ...(resolvedRole ? { authorRole: resolvedRole } : {}),
      imageURLs: body.imageURLs || [],
      likeCount: 0,
      commentCount: 0,
      likedBy: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Optional fields
    if (body.linkURL) post.linkURL = body.linkURL;
    if (body.audience && ['all', 'board'].includes(body.audience)) {
      post.audience = body.audience;
    }

    const docRef = await adminDb.collection('posts').add(post);

    // Remove FieldValue sentinels that can't be serialised
    const { createdAt, updatedAt, ...safePost } = post;
    return NextResponse.json({ id: docRef.id, ...safePost, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
