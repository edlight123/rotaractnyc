/**
 * Broadcast email API for board members.
 *
 * GET  — List sent broadcasts (most recent first)
 * POST — Send a new broadcast to a filtered segment of members
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendBulkEmail } from '@/lib/email/send';
import { wrapTemplate } from '@/lib/email/templates';
import { SITE } from '@/lib/constants';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Constants ─────────────────────────────────────────────────────────────

const BOARD_ROLES = ['board', 'president', 'treasurer'];
const VALID_SEGMENTS = ['all', 'unpaid', 'board', 'committee'] as const;
type Segment = (typeof VALID_SEGMENTS)[number];

// ─── Auth helper ───────────────────────────────────────────────────────────

async function getAuthenticatedBoard() {
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
  if (!BOARD_ROLES.includes(member.role)) {
    throw { status: 403, message: 'Only board members can manage broadcasts.' };
  }

  return {
    uid,
    name: member.name || member.firstName
      ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
      : 'Board Member',
    role: member.role as string,
  };
}

// ─── Markdown-ish formatting helper ────────────────────────────────────────

function formatBody(raw: string): string {
  return raw
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Newlines → <br>
    .replace(/\n/g, '<br>');
}

// ─── GET /api/portal/broadcasts ────────────────────────────────────────────

export async function GET() {
  try {
    await getAuthenticatedBoard();
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status: err.status || 401 },
    );
  }

  try {
    const snap = await adminDb
      .collection('broadcasts')
      .orderBy('sentAt', 'desc')
      .limit(20)
      .get();

    const broadcasts = snap.docs.map((doc) => ({
      id: doc.id,
      ...serializeDoc(doc.data()),
    }));

    return NextResponse.json({ broadcasts });
  } catch (err) {
    console.error('[GET /api/portal/broadcasts]', err);
    return NextResponse.json(
      { error: 'Failed to load broadcasts.' },
      { status: 500 },
    );
  }
}

// ─── POST /api/portal/broadcasts ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit: 2 broadcasts per 60 seconds
  const rlResult = await rateLimit(
    getRateLimitKey(request, 'portal-broadcast'),
    { max: 2, windowSec: 60 },
  );
  if (!rlResult.allowed) return rateLimitResponse(rlResult.resetAt);

  let sender: { uid: string; name: string };
  try {
    sender = await getAuthenticatedBoard();
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized' },
      { status: err.status || 401 },
    );
  }

  // ── Parse & validate body ──

  let body: { subject: string; body: string; segment: Segment; committeeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { subject, body: rawBody, segment, committeeId } = body;

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
  }
  if (!rawBody || typeof rawBody !== 'string' || rawBody.trim().length === 0) {
    return NextResponse.json({ error: 'Body is required.' }, { status: 400 });
  }
  if (!VALID_SEGMENTS.includes(segment)) {
    return NextResponse.json(
      { error: `Invalid segment. Must be one of: ${VALID_SEGMENTS.join(', ')}` },
      { status: 400 },
    );
  }
  if (segment === 'committee' && (!committeeId || typeof committeeId !== 'string')) {
    return NextResponse.json(
      { error: 'committeeId is required for committee segment.' },
      { status: 400 },
    );
  }

  try {
    // ── Build recipient list based on segment ──

    let memberDocs: FirebaseFirestore.QueryDocumentSnapshot[];

    if (segment === 'all') {
      const snap = await adminDb
        .collection('members')
        .where('status', '==', 'active')
        .get();
      memberDocs = snap.docs;
    } else if (segment === 'unpaid') {
      // Active members with unpaid dues in the current cycle
      const snap = await adminDb
        .collection('members')
        .where('status', '==', 'active')
        .where('duesPaid', '==', false)
        .get();
      memberDocs = snap.docs;
    } else if (segment === 'board') {
      const snap = await adminDb
        .collection('members')
        .where('status', '==', 'active')
        .where('role', 'in', BOARD_ROLES)
        .get();
      memberDocs = snap.docs;
    } else {
      // committee — members belonging to a specific committee
      const committeeDoc = await adminDb.collection('committees').doc(committeeId!).get();
      if (!committeeDoc.exists) {
        return NextResponse.json({ error: 'Committee not found.' }, { status: 404 });
      }
      const committeeData = committeeDoc.data()!;
      const memberIds: string[] = committeeData.members || [];

      if (memberIds.length === 0) {
        return NextResponse.json({ error: 'Committee has no members.' }, { status: 400 });
      }

      // Firestore 'in' queries support max 30 items; chunk if needed
      const chunks: string[][] = [];
      for (let i = 0; i < memberIds.length; i += 30) {
        chunks.push(memberIds.slice(i, i + 30));
      }

      memberDocs = [];
      for (const chunk of chunks) {
        const snap = await adminDb
          .collection('members')
          .where('__name__', 'in', chunk)
          .where('status', '==', 'active')
          .get();
        memberDocs.push(...snap.docs);
      }
    }

    // ── Filter out members who opted out of announcements ──

    const memberUids = memberDocs.map((d) => d.id);
    const optOutUids = new Set<string>();

    // Fetch notification_preferences in chunks of 30
    for (let i = 0; i < memberUids.length; i += 30) {
      const chunk = memberUids.slice(i, i + 30);
      const prefSnap = await adminDb
        .collection('notification_preferences')
        .where('__name__', 'in', chunk)
        .where('announcements', '==', false)
        .get();
      prefSnap.docs.forEach((d) => optOutUids.add(d.id));
    }

    const recipients = memberDocs
      .filter((d) => !optOutUids.has(d.id))
      .map((d) => {
        const data = d.data();
        return data.email as string;
      })
      .filter(Boolean);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No eligible recipients found (all opted out or no matching members).' },
        { status: 400 },
      );
    }

    // ── Build email HTML ──

    const formattedBody = formatBody(rawBody);
    const unsubscribeFooter = `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          You're receiving this because you're a member of ${SITE.shortName}.
          <a href="${SITE.url}/portal/settings" style="color: #9B1B30; text-decoration: underline;">
            Manage notification preferences
          </a>
        </p>
      </div>
    `;

    const emailHtml = wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px; font-weight: 700;">
        ${subject.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </h2>
      <div style="color: #374151; font-size: 15px; line-height: 1.7;">
        ${formattedBody}
      </div>
      ${unsubscribeFooter}
    `);

    const plainText = rawBody + `\n\n---\nManage preferences: ${SITE.url}/portal/settings`;

    // ── Send ──

    await sendBulkEmail(recipients, subject.trim(), emailHtml, plainText);

    // ── Save broadcast record ──

    await adminDb.collection('broadcasts').add({
      subject: subject.trim(),
      body: rawBody,
      segment,
      ...(committeeId && { committeeId }),
      recipientCount: recipients.length,
      sentBy: sender.uid,
      sentByName: sender.name,
      sentAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, recipientCount: recipients.length });
  } catch (err) {
    console.error('[POST /api/portal/broadcasts]', err);
    return NextResponse.json(
      { error: 'Failed to send broadcast.' },
      { status: 500 },
    );
  }
}
