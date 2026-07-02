import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getAuthedMember() {
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

// DELETE — remove a community post. Allowed for the post's author or board+.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const rl = await rateLimit(getRateLimitKey(request, 'post-delete'), { max: 20, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const auth = await getAuthedMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { postId } = await params;
    const postRef = adminDb.collection('posts').doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = postSnap.data()!;
    const isAdmin = ['board', 'treasurer', 'president'].includes(auth.member.role);
    if (post.authorId !== auth.uid && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete comments subcollection first (best-effort), then the post itself.
    const comments = await postRef.collection('comments').get();
    if (!comments.empty) {
      const batch = adminDb.batch();
      comments.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await postRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
