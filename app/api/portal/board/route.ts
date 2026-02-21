import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    const data = memberDoc.data()!;
    return { uid, role: data.role as string };
  } catch {
    return null;
  }
}

function isBoard(role: string) {
  return ['president', 'board', 'treasurer'].includes(role);
}

// ─── GET /api/portal/board ─────────────────────────────────────────────────
// Returns the saved board roster from settings/board (public-accessible for
// the leadership page fallback, but we also expose it here for the portal UI).

export async function GET() {
  try {
    const snap = await adminDb.collection('settings').doc('board').get();
    if (!snap.exists) return NextResponse.json({ members: [] });
    const data = snap.data();
    return NextResponse.json({ members: data?.members ?? [] });
  } catch (err) {
    console.error('[GET /api/portal/board]', err);
    return NextResponse.json({ error: 'Failed to load board' }, { status: 500 });
  }
}

// ─── PUT /api/portal/board ─────────────────────────────────────────────────
// Replaces the entire board roster. Body: { members: BoardEntry[] }
// Board/president only.

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !isBoard(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { members } = await request.json();

    if (!Array.isArray(members)) {
      return NextResponse.json({ error: 'members must be an array' }, { status: 400 });
    }

    // Validate & clean each entry
    const cleaned = members.map((m: any, i: number) => ({
      id: m.id || crypto.randomUUID(),
      name: String(m.name || '').trim(),
      title: String(m.title || '').trim(),
      photoURL: String(m.photoURL || '').trim(),
      linkedIn: String(m.linkedIn || '').trim(),
      bio: String(m.bio || '').trim(),
      memberId: m.memberId ? String(m.memberId).trim() : '',
      order: typeof m.order === 'number' ? m.order : i,
    }));

    await adminDb.collection('settings').doc('board').set(
      { members: cleaned, updatedAt: new Date().toISOString(), updatedBy: session.uid },
      { merge: false },
    );

    return NextResponse.json({ ok: true, members: cleaned });
  } catch (err) {
    console.error('[PUT /api/portal/board]', err);
    return NextResponse.json({ error: 'Failed to save board' }, { status: 500 });
  }
}
