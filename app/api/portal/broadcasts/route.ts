/**
 * Broadcast email API for board members.
 *
 * GET  — List sent broadcasts (most recent first)
 * POST — Send a new broadcast to a segment of members and/or confirmed
 *        newsletter subscribers, optionally announcing an event.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { randomUUID } from 'crypto';
import { sendBulkEmail, sendEmail } from '@/lib/email/send';
import { wrapTemplate, eventAnnouncementCard } from '@/lib/email/templates';
import { resolveVenueVisibility } from '@/lib/utils/eventGating';
import { SITE } from '@/lib/constants';
import { FieldValue } from 'firebase-admin/firestore';
import { notifyBroadcast } from '@/lib/notifications';

// ─── Constants ─────────────────────────────────────────────────────────────

const BOARD_ROLES = ['board', 'president', 'treasurer'];
const VALID_SEGMENTS = ['all', 'unpaid', 'board', 'committee', 'subscribers', 'everyone'] as const;
type Segment = (typeof VALID_SEGMENTS)[number];

/** Segments that reach newsletter subscribers, i.e. people outside the club. */
const SUBSCRIBER_SEGMENTS: Segment[] = ['subscribers', 'everyone'];

// Subscribers each need their own unsubscribe link, so they can't share a
// batch request. Keep the request rate under Resend's per-second limit.
const SUBSCRIBER_CHUNK_SIZE = 2;
const SUBSCRIBER_CHUNK_DELAY_MS = 1000;

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

  let body: { subject: string; body: string; segment: Segment; committeeId?: string; eventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { subject, body: rawBody, segment, committeeId, eventId } = body;

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
  if (eventId !== undefined && (typeof eventId !== 'string' || eventId.length === 0)) {
    return NextResponse.json({ error: 'Invalid eventId.' }, { status: 400 });
  }

  const includesSubscribers = SUBSCRIBER_SEGMENTS.includes(segment);

  try {
    // ── Load the announced event, if any ──

    let event: FirebaseFirestore.DocumentData | null = null;
    if (eventId) {
      const eventDoc = await adminDb.collection('events').doc(eventId).get();
      if (!eventDoc.exists) {
        return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
      }
      event = eventDoc.data()!;
      if (event.status !== 'published') {
        return NextResponse.json(
          { error: 'Only published events can be announced.' },
          { status: 400 },
        );
      }
      // Subscribers can only open the public event page, so a members-only
      // event would send them to a page they can't see.
      if (includesSubscribers && !event.isPublic) {
        return NextResponse.json(
          { error: 'This event is members-only, so it can’t be sent to newsletter subscribers.' },
          { status: 400 },
        );
      }
    }

    // ── Build member recipient list based on segment ──

    let memberDocs: FirebaseFirestore.QueryDocumentSnapshot[];

    if (segment === 'subscribers') {
      memberDocs = [];
    } else if (segment === 'all' || segment === 'everyone') {
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

    // ── Confirmed newsletter subscribers ──
    // Anyone who is also a member is skipped: they get the member email (or
    // opted out of announcements, which must not be undone by the newsletter).

    let subscribers: { ref: FirebaseFirestore.DocumentReference; email: string; unsubscribeToken: string }[] = [];
    if (includesSubscribers) {
      const memberEmails = new Set(
        memberDocs.map((d) => String(d.data().email || '').toLowerCase()).filter(Boolean),
      );
      if (segment === 'subscribers') {
        // Members aren't loaded for this segment, so look them up to dedupe.
        const allMembers = await adminDb.collection('members').get();
        allMembers.docs.forEach((d) => {
          const email = String(d.data().email || '').toLowerCase();
          if (email) memberEmails.add(email);
        });
      }

      const subSnap = await adminDb
        .collection('newsletter_subscribers')
        .where('confirmed', '==', true)
        .get();

      const missingTokens = adminDb.batch();
      let missingCount = 0;
      subscribers = subSnap.docs
        .filter((d) => d.data().email && !memberEmails.has(String(d.data().email).toLowerCase()))
        .map((d) => {
          let unsubscribeToken = d.data().unsubscribeToken as string | undefined;
          if (!unsubscribeToken) {
            // Subscribers who confirmed before unsubscribe links existed.
            unsubscribeToken = randomUUID();
            missingTokens.update(d.ref, { unsubscribeToken });
            missingCount++;
          }
          return { ref: d.ref, email: d.data().email as string, unsubscribeToken };
        });
      if (missingCount > 0) await missingTokens.commit();
    }

    if (recipients.length === 0 && subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No eligible recipients found (all opted out or no matching members).' },
        { status: 400 },
      );
    }

    // ── Build email HTML ──

    const formattedBody = formatBody(rawBody);
    const safeSubject = escapeHtml(subject);
    const heading = `
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px; font-weight: 700;">
        ${safeSubject}
      </h2>
      <div style="color: #374151; font-size: 15px; line-height: 1.7;">
        ${formattedBody}
      </div>
    `;

    // Members see the event in the portal with its venue; subscribers get the
    // public page and only see the venue if it's public.
    const memberCard = event
      ? eventAnnouncementCard(
          { title: event.title, date: event.date, time: event.time, location: event.location },
          { href: `${SITE.url}/portal/events/${encodeURIComponent(eventId!)}`, showVenue: true },
        )
      : null;
    const subscriberCard = event
      ? eventAnnouncementCard(
          { title: event.title, date: event.date, time: event.time, location: event.location },
          {
            href: `${SITE.url}/events/${encodeURIComponent(event.slug)}`,
            showVenue: resolveVenueVisibility({
              type: event.type,
              venueVisibility: event.venueVisibility,
            }) === 'public',
          },
        )
      : null;

    let memberResult: { sent: number; failed: number; total: number; failedRecipients: string[] } =
      { sent: 0, failed: 0, total: 0, failedRecipients: [] };
    if (recipients.length > 0) {
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
        ${heading}
        ${memberCard?.html || ''}
        ${unsubscribeFooter}
      `);

      const plainText = rawBody
        + (memberCard ? `\n\n${memberCard.text}` : '')
        + `\n\n---\nManage preferences: ${SITE.url}/portal/settings`;

      memberResult = await sendBulkEmail(recipients, subject.trim(), emailHtml, plainText);
    }

    // ── Send to subscribers, one at a time so each gets their own unsubscribe link ──

    const failedSubscribers: string[] = [];
    for (let i = 0; i < subscribers.length; i += SUBSCRIBER_CHUNK_SIZE) {
      const chunk = subscribers.slice(i, i + SUBSCRIBER_CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map((s) => {
          const unsubscribeUrl = `${SITE.url}/api/newsletter/unsubscribe?token=${encodeURIComponent(s.unsubscribeToken)}`;
          const html = wrapTemplate(`
            ${heading}
            ${subscriberCard?.html || ''}
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                You're receiving this because you subscribed to the ${SITE.shortName} newsletter.
                <a href="${unsubscribeUrl}" style="color: #9B1B30; text-decoration: underline;">
                  Unsubscribe
                </a>
              </p>
            </div>
          `);
          const text = rawBody
            + (subscriberCard ? `\n\n${subscriberCard.text}` : '')
            + `\n\n---\nUnsubscribe: ${unsubscribeUrl}`;
          return sendEmail({
            to: s.email,
            subject: subject.trim(),
            html,
            text,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });
        }),
      );
      results.forEach((r, j) => {
        if (r.status !== 'fulfilled' || !r.value.success) failedSubscribers.push(chunk[j].email);
      });
      if (i + SUBSCRIBER_CHUNK_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, SUBSCRIBER_CHUNK_DELAY_MS));
      }
    }

    const recipientCount = recipients.length + subscribers.length;
    const failedCount = memberResult.failed + failedSubscribers.length;

    // ── Save broadcast record ──

    const broadcastRef = await adminDb.collection('broadcasts').add({
      subject: subject.trim(),
      body: rawBody,
      segment,
      ...(committeeId && { committeeId }),
      ...(eventId && event && { eventId, eventTitle: event.title }),
      recipientCount,
      memberCount: recipients.length,
      subscriberCount: subscribers.length,
      failedCount,
      // Who didn't get it, so the board can follow up without re-sending to everyone.
      ...(failedCount > 0 && { failedRecipients: [...memberResult.failedRecipients, ...failedSubscribers] }),
      sentBy: sender.uid,
      sentByName: sender.name,
      sentAt: FieldValue.serverTimestamp(),
    });

    // ── Companion push notification (best-effort, non-blocking) ──
    // Mirrors the email blast so members who don't check email still see it.
    // Per-member push opt-outs are honoured inside notifyBroadcast.
    if (memberUids.length > 0) {
      (async () => {
        try {
          await notifyBroadcast({
            subject: subject.trim(),
            recipientUids: memberUids,
            broadcastId: broadcastRef.id,
          });
        } catch (err) {
          console.warn('[push] broadcast fan-out failed:', err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      recipientCount,
      memberCount: recipients.length,
      subscriberCount: subscribers.length,
      failedCount,
    });
  } catch (err) {
    console.error('[POST /api/portal/broadcasts]', err);
    return NextResponse.json(
      { error: 'Failed to send broadcast.' },
      { status: 500 },
    );
  }
}
