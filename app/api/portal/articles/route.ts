import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// ─── Helpers ───

async function authenticateBoardMember() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;

  if (!sessionCookie) {
    return { error: 'Unauthorized', status: 401, uid: null, member: null };
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberSnap = await adminDb.collection('members').doc(decoded.uid).get();
    const member = memberSnap.exists ? (memberSnap.data() as any) : null;

    if (!member || !['board', 'president', 'treasurer'].includes(member.role)) {
      return { error: 'Only board members can manage articles.', status: 403, uid: null, member: null };
    }

    return { error: null, status: 200, uid: decoded.uid, member: { id: decoded.uid, ...member } };
  } catch {
    return { error: 'Session expired. Please sign in again.', status: 401, uid: null, member: null };
  }
}

// ─── GET: List articles (for portal) ───

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const snapshot = await adminDb
      .collection('articles')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const articles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ articles });
  } catch (err) {
    console.error('[GET /api/portal/articles]', err);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

// ─── POST: Create article ───

export async function POST(request: NextRequest) {
  try {
    const { error, status, uid, member } = await authenticateBoardMember();
    if (error || !uid || !member) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const body = await request.json();
    const { title, slug, excerpt, content, coverImage, category, tags, isPublished } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Title, slug, and content are required.' },
        { status: 400 },
      );
    }

    // Check slug uniqueness
    const existing = await adminDb
      .collection('articles')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: 'An article with this slug already exists. Please choose a different title.' },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const articleData = {
      title,
      slug,
      excerpt: excerpt || '',
      content,
      coverImage: coverImage || null,
      author: {
        id: uid,
        name: member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        photoURL: member.photoURL || null,
      },
      category: category || 'General',
      tags: tags || [],
      isPublished: isPublished ?? false,
      publishedAt: isPublished ? now : null,
      createdAt: now,
      updatedAt: now,
      viewCount: 0,
      likeCount: 0,
    };

    const docRef = await adminDb.collection('articles').add(articleData);

    return NextResponse.json({
      success: true,
      article: { id: docRef.id, ...articleData },
    });
  } catch (err) {
    console.error('[POST /api/portal/articles]', err);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}

// ─── PUT: Update article ───

export async function PUT(request: NextRequest) {
  try {
    const { error, status, uid } = await authenticateBoardMember();
    if (error || !uid) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const body = await request.json();
    const { id, title, slug, excerpt, content, coverImage, category, tags, isPublished } = body;

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required.' }, { status: 400 });
    }

    const docRef = adminDb.collection('articles').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }

    const existing = docSnap.data()!;
    const wasPublished = existing.isPublished;
    const now = new Date().toISOString();

    // If slug changed, check uniqueness
    if (slug && slug !== existing.slug) {
      const slugCheck = await adminDb
        .collection('articles')
        .where('slug', '==', slug)
        .limit(1)
        .get();
      if (!slugCheck.empty) {
        return NextResponse.json(
          { error: 'An article with this slug already exists.' },
          { status: 409 },
        );
      }
    }

    const updates: Record<string, any> = {
      updatedAt: now,
    };

    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (content !== undefined) updates.content = content;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (isPublished !== undefined) {
      updates.isPublished = isPublished;
      if (isPublished && !wasPublished) {
        updates.publishedAt = now;
      }
    }

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      article: { id, ...existing, ...updates },
    });
  } catch (err) {
    console.error('[PUT /api/portal/articles]', err);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

// ─── DELETE: Delete article ───

export async function DELETE(request: NextRequest) {
  try {
    const { error, status, uid } = await authenticateBoardMember();
    if (error || !uid) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required.' }, { status: 400 });
    }

    const docRef = adminDb.collection('articles').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/portal/articles]', err);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
