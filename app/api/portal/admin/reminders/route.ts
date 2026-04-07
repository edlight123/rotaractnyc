/**
 * Admin API for viewing and manually triggering automated reminders.
 *
 * GET  — Fetch recent cron activity logs (dues, event, welcome reminders)
 * POST — Manually trigger a specific reminder cron job
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

const CRON_ACTIONS = [
  'dues_reminder_cron',
  'event_reminder_cron',
  'welcome_sequence_cron',
] as const;

const CRON_ENDPOINTS: Record<string, string> = {
  dues: '/api/cron/dues-reminders',
  events: '/api/cron/event-reminders',
  welcome: '/api/cron/welcome-sequence',
};

// ─── Auth helper ───────────────────────────────────────────────────────────

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) {
    throw { status: 401, message: 'Unauthorized — please sign in.' };
  }

  const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

  const memberDoc = await adminDb.collection('members').doc(uid).get();
  if (!memberDoc.exists) {
    throw { status: 403, message: 'Member profile not found.' };
  }

  const member = memberDoc.data()!;
  if (!ADMIN_ROLES.includes(member.role)) {
    throw { status: 403, message: 'You do not have permission to access admin reminders.' };
  }

  return { uid, member };
}

// ─── GET — Fetch recent reminder activity logs ─────────────────────────────

export async function GET() {
  try {
    await getAuthenticatedAdmin();
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status: err.status || 401 },
    );
  }

  try {
    const snap = await adminDb
      .collection('activity_logs')
      .where('action', 'in', [...CRON_ACTIONS])
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const logs = snap.docs.map((doc) => ({
      id: doc.id,
      ...serializeDoc(doc.data()),
    }));

    return NextResponse.json({ logs });
  } catch (err) {
    console.error('[admin/reminders] Error fetching logs:', err);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs.' },
      { status: 500 },
    );
  }
}

// ─── POST — Manually trigger a reminder cron ───────────────────────────────

export async function POST(request: NextRequest) {
  let uid: string;
  try {
    const auth = await getAuthenticatedAdmin();
    uid = auth.uid;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status: err.status || 401 },
    );
  }

  // Rate limit: 2 requests per 60 seconds
  const rlKey = getRateLimitKey(request, 'admin-reminders');
  const rl = await rateLimit(rlKey, { max: 2, windowSec: 60 });
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetAt);
  }

  let body: { type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { type } = body;
  if (!type || !CRON_ENDPOINTS[type]) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${Object.keys(CRON_ENDPOINTS).join(', ')}` },
      { status: 400 },
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server.' },
      { status: 500 },
    );
  }

  try {
    // Build the absolute URL for the internal fetch
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const cronResponse = await fetch(`${baseUrl}${CRON_ENDPOINTS[type]}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const result = await cronResponse.json();

    if (!cronResponse.ok) {
      return NextResponse.json(
        { error: result.error || 'Cron endpoint returned an error.', details: result },
        { status: cronResponse.status },
      );
    }

    return NextResponse.json({
      success: true,
      type,
      triggeredBy: uid,
      result,
    });
  } catch (err) {
    console.error(`[admin/reminders] Error triggering ${type} cron:`, err);
    return NextResponse.json(
      { error: 'Failed to trigger reminder cron.' },
      { status: 500 },
    );
  }
}
