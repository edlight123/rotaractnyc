/**
 * Committee group emails — MEMBER SYNC (board/president only).
 *
 *  POST /api/portal/committees/groups/sync
 *    Body (optional): { committeeId?: string }
 *
 *  Makes each committee's Google Group mirror its portal roster:
 *    - roster members missing from the group are ADDED (silently — the Admin
 *      SDK direct-add sends no invitation email),
 *    - chair / co-chair are added as group MANAGERs,
 *    - group members who are portal members but NOT on the roster anymore are
 *      REMOVED. Addresses the portal doesn't know (external people added by
 *      hand, the workspace admin) are left untouched.
 *
 *  The portal roster is the source of truth for portal members only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { addGroupMember, removeGroupMember, listGroupMembers } from '@/lib/google/groups';

export const dynamic = 'force-dynamic';

async function requireBoard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return { error: 'Unauthorized', status: 401 as const };
  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return { error: 'Session expired', status: 401 as const };
  }
  const snap = await adminDb.collection('members').doc(uid).get();
  const role = snap.exists ? (snap.data()?.role as string) : null;
  if (!role || !['president', 'board'].includes(role)) {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { uid };
}

interface CommitteeSyncResult {
  id: string;
  name: string;
  groupEmail: string | null;
  added: number;
  removed: number;
  unchanged: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  const rl = await rateLimit(getRateLimitKey(request, 'groups-sync'), { max: 5, windowSec: 60 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const auth = await requireBoard();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const onlyCommitteeId: string | undefined = body.committeeId;

    // All portal members once — id → email, plus the set of every known
    // portal email (so removals never touch external/manual addresses).
    const membersSnap = await adminDb.collection('members').get();
    const emailById = new Map<string, string>();
    const portalEmails = new Set<string>();
    membersSnap.docs.forEach((d) => {
      const email = String(d.data().email || '').toLowerCase();
      if (!email) return;
      emailById.set(d.id, email);
      portalEmails.add(email);
    });

    // Never remove the impersonated workspace admin from a group.
    const adminEmail = String(process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || '').toLowerCase();

    const committeesSnap = await adminDb.collection('committees').get();

    const results: CommitteeSyncResult[] = [];

    for (const doc of committeesSnap.docs) {
      const c = doc.data();
      if (onlyCommitteeId && doc.id !== onlyCommitteeId) continue;
      if (c.status && c.status !== 'active') continue;

      const groupEmail: string | null = c.groupEmail || null;
      const result: CommitteeSyncResult = {
        id: doc.id,
        name: c.name || doc.id,
        groupEmail,
        added: 0,
        removed: 0,
        unchanged: 0,
        errors: [],
      };
      results.push(result);

      if (!groupEmail) {
        result.errors.push('No group email yet — create the group first.');
        continue;
      }

      try {
        // Desired state from the roster (chair/co-chair become MANAGERs)
        const desired = new Map<string, 'MANAGER' | 'MEMBER'>();
        for (const memberId of (c.memberIds || []) as string[]) {
          const email = emailById.get(memberId);
          if (email) desired.set(email, 'MEMBER');
        }
        for (const chairId of [c.chairId, c.coChairId]) {
          if (!chairId) continue;
          const email = emailById.get(chairId);
          if (email) desired.set(email, 'MANAGER');
        }

        const current = new Set(
          (await listGroupMembers(groupEmail)).map((e) => e.toLowerCase()),
        );

        // Add / upgrade missing roster members
        for (const [email, role] of Array.from(desired.entries())) {
          if (current.has(email)) {
            result.unchanged++;
            continue;
          }
          try {
            await addGroupMember(groupEmail, email, role);
            result.added++;
          } catch (err: any) {
            result.errors.push(`add ${email}: ${err?.response?.data?.error?.message || err?.message || 'failed'}`);
          }
        }

        // Remove portal members who left the committee. External addresses
        // and the workspace admin are never touched.
        for (const email of Array.from(current)) {
          if (desired.has(email)) continue;
          if (!portalEmails.has(email)) continue; // not ours to manage
          if (email === adminEmail) continue;
          try {
            await removeGroupMember(groupEmail, email);
            result.removed++;
          } catch (err: any) {
            result.errors.push(`remove ${email}: ${err?.response?.data?.error?.message || err?.message || 'failed'}`);
          }
        }
      } catch (err: any) {
        result.errors.push(err?.response?.data?.error?.message || err?.message || 'Sync failed');
      }
    }

    const summary = {
      committees: results.length,
      added: results.reduce((s, r) => s + r.added, 0),
      removed: results.reduce((s, r) => s + r.removed, 0),
      unchanged: results.reduce((s, r) => s + r.unchanged, 0),
      failed: results.filter((r) => r.errors.length > 0).length,
    };

    return NextResponse.json({ summary, results });
  } catch (err) {
    console.error('[POST /api/portal/committees/groups/sync]', err);
    return NextResponse.json({ error: 'Failed to sync group members' }, { status: 500 });
  }
}
