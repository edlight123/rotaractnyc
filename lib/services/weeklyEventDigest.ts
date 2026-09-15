/**
 * Weekly Event Digest service.
 *
 * Run every Monday morning by /api/cron/weekly-event-digest. Builds a single
 * digest email per board recipient (role in board|president|treasurer) with:
 *
 *   • Upcoming events in the next 30 days, with RSVP / ticket / revenue
 *     deltas vs. the last digest run.
 *   • Post-event recaps for events that ended in the previous 7 days
 *     (sent at most once per event via `digest_snapshots/{eventId}.recapSent`).
 *   • Attendee-roster PDFs attached for events happening within 14 days.
 *
 * Snapshot strategy (per event in `digest_snapshots/{eventId}`):
 *   {
 *     currentCounts:  { ... }    // counts as of latest run
 *     previousCounts: { ... }    // counts as of run-before-latest (used for delta)
 *     lastSentAt:     ISO string
 *     lastIsoWeek:    "2026-W18"
 *     recapSent:      boolean    // post-event recap delivered
 *   }
 */
import { adminDb } from '@/lib/firebase/admin';
import { getEventAttendees, type AttendeeTotals } from './eventAttendees';
import { renderEventAttendeesPDF } from '@/lib/pdf/renderEventAttendeesPDF';
import { sendEmail } from '@/lib/email/send';
import {
  weeklyEventDigestEmail,
  type DigestEventRow,
} from '@/lib/email/templates';
import { splitDigestRows, DIGEST_PARTNER_LIMIT } from '@/lib/services/digestPartners';
import { SITE } from '@/lib/constants';

// ── Tunables ────────────────────────────────────────────────────────────────

const UPCOMING_WINDOW_DAYS = 30;
const PDF_ATTACH_WINDOW_DAYS = 14;
const POST_EVENT_RECAP_WINDOW_DAYS = 7;
const BOARD_ROLES = ['board', 'president', 'treasurer'] as const;

// Recipients are board members (BOARD_ROLES + an opt-in), not the full
// roster — so the digest deliberately includes members-only and board-only
// events. Those paid Rotary Club of New York invitations are exactly what
// this audience needs to see.

// ── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

/** ISO 8601 week string ("2026-W18"). Used for snapshot bookkeeping/labels. */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
});

const weekLabelFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
});

function formatHumanDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return dateFmt.format(d);
}

function formatWeekLabel(now: Date): string {
  return `Week of ${weekLabelFmt.format(now)}`;
}

interface SnapshotCounts {
  totalAttendees: number;
  members: number;
  guests: number;
  tickets: number;
  revenueCents: number;
  checkedIn: number;
  /** Aggregate donations (denormalised on the event doc by the webhook). */
  donationsTotalCents: number;
  donationsCount: number;
}

function totalsToCounts(t: AttendeeTotals, donationsTotalCents = 0, donationsCount = 0): SnapshotCounts {
  return {
    totalAttendees: t.totalAttendees,
    members: t.members,
    guests: t.guests,
    tickets: t.tickets,
    revenueCents: t.revenueCents,
    checkedIn: t.checkedIn,
    donationsTotalCents,
    donationsCount,
  };
}

interface EventDoc {
  id: string;
  title: string;
  slug: string;
  date: string;       // ISO
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: string;
  status: string;
  visibility?: string;
  isPublic?: boolean;
  /** Who runs the event — absent on pre-2026-09 documents, meaning us. */
  host?: string;
  hostName?: string;
  /** Aggregate counters maintained transactionally by the Stripe webhook. */
  donationsTotalCents?: number;
  donationsCount?: number;
  acceptsDonations?: boolean;
}

// ── Main entry point ────────────────────────────────────────────────────────

export interface DigestRunResult {
  recipients: number;
  sent: number;
  failed: number;
  upcomingEvents: number;
  pastEvents: number;
  pdfsRendered: number;
  skipped: string[];
}

export interface RunDigestOptions {
  /** Inject a clock for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
  /** Skip writing snapshot updates (dry-run). */
  dryRun?: boolean;
}

