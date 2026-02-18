import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { addComment, getComments } from '@/lib/services/posts';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// Get comments for a post
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await adminAuth.verifySessionCookie(sessionCookie, true);
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    const comments = await getComments(postId);
    return NextResponse.json(comments.map(serializeDoc));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// Add a comment to a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const { postId } = await params;
    const body = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Fetch member info for the comment
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    const memberData = memberDoc.data();

    const commentId = await addComment({
      postId,
      authorId: uid,
      authorName: memberData?.displayName || 'Member',
      authorPhoto: memberData?.photoURL || '',
      content: body.content.trim(),
      createdAt: new Date().toISOString(),
      likeCount: 0,
    });

    return NextResponse.json({ id: commentId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
