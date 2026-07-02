import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Past Boards
 * ───────────
 * `pastBoards` collection — one doc per Rotary year, keyed by the year slug
 * (e.g. "2025-2026") so re-archiving a year overwrites instead of duplicating:
 *   { year: '2025-2026', members: [{ name, title, photoURL? }], createdAt, createdBy }
 *
 * Shown on the portal Board Manager and the public /leadership page.
 */

async function requireAuth(minRoles?: string[]) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const doc = await adminDb.collection('members').doc(uid).get();
    const member = doc.data();
    if (!member) return null;
    if (minRoles && !minRoles.includes(member.role)) return null;
    return { uid, member };
  } catch {
    return null;
  }
}

// GET — list all past boards (any signed-in member), newest year first
export async function GET() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snap = await adminDb.collection('pastBoards').get();
    const boards = snap.docs
      .map((d) => serializeDoc({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => String(b.year).localeCompare(String(a.year)));
    return NextResponse.json({ boards });
  } catch (error) {
    console.error('Error fetching past boards:', error);
    return NextResponse.json({ error: 'Failed to fetch past boards' }, { status: 500 });
  }
}

// POST — create/overwrite a past board year (board+).
// Body: { year: '2025-2026', members?: [{name,title,photoURL?}], archiveCurrent?: boolean }
// With archiveCurrent, the CURRENT roster is snapshotted server-side.
export async function POST(request: NextRequest) {
  const rl = await rateLimit(getRateLimitKey(request, 'past-boards'), { max: 10, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const auth = await requireAuth(['board', 'treasurer', 'president']);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const year = String(body.year || '').trim();
    if (!/^\d{4}-\d{4}$/.test(year)) {
      return NextResponse.json({ error: 'Year must look like "2025-2026"' }, { status: 400 });
    }

    let members: Array<{ name: string; title: string; photoURL?: string }> = [];

    if (body.archiveCurrent) {
      // Snapshot the live roster (same query the public leadership page uses)
      const snap = await adminDb
        .collection('members')
        .where('role', 'in', ['board', 'president', 'treasurer'])
        .where('status', '==', 'active')
        .get();
      members = snap.docs
        .map((d) => {
          const m = d.data();
          return {
            name: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim(),
            title:
              m.boardTitle ||
              (m.role === 'president' ? 'President' : m.role === 'treasurer' ? 'Treasurer' : 'Board Member'),
            photoURL: m.photoURL || '',
            order: m.boardOrder ?? 999,
          };
        })
        .sort((a, b) => (a as any).order - (b as any).order)
        .map(({ name, title, photoURL }) => ({ name, title, photoURL }));
    } else if (Array.isArray(body.members)) {
      members = body.members
        .filter((m: any) => m && typeof m.name === 'string' && m.name.trim())
        .map((m: any) => ({
          name: String(m.name).trim(),
          title: String(m.title || 'Board Member').trim(),
          photoURL: typeof m.photoURL === 'string' ? m.photoURL : '',
        }));
    }

    if (members.length === 0) {
      return NextResponse.json({ error: 'No members to archive' }, { status: 400 });
    }

    await adminDb.collection('pastBoards').doc(year).set({
      year,
      members,
      createdAt: new Date().toISOString(),
      createdBy: auth.uid,
    });

    revalidatePath('/leadership');
    return NextResponse.json({ success: true, year, count: members.length });
  } catch (error) {
    console.error('Error saving past board:', error);
    return NextResponse.json({ error: 'Failed to save past board' }, { status: 500 });
  }
}

// DELETE — remove a past board year (president only): ?year=2025-2026
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(['president']);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    if (!year) return NextResponse.json({ error: 'Missing year' }, { status: 400 });

    await adminDb.collection('pastBoards').doc(year).delete();
    revalidatePath('/leadership');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting past board:', error);
    return NextResponse.json({ error: 'Failed to delete past board' }, { status: 500 });
  }
}
