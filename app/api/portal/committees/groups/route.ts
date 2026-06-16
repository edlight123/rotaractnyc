/**
 * Committee group emails — provisioning (board/president only).
 *
 *  GET  /api/portal/committees/groups
 *    Returns groups connection status + per-committee group state (whether each
 *    committee has a Google Group yet). Read-only; safe to poll from the UI.
 *
 *  POST /api/portal/committees/groups
 *    Idempotently creates a Google Group for each active committee and stores
 *    its address on the committee doc as `groupEmail`. Creates EMPTY groups —
 *    members are NOT added (auto-add is a separate, deliberate step).
 *    Body (optional): { committeeId?: string } to provision a single committee.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { SITE } from '@/lib/constants';
import {
  isGroupsConfigured,
  checkGroupsConnection,
  committeeGroupEmail,
  ensureGroup,
} from '@/lib/google/groups';

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

// ─── GET: status overview ───
export async function GET() {
  const auth = await requireBoard();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const connection = await checkGroupsConnection();
  const snapshot = await adminDb.collection('committees').orderBy('name', 'asc').get();
  const committees = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      slug: data.slug,
      status: data.status,
      groupEmail: data.groupEmail || null,
      // The address it WOULD get, for preview before provisioning.
      proposedGroupEmail: connection.domain ? committeeGroupEmail(data.slug) : null,
    };
  });

  return NextResponse.json({
    configured: connection.configured,
    connected: connection.ok,
    domain: connection.domain || null,
    ...(connection.error ? { error: connection.error } : {}),
    committees,
  });
}

// ─── POST: create groups (empty) ───
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'committee-groups'), { max: 5, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  const auth = await requireBoard();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isGroupsConfigured()) {
    return NextResponse.json(
      { error: 'Workspace group management is not configured on the server.' },
      { status: 503 },
    );
  }

  let committeeId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    committeeId = typeof body?.committeeId === 'string' ? body.committeeId : undefined;
  } catch {
    /* no body — provision all */
  }

  // Gather target committees (all active, or a single one).
  let docs;
  if (committeeId) {
    const doc = await adminDb.collection('committees').doc(committeeId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }
    docs = [doc];
  } else {
    const snapshot = await adminDb
      .collection('committees')
      .where('status', '==', 'active')
      .get();
    docs = snapshot.docs;
  }

  const results: Array<{ id: string; name: string; groupEmail?: string; created?: boolean; skipped?: boolean; error?: string }> = [];

  for (const doc of docs) {
    const data = doc.data() || {};
    const name = data.name as string;
    const slug = data.slug as string;
    const email = committeeGroupEmail(slug);
    try {
      const { group, created } = await ensureGroup({
        email,
        name: `${SITE.shortName} — ${name}`,
        description: `${name} committee distribution list.`,
      });
      // Persist the group address on the committee. No members are added.
      await doc.ref.update({ groupEmail: group.email, updatedAt: new Date().toISOString() });
      results.push({ id: doc.id, name, groupEmail: group.email, created });
    } catch (err: any) {
      const reason = err?.response?.data?.error?.message || err?.message || 'unknown error';
      console.error(`Group provisioning failed for committee ${name}:`, reason);
      results.push({ id: doc.id, name, error: reason });
    }
  }

  const createdCount = results.filter((r) => r.created).length;
  const existedCount = results.filter((r) => r.groupEmail && !r.created).length;
  const failedCount = results.filter((r) => r.error).length;

  return NextResponse.json({
    summary: { created: createdCount, existed: existedCount, failed: failedCount, total: results.length },
    results,
  });
}
