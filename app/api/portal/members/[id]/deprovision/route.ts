import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// ─── helpers (mirror /api/portal/members/[id]/provision) ───
async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded;
}

async function getMemberRole(uid: string) {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.exists ? (snap.data()?.role as string) : null;
}

/**
 * POST /api/portal/members/[id]/deprovision
 *
 * Suspend an EXISTING member's provisioned Google Workspace org account. This
 * SUSPENDS the account (reversible in the Google Admin console — the account,
 * data, and history are preserved and the seat can be reclaimed); it does NOT
 * delete it. On success we also clear the portal's `orgEmail` pointer so the UI
 * reflects "no org account" — the member reappears in the "needs org email"
 * list and can be re-provisioned later with `{force:true}`. The login `email`
 * and `personalEmail` are never touched. Board / treasurer / president only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-members-deprovision'), {
    max: 10,
    windowSec: 60,
  });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    // ── Auth: board / treasurer / president only ──
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (!role || !['president', 'board', 'treasurer'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // ── Member must exist ──
    const memberRef = adminDb.collection('members').doc(id);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = memberDoc.data() || {};

    // ── Config guard ──
    const { isDirectoryConfigured, suspendWorkspaceUser } = await import('@/lib/google/directory');
    if (!isDirectoryConfigured()) {
      return NextResponse.json(
        { error: 'Workspace provisioning is not configured on the server.' },
        { status: 503 },
      );
    }

    // ── Must have an org account to suspend ──
    const orgEmail = (member.orgEmail || '').toString().trim();
    if (!orgEmail) {
      return NextResponse.json(
        { error: 'This member has no org account to suspend.' },
        { status: 400 },
      );
    }

    // ── Suspend the Workspace account (do NOT modify the member doc on failure) ──
    try {
      await suspendWorkspaceUser(orgEmail);
    } catch (suspendErr: any) {
      console.error('Workspace suspension failed:', suspendErr);
      return NextResponse.json(
        { error: `Failed to suspend the Workspace account: ${suspendErr?.message || 'unknown error'}` },
        { status: 502 },
      );
    }

    const now = new Date().toISOString();

    // ── Persist (clear the orgEmail pointer; login `email`/`personalEmail` untouched) ──
    await memberRef.update({
      orgEmail: '',
      provisioning: {
        workspace: 'suspended',
        orgEmail,
        suspendedAt: now,
        suspendedBy: decoded.uid,
      },
      updatedAt: now,
    });

    return NextResponse.json({ success: true, suspendedEmail: orgEmail });
  } catch (error: any) {
    console.error('Error deprovisioning member:', error);
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to deprovision member' }, { status: 500 });
  }
}
