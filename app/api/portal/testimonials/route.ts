import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

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
      return { error: 'Only board members can manage testimonials.', status: 403, uid: null, member: null };
    }

    return { error: null, status: 200, uid: decoded.uid, member: { id: decoded.uid, ...member } };
  } catch {
    return { error: 'Session expired. Please sign in again.', status: 401, uid: null, member: null };
  }
}

// ─── GET: List all testimonials ───

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
      .collection('testimonials')
      .orderBy('order', 'asc')
      .get();

    const testimonials = snapshot.docs.map((doc) => serializeDoc({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ testimonials });
  } catch (err) {
    console.error('[GET /api/portal/testimonials]', err);
    return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 });
  }
}

// ─── POST: Create testimonial ───

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-testimonials'), { max: 10, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const { error, status, uid } = await authenticateBoardMember();
    if (error || !uid) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const body = await request.json();
    const { quote, name, title, photoURL, order, isActive } = body;

    if (!quote || !name || !title) {
      return NextResponse.json(
        { error: 'Quote, name, and title are required.' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // If no order specified, add to end
    let finalOrder = order ?? 0;
    if (finalOrder === 0) {
      const existing = await adminDb
        .collection('testimonials')
        .orderBy('order', 'desc')
        .limit(1)
        .get();
      finalOrder = existing.empty ? 0 : (existing.docs[0].data().order ?? 0) + 1;
    }

    const testimonialData = {
      quote,
      name,
      title,
      photoURL: photoURL || null,
      order: finalOrder,
      isActive: isActive ?? true,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection('testimonials').add(testimonialData);
    const doc = await docRef.get();

    return NextResponse.json(
      { testimonial: serializeDoc({ id: doc.id, ...doc.data() }) },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/portal/testimonials]', err);
    return NextResponse.json({ error: 'Failed to create testimonial' }, { status: 500 });
  }
}

// ─── PUT: Update testimonial ───

export async function PUT(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-testimonials'), { max: 10, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const { error, status, uid } = await authenticateBoardMember();
    if (error || !uid) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const body = await request.json();
    const { id, quote, name, title, photoURL, order, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Testimonial ID is required.' }, { status: 400 });
    }

    const docRef = adminDb.collection('testimonials').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Testimonial not found.' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (quote !== undefined) updates.quote = quote;
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (photoURL !== undefined) updates.photoURL = photoURL || null;
    if (order !== undefined) updates.order = order;
    if (isActive !== undefined) updates.isActive = isActive;

    await docRef.update(updates);

    const updated = await docRef.get();
    return NextResponse.json({
      testimonial: serializeDoc({ id: updated.id, ...updated.data() }),
    });
  } catch (err) {
    console.error('[PUT /api/portal/testimonials]', err);
    return NextResponse.json({ error: 'Failed to update testimonial' }, { status: 500 });
  }
}

// ─── DELETE: Remove testimonial ───

export async function DELETE(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-testimonials'), { max: 10, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const { error, status, uid } = await authenticateBoardMember();
    if (error || !uid) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Testimonial ID is required.' }, { status: 400 });
    }

    const docRef = adminDb.collection('testimonials').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Testimonial not found.' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/portal/testimonials]', err);
    return NextResponse.json({ error: 'Failed to delete testimonial' }, { status: 500 });
  }
}