export async function runWeeklyEventDigest(
  opts: RunDigestOptions = {},
): Promise<DigestRunResult> {
  const now = opts.now ?? new Date();
  const dryRun = !!opts.dryRun;

  // 1. Fetch upcoming-window events (date in [now - 7d, now + 30d]).
  //    We pull a wider range than just upcoming so we can also build
  //    post-event recaps for events that happened in the last week.
  const lowerBound = new Date(now.getTime() - POST_EVENT_RECAP_WINDOW_DAYS * 86_400_000);
  const upperBound = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 86_400_000);

  const eventsSnap = await adminDb
    .collection('events')
    .where('status', '==', 'published')
    .where('date', '>=', lowerBound.toISOString())
    .where('date', '<=', upperBound.toISOString())
    .get();

  const events: EventDoc[] = eventsSnap.docs.map((doc) => {
    const d = doc.data() as Partial<EventDoc>;
    return {
      id: doc.id,
      title: d.title || 'Untitled event',
      slug: d.slug || doc.id,
      date: d.date || '',
      endDate: d.endDate,
      time: d.time,
      endTime: d.endTime,
      location: d.location,
      status: d.status || 'published',
      visibility: d.visibility,
      isPublic: d.isPublic,
      donationsTotalCents: typeof d.donationsTotalCents === 'number' ? d.donationsTotalCents : 0,
      donationsCount: typeof d.donationsCount === 'number' ? d.donationsCount : 0,
      acceptsDonations: !!d.acceptsDonations,
    };
  });

  // 2. Compute per-event totals + delta + decide PDF attachment.
  const upcoming: DigestEventRow[] = [];
  const past: DigestEventRow[] = [];
  const pdfBuffers = new Map<string, Buffer>(); // eventId → PDF
  const eventTotalsById = new Map<string, AttendeeTotals>();
  let pdfsRendered = 0;

  for (const ev of events) {
    const eventDate = new Date(ev.date);
    if (isNaN(eventDate.getTime())) continue;
    const days = diffDays(eventDate, now);
    const isPastRecap = days < 0;

    const { totals, rows } = await getEventAttendees(ev.id);
    eventTotalsById.set(ev.id, totals);

    // Pull previous snapshot for delta + recap dedup
    const snapDoc = await adminDb.collection('digest_snapshots').doc(ev.id).get();
    const snap = snapDoc.exists ? snapDoc.data() as {
      currentCounts?: SnapshotCounts;
      previousCounts?: SnapshotCounts;
      recapSent?: boolean;
    } : {};

    // Delta = current vs. last run's snapshot.currentCounts
    const prev = snap.currentCounts;
    const donationsTotalCents = ev.donationsTotalCents ?? 0;
    const donationsCount = ev.donationsCount ?? 0;
    const delta = {
      rsvps: totals.totalAttendees - (prev?.totalAttendees ?? 0),
      tickets: totals.tickets - (prev?.tickets ?? 0),
      revenueCents: totals.revenueCents - (prev?.revenueCents ?? 0),
      donationsTotalCents: donationsTotalCents - (prev?.donationsTotalCents ?? 0),
      donationsCount: donationsCount - (prev?.donationsCount ?? 0),
    };

    // Skip recaps already sent
    if (isPastRecap && snap.recapSent) continue;

    // Decide whether to attach a PDF:
    //  - upcoming event ≤ 14 days away: always
    //  - upcoming event > 14 days away: only if there are RSVPs AND something changed
    //  - post-event recap: always
    let attachPdf = false;
    if (isPastRecap) {
      attachPdf = totals.totalAttendees > 0;
    } else if (days <= PDF_ATTACH_WINDOW_DAYS) {
      attachPdf = totals.totalAttendees > 0;
    } else {
      attachPdf =
        totals.totalAttendees > 0 &&
        (delta.rsvps !== 0 || delta.tickets !== 0 || delta.revenueCents !== 0);
    }

    if (attachPdf) {
      try {
        const pdf = await renderEventAttendeesPDF({
          eventTitle: ev.title,
          eventDate: formatHumanDate(ev.date),
          eventTime: ev.time
            ? `${ev.time}${ev.endTime ? ` – ${ev.endTime}` : ''}`
            : undefined,
          eventLocation: ev.location,
          generatedAt: now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
          rows: rows.map((r) => ({
            id: r.id,
            kind: r.kind,
            name: r.name,
            email: r.email,
            phone: r.phone,
            quantity: r.quantity,
            amountCents: r.amountCents,
            paymentStatus: r.paymentStatus,
            status: r.status,
            checkedIn: r.checkedIn,
            checkedInAt: r.checkedInAt,
          })),
          totals: {
            members: totals.members,
            guests: totals.guests,
            tickets: totals.tickets,
            revenueCents: totals.revenueCents,
            checkedIn: totals.checkedIn,
          },
        });
        pdfBuffers.set(ev.id, pdf);
        pdfsRendered++;
      } catch (err) {
        console.error(`[digest] PDF render failed for event ${ev.id}:`, err);
        attachPdf = false;
      }
    }

    const row: DigestEventRow = {
      id: ev.id,
      title: ev.title,
      slug: ev.slug,
      isoDate: ev.date,
      dateLabel: formatHumanDate(ev.date),
      daysFromNow: days,
      location: ev.location,
      host: ev.host ?? 'rotaract',
      hostName: ev.hostName,
      totals: totalsToCounts(totals, donationsTotalCents, donationsCount),
      delta,
      pdfAttached: attachPdf,
      isPastRecap,
    };

    if (isPastRecap) past.push(row);
    else upcoming.push(row);
  }

  upcoming.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  past.sort((a, b) => b.isoDate.localeCompare(a.isoDate));

  // 3. Find recipients (board members opted in, active).
  const membersSnap = await adminDb
    .collection('members')
    .where('role', 'in', BOARD_ROLES as unknown as string[])
    .get();

  const candidates = membersSnap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((m) => m.status === 'active' && m.email);

  // Filter via notification_preferences.boardEventDigest (default true)
  const recipients: { id: string; email: string; displayName?: string }[] = [];
  for (const m of candidates) {
    const prefDoc = await adminDb.collection('notification_preferences').doc(m.id).get();
    const optedIn = prefDoc.exists
      ? (prefDoc.data() as any)?.boardEventDigest !== false
      : true;
    if (optedIn) recipients.push({ id: m.id, email: m.email, displayName: m.displayName });
  }

  // 4. Build the email once (it's the same body per recipient) and send.
  const result: DigestRunResult = {
    recipients: recipients.length,
    sent: 0,
    failed: 0,
    upcomingEvents: upcoming.length,
    pastEvents: past.length,
    pdfsRendered,
    skipped: [],
  };

  if (recipients.length === 0) return result;

  const allDigestRows = [...upcoming, ...past];
  const attachments = allDigestRows
    .filter((r) => r.pdfAttached && pdfBuffers.has(r.id))
    .map((r) => {
      const safe = r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const datePart = (r.isoDate || '').split('T')[0] || 'event';
      return {
        filename: `attendees-${safe || 'event'}-${datePart}.pdf`,
        content: pdfBuffers.get(r.id)!,
        contentType: 'application/pdf',
      };
    });

  const weekLabel = formatWeekLabel(now);
  const {
    ours: ourUpcoming,
    partners: partnerUpcoming,
    partnerTotal,
  } = splitDigestRows(upcoming, DIGEST_PARTNER_LIMIT);

  for (const recipient of recipients) {
    const tpl = weeklyEventDigestEmail({
      recipientName: recipient.displayName || '',
      weekLabel,
      upcoming: ourUpcoming,
      past,
      attachmentCount: attachments.length,
      partners: partnerUpcoming,
      partnerTotal,
      // The portal, not /events: the digest can list members-only and
      // board-only events, and the public page renders neither. Linking
      // there would show a reader far fewer events than they just read about.
      partnersUrl: `${SITE.url}/portal/events?host=community`,
    });

    try {
      const send = await sendEmail({
        to: recipient.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        attachments,
      });
      if (send.success) result.sent++;
      else {
        result.failed++;
        result.skipped.push(`${recipient.email}: ${send.error}`);
      }
    } catch (err: any) {
      result.failed++;
      result.skipped.push(`${recipient.email}: ${err?.message || err}`);
    }
  }

  // 5. Persist snapshots so next week's deltas are accurate. Skip in dry-run.
  if (!dryRun && result.sent > 0) {
    const week = isoWeek(now);
    const sentAt = now.toISOString();
    for (const ev of events) {
      const totals = eventTotalsById.get(ev.id);
      if (!totals) continue;
      const isPastRecap = diffDays(new Date(ev.date), now) < 0;
      const previousSnap = await adminDb.collection('digest_snapshots').doc(ev.id).get();
      const previousCounts = previousSnap.exists
        ? (previousSnap.data() as any)?.currentCounts ?? null
        : null;

      await adminDb.collection('digest_snapshots').doc(ev.id).set(
        {
          currentCounts: totalsToCounts(totals, ev.donationsTotalCents ?? 0, ev.donationsCount ?? 0),
          previousCounts,
          lastSentAt: sentAt,
          lastIsoWeek: week,
          ...(isPastRecap && { recapSent: true }),
        },
        { merge: true },
      );
    }
  }

  return result;
}
