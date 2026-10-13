import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { getCurrentRotaryYear } from '@/lib/utils/rotaryYear';
import { boardTitleFor, renderZoomBackground, zoomBackgroundFilename } from '@/lib/zoomBackground/render';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BOARD_ROLES = ['board', 'president', 'treasurer'];

/**
 * GET /api/portal/zoom-background — the signed-in board member's own Zoom
 * background, built from their member record. `?download=1` serves it as an
 * attachment.
 */
export async function GET(request: NextRequest) {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    ({ uid } = await adminAuth.verifySessionCookie(sessionCookie, true));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snap = await adminDb.collection('members').doc(uid).get();
  const m = snap.data();
  if (!m || m.status !== 'active' || !BOARD_ROLES.includes(m.role)) {
    return NextResponse.json({ error: 'Zoom backgrounds are for board members' }, { status: 403 });
  }

  const name = m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim();
  const image = await renderZoomBackground({
    name,
    title: boardTitleFor(m),
    rotaryYear: getCurrentRotaryYear().replace('-', '–'),
  });

  const headers = new Headers(image.headers);
  headers.set('Cache-Control', 'private, no-store');
  if (request.nextUrl.searchParams.get('download')) {
    headers.set('Content-Disposition', `attachment; filename="${zoomBackgroundFilename(name)}"`);
  }
  return new Response(image.body, { status: 200, headers });
}
