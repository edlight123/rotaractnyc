/**
 * Shared logic for the one-off "the gala photos are ready" email blast.
 *
 * This module is the SINGLE SOURCE OF TRUTH used by both:
 *   • the authenticated API route   (app/api/admin/gala/send-photos/route.ts)
 *     — the durable path triggered by the scheduled GitHub Actions workflow,
 *       running on Vercel where Resend + Firebase are already configured.
 *   • the local CLI script          (scripts/send-gala-photos.ts)
 *     — for previewing / manual test sends from a dev machine.
 *
 * Audience is resolved LIVE from Firestore and deduped on lowercase email:
 *   • guests  → `guest_rsvps` where eventId == <gala> AND status == 'going'.
 *   • members → `rsvps`       where eventId == <gala> AND status == 'going'
 *               (email + first name looked up from `members`).
 *
 * A Firestore marker (`system_flags/galaPhotosSent`) guards against a double
 * send if the workflow is ever re-triggered.
 */
import type { Firestore } from 'firebase-admin/firestore';

import { galaPhotosEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { SITE } from '@/lib/constants';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_GALA_SLUG = 'fundraiser-gala-30th-year-celebration';
export const DEFAULT_ALBUM_SLUG = 'gala-2026';
export const DEFAULT_GOOGLE_PHOTOS_URL = 'https://photos.app.goo.gl/ovZzH8gfvS4WFCNQ7';

// Stay comfortably under Resend's rate cap while sending personalized emails.
const DEFAULT_CHUNK_SIZE = 3;
const DEFAULT_CHUNK_DELAY_MS = 1200;

const GUARD_DOC = 'galaPhotosSent';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GalaParticipant {
  firstName: string;
  email: string;
  source: 'member' | 'guest';
}

export interface SendGalaPhotosOptions {
  /** When false, resolve recipients but send nothing (dry run). */
  send: boolean;
  /** Override the double-send guard. */
  force?: boolean;
  /** Only include attendees marked checkedIn. */
  checkedInOnly?: boolean;
  /** Event slug used to resolve participants. */
  slug?: string;
  /** Album slug used for the gallery link + hero cover lookup. */
  albumSlug?: string;
  /** Public album page URL (defaults to {SITE.url}/gallery/{albumSlug}). */
  galleryUrl?: string;
  /** Full-res Google Photos shared album link. */
  googlePhotosUrl?: string;
  /** Donation URL for the soft support ask. */
  donateUrl?: string;
  /** When set, send a single test email here instead of the full list. */
  testEmail?: string;
  /** Include the resolved recipient list in the result (dry-run inspection). */
  includeRecipients?: boolean;
  chunkSize?: number;
  chunkDelayMs?: number;
  /** Optional progress logger (the CLI passes console.log). */
  onLog?: (line: string) => void;
}

export interface SendGalaPhotosResult {
  ok: boolean;
  dryRun: boolean;
  /** Set when the guard short-circuited a real send. */
  skipped?: 'already-sent';
  eventId: string | null;
  albumSlug: string;
  galleryUrl: string;
  googlePhotosUrl?: string;
  coverImageUrl?: string;
  resolved: number;
  members: number;
  guests: number;
  dupes: number;
  sent: number;
  failed: number;
  /** Present only when a real send was guarded. */
  alreadySentAt?: string;
  /** Present when includeRecipients is set. */
  recipients?: GalaParticipant[];
  /** Up to a handful of send errors, for diagnostics. */
  errors?: string[];
  testEmail?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

function firstNameFrom(full?: string | null): string {
  const n = (full || '').trim();
  if (!n) return 'there';
  return n.split(/\s+/)[0];
}

/** Resolve every "going" participant of the gala from Firestore. */
export async function resolveGalaParticipants(
  db: Firestore,
  slug: string,
  checkedInOnly: boolean,
): Promise<{ eventId: string | null; participants: GalaParticipant[] }> {
  const eventSnap = await db.collection('events').where('slug', '==', slug).limit(1).get();
  if (eventSnap.empty) {
    return { eventId: null, participants: [] };
  }

  const eventId = eventSnap.docs[0].id;
  const out: GalaParticipant[] = [];

  // ── Guests (guest_rsvps) ────────────────────────────────────────────────
  const guestSnap = await db
    .collection('guest_rsvps')
    .where('eventId', '==', eventId)
    .where('status', '==', 'going')
    .get();
  for (const doc of guestSnap.docs) {
    const d = doc.data();
    if (checkedInOnly && d.checkedIn !== true) continue;
    const email = normEmail(d.email || '');
    if (!email) continue;
    out.push({ firstName: firstNameFrom(d.name), email, source: 'guest' });
  }

  // ── Members (rsvps → members) ───────────────────────────────────────────
  const rsvpSnap = await db
    .collection('rsvps')
    .where('eventId', '==', eventId)
    .where('status', '==', 'going')
    .get();

  const memberRows = rsvpSnap.docs
    .map((d) => ({
      memberId: d.data().memberId as string | undefined,
      memberName: d.data().memberName as string | undefined,
      checkedIn: d.data().checkedIn === true,
    }))
    .filter((r) => (checkedInOnly ? r.checkedIn : true) && Boolean(r.memberId));

  const memberIds = memberRows.map((r) => r.memberId).filter((x): x is string => Boolean(x));

  const memberById = new Map<string, { email: string; firstName?: string }>();
  for (let i = 0; i < memberIds.length; i += 30) {
    const batch = memberIds.slice(i, i + 30);
    if (!batch.length) continue;
    const snap = await db.collection('members').where('__name__', 'in', batch).get();
    snap.docs.forEach((d) => {
      const data = d.data();
      memberById.set(d.id, { email: data.email || '', firstName: data.firstName });
    });
  }

  for (const row of memberRows) {
    const m = row.memberId ? memberById.get(row.memberId) : undefined;
    const email = normEmail(m?.email || '');
    if (!email) continue;
    const firstName = m?.firstName?.trim() || firstNameFrom(row.memberName);
    out.push({ firstName, email, source: 'member' });
  }

  return { eventId, participants: out };
}

/** Dedupe participants on lowercase email, preserving first occurrence. */
export function dedupeParticipants(input: GalaParticipant[]): {
  recipients: GalaParticipant[];
  dupes: GalaParticipant[];
} {
  const seen = new Set<string>();
  const recipients: GalaParticipant[] = [];
  const dupes: GalaParticipant[] = [];
  for (const r of input) {
    const e = normEmail(r.email);
    if (!e) continue;
    if (seen.has(e)) {
      dupes.push(r);
      continue;
    }
    seen.add(e);
    recipients.push({ ...r, email: e });
  }
  return { recipients, dupes };
}

/** Fetch the imported album's cover photo, used as the email hero image. */
export async function getAlbumCover(
  db: Firestore,
  albumSlug: string,
): Promise<string | undefined> {
  try {
    const snap = await db.collection('albums').where('slug', '==', albumSlug).limit(1).get();
    if (snap.empty) return undefined;
    const url = snap.docs[0].data().coverPhotoUrl as string | undefined;
    return url || undefined;
  } catch {
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve recipients and (optionally) send the gala photos email to all of them.
 * Idempotent for real sends via the `system_flags/galaPhotosSent` guard.
 */
export async function sendGalaPhotos(
  db: Firestore,
  opts: SendGalaPhotosOptions,
): Promise<SendGalaPhotosResult> {
  const log = opts.onLog ?? (() => {});

  const slug = opts.slug || DEFAULT_GALA_SLUG;
  const albumSlug = opts.albumSlug || DEFAULT_ALBUM_SLUG;
  const galleryUrl = opts.galleryUrl || `${SITE.url}/gallery/${albumSlug}`;
  const googlePhotosUrl = opts.googlePhotosUrl ?? DEFAULT_GOOGLE_PHOTOS_URL;
  const donateUrl = opts.donateUrl || `${SITE.url}/donate`;
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkDelayMs = opts.chunkDelayMs ?? DEFAULT_CHUNK_DELAY_MS;

  const coverImageUrl = await getAlbumCover(db, albumSlug);
  log(`Album cover: ${coverImageUrl ? 'found' : 'not found (sending without hero image)'}`);

  const { eventId, participants } = await resolveGalaParticipants(
    db,
    slug,
    opts.checkedInOnly === true,
  );
  const { recipients, dupes } = dedupeParticipants(participants);
  const members = recipients.filter((r) => r.source === 'member').length;
  const guests = recipients.filter((r) => r.source === 'guest').length;

  log(`Resolved ${recipients.length} recipients (${members} members, ${guests} guests); ${dupes.length} dupes skipped`);

  const base: SendGalaPhotosResult = {
    ok: true,
    dryRun: !opts.send,
    eventId,
    albumSlug,
    galleryUrl,
    googlePhotosUrl,
    coverImageUrl,
    resolved: recipients.length,
    members,
    guests,
    dupes: dupes.length,
    sent: 0,
    failed: 0,
    ...(opts.includeRecipients ? { recipients } : {}),
  };

  const build = (firstName: string) =>
    galaPhotosEmail({ firstName, galleryUrl, googlePhotosUrl, donateUrl, coverImageUrl });

  // ── Test mode: a single sample email ──────────────────────────────────────
  if (opts.testEmail) {
    if (!opts.send) {
      log('Test email provided but send=false — nothing sent.');
      return { ...base, testEmail: opts.testEmail };
    }
    const built = build('Friend');
    const r = await sendEmail({
      to: opts.testEmail,
      subject: `[TEST] ${built.subject}`,
      html: built.html,
      text: built.text,
    });
    log(`Test email → ${opts.testEmail}: ${r.success ? 'sent' : `failed (${r.error})`}`);
    return {
      ...base,
      testEmail: opts.testEmail,
      sent: r.success ? 1 : 0,
      failed: r.success ? 0 : 1,
      ...(r.success ? {} : { errors: [String(r.error)] }),
    };
  }

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (!opts.send) {
    log('Dry run — no emails sent.');
    return base;
  }

  if (recipients.length === 0) {
    log('No recipients resolved — nothing to send.');
    return base;
  }

  // ── Double-send guard ─────────────────────────────────────────────────────
  const guardRef = db.collection('system_flags').doc(GUARD_DOC);
  const guardSnap = await guardRef.get();
  if (guardSnap.exists && !opts.force) {
    const g = guardSnap.data() || {};
    log(`Guard tripped — already sent on ${g.sentAt} to ${g.count} recipients. Nothing sent.`);
    return { ...base, skipped: 'already-sent', alreadySentAt: g.sentAt };
  }

  // ── Live send (personalized, chunked) ─────────────────────────────────────
  log(`Sending to ${recipients.length} recipients…`);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += chunkSize) {
    const chunk = recipients.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((r) => {
        const built = build(r.firstName);
        return sendEmail({
          to: r.email,
          subject: built.subject,
          html: built.html,
          text: built.text,
        }).then((res) => ({ res, email: r.email }));
      }),
    );
    for (const settled of results) {
      if (settled.status === 'fulfilled' && settled.value.res.success) {
        sent++;
      } else {
        failed++;
        const reason =
          settled.status === 'fulfilled' ? settled.value.res.error : String(settled.reason);
        const who = settled.status === 'fulfilled' ? settled.value.email : '(unknown)';
        if (errors.length < 10) errors.push(`${who}: ${reason}`);
      }
    }
    if (i + chunkSize < recipients.length) {
      await sleep(chunkDelayMs);
    }
  }

  // Record the send so it can't be repeated by accident.
  try {
    await guardRef.set({
      sentAt: new Date().toISOString(),
      count: sent,
      failed,
      eventId,
      albumSlug,
      slug,
    });
  } catch (err) {
    log(`Warning: could not write double-send guard marker: ${String(err)}`);
  }

  log(`Done: ${sent} sent, ${failed} failed.`);
  return { ...base, sent, failed, ...(errors.length ? { errors } : {}) };
}
