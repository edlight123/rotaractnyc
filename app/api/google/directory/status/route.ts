/**
 * GET /api/google/directory/status
 *
 * Admin-only diagnostics for Workspace user provisioning. Reports whether the
 * env vars are set and whether Domain-Wide Delegation actually works (makes a
 * minimal authenticated Directory call), plus the domain so the add-member UI
 * can preview `first.last@domain` org emails.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { checkDirectoryConnection } from '@/lib/google/directory';
import { checkGroupsConnection } from '@/lib/google/groups';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const memberSnap = await adminDb.collection('members').doc(uid).get();
    const member = memberSnap.exists ? (memberSnap.data() as any) : null;
    if (!member || !['board', 'president', 'treasurer'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [status, groups] = await Promise.all([
      checkDirectoryConnection(),
      checkGroupsConnection(),
    ]);
    return NextResponse.json({
      configured: status.configured,
      ok: status.ok,
      domain: status.domain || null,
      slackInviteConfigured: !!process.env.SLACK_INVITE_URL,
      ...(status.error ? { error: status.error } : {}),
      groups: {
        configured: groups.configured,
        ok: groups.ok,
        ...(groups.error ? { error: groups.error } : {}),
      },
    });
  } catch (error) {
    console.error('[GET /api/google/directory/status]', error);
    return NextResponse.json(
      { configured: false, ok: false, error: 'Failed to check directory status' },
      { status: 500 },
    );
  }
}
