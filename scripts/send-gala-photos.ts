/**
 * Sends the "the gala photos are ready" email to everyone who attended the
 * 2026 Rotaract NYC Gala (the 30th-year celebration).
 *
 * AUDIENCE — resolved LIVE from Firestore, deduped on lowercase email:
 *   • members → `rsvps` where eventId == <gala> AND status == 'going'
 *               (member email + first name looked up from `members`).
 *   • guests  → `guest_rsvps` where eventId == <gala> AND status == 'going'.
 *
 * The email links to the public album on the website and (optionally) to the
 * full-resolution Google Photos album.
 *
 * Usage:
 *   # Dry run — print the resolved recipient list + counts, send nothing
 *   npx tsx scripts/send-gala-photos.ts
 *
 *   # Send a single test to yourself first (great for QA)
 *   npx tsx scripts/send-gala-photos.ts --send --test=you@example.com
 *
 *   # Actually send to every gala participant (requires RESEND_API_KEY)
 *   npx tsx scripts/send-gala-photos.ts --send
 *
 *   # Only people who were checked in at the door (stricter "attended")
 *   npx tsx scripts/send-gala-photos.ts --send --checked-in-only
 *
 *   # Overrides
 *   npx tsx scripts/send-gala-photos.ts --slug=other-event-slug
 *   npx tsx scripts/send-gala-photos.ts --album-slug=gala-2026
 *   npx tsx scripts/send-gala-photos.ts --gallery-url=https://rotaractnyc.org/gallery/gala-2026
 *   npx tsx scripts/send-gala-photos.ts --google-photos-url=https://photos.app.goo.gl/xxx
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { galaPhotosEmail } from '../lib/email/templates';
import { sendEmail } from '../lib/email/send';
import { SITE } from '../lib/constants';

// ─── Firebase init ──────────────────────────────────────────────────────────
if (!getApps().length) {
  const saJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    let sa: ServiceAccount;
    try {
      sa = JSON.parse(saJson) as ServiceAccount;
    } catch {
      sa = JSON.parse(saJson.replace(/\n/g, '\\n')) as ServiceAccount;
    }
    initializeApp({ credential: cert(sa) });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      } as ServiceAccount),
    });
  } else {
    console.error('❌  No Firebase credentials found in .env.local');
    process.exit(1);
  }
}

const db = getFirestore();

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_GALA_SLUG = 'fundraiser-gala-30th-year-celebration';
const DEFAULT_ALBUM_SLUG = 'gala-2026';
const DEFAULT_GOOGLE_PHOTOS_URL = 'https://photos.app.goo.gl/ovZzH8gfvS4WFCNQ7';

const CHUNK_SIZE = 3;            // Stay under Resend's 5 req/s cap with margin
const CHUNK_DELAY_MS = 1200;

// ─── Helpers ────────────────────────────────────────────────────────────────

function norm(email: string): string {
  return email.trim().toLowerCase();
}

function firstNameFrom(full?: string | null): string {
  const n = (full || '').trim();
  if (!n) return 'there';
  return n.split(/\s+/)[0];
}

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

interface Participant {
  firstName: string;
  email: string;
  source: 'member' | 'guest';
}

/**
 * Resolve every participant of the gala from Firestore.
 *
 * @param slug          event slug
 * @param checkedInOnly when true, only include people marked checkedIn
 */
async function buildParticipants(
  slug: string,
  checkedInOnly: boolean,
): Promise<{ eventId: string | null; participants: Participant[] }> {
  const eventSnap = await db
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (eventSnap.empty) {
    console.warn(`⚠️  No event found with slug "${slug}". Recipient list is empty.`);
    return { eventId: null, participants: [] };
  }

  const eventId = eventSnap.docs[0].id;
  const out: Participant[] = [];

  // ── Guests (guest_rsvps) ──────────────────────────────────────────────────
  const guestSnap = await db
    .collection('guest_rsvps')
    .where('eventId', '==', eventId)
    .where('status', '==', 'going')
    .get();
  for (const doc of guestSnap.docs) {
    const d = doc.data();
    if (checkedInOnly && d.checkedIn !== true) continue;
    const email = norm(d.email || '');
    if (!email) continue;
    out.push({ firstName: firstNameFrom(d.name), email, source: 'guest' });
  }

  // ── Members (rsvps → members) ─────────────────────────────────────────────
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

  const memberIds = memberRows
    .map((r) => r.memberId)
    .filter((x): x is string => Boolean(x));

  // Look up member emails / names in batches of 30 (Firestore 'in' limit).
  const memberById = new Map<string, { email: string; firstName?: string }>();
  for (let i = 0; i < memberIds.length; i += 30) {
    const batch = memberIds.slice(i, i + 30);
    if (!batch.length) continue;
    const snap = await db
      .collection('members')
      .where('__name__', 'in', batch)
      .get();
    snap.docs.forEach((d) => {
      const data = d.data();
      memberById.set(d.id, { email: data.email || '', firstName: data.firstName });
    });
  }

  for (const row of memberRows) {
    const m = row.memberId ? memberById.get(row.memberId) : undefined;
    const email = norm(m?.email || '');
    if (!email) continue;
    const firstName = m?.firstName?.trim() || firstNameFrom(row.memberName);
    out.push({ firstName, email, source: 'member' });
  }

  return { eventId, participants: out };
}

/** Fetch the imported album's cover photo to use as the email hero image. */
async function fetchAlbumCover(albumSlug: string): Promise<string | undefined> {
  try {
    const snap = await db
      .collection('albums')
      .where('slug', '==', albumSlug)
      .limit(1)
      .get();
    if (snap.empty) return undefined;
    const url = snap.docs[0].data().coverPhotoUrl as string | undefined;
    return url || undefined;
  } catch {
    return undefined;
  }
}

interface ResolvedList {
  recipients: Participant[];
  dupes: Participant[];
}

function dedupe(input: Participant[]): ResolvedList {
  const seen = new Set<string>();
  const recipients: Participant[] = [];
  const dupes: Participant[] = [];
  for (const r of input) {
    const e = norm(r.email);
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

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const send = hasFlag('send');
  const force = hasFlag('force');
  const checkedInOnly = hasFlag('checked-in-only');
  const slug = parseArg('slug', DEFAULT_GALA_SLUG)!;
  const albumSlug = parseArg('album-slug', DEFAULT_ALBUM_SLUG)!;
  const testEmail = parseArg('test');
  const galleryUrl = parseArg('gallery-url', `${SITE.url}/gallery/${albumSlug}`)!;
  const googlePhotosUrl = parseArg('google-photos-url', DEFAULT_GOOGLE_PHOTOS_URL);
  const donateUrl = `${SITE.url}/donate`;

  console.log('\n── Rotaract NYC Gala 2026 — Photos Sender ──');
  console.log(`Mode:        ${send ? '🟢 LIVE SEND' : '🟡 dry run (no emails sent)'}`);
  console.log(`Audience:    ${checkedInOnly ? 'checked-in attendees only' : 'all ticket holders (going)'}`);
  console.log(`Event slug:  ${slug}`);
  console.log(`Gallery URL: ${galleryUrl}`);
  console.log(`Google URL:  ${googlePhotosUrl || '(none)'}`);
  if (testEmail) console.log(`Test only:   ${testEmail}`);
  console.log('');

  const coverImageUrl = await fetchAlbumCover(albumSlug);
  console.log(`🖼️  Album cover: ${coverImageUrl ? `${coverImageUrl.slice(0, 60)}…` : '(not found yet — email will send without a hero image)'}`);

  const { eventId, participants } = await buildParticipants(slug, checkedInOnly);
  const { recipients, dupes } = dedupe(participants);

  const memberCount = recipients.filter((r) => r.source === 'member').length;
  const guestCount = recipients.filter((r) => r.source === 'guest').length;

  console.log(`\n── Resolved recipients ──`);
  console.log(`   Event ID:       ${eventId ?? '(none)'}`);
  console.log(`   Will send to:   ${recipients.length}  (${memberCount} members · ${guestCount} guests)`);
  console.log(`   Dupes skipped:  ${dupes.length}`);
  if (process.argv.includes('--verbose') || !send) {
    console.log(`   Recipients:`);
    recipients.forEach((r) => console.log(`     · ${r.firstName} <${r.email}>  [${r.source}]`));
  }

  const build = (firstName: string) =>
    galaPhotosEmail({ firstName, galleryUrl, googlePhotosUrl, donateUrl, coverImageUrl });

  // ── Test mode ─────────────────────────────────────────────────────────────
  if (testEmail) {
    if (!send) {
      console.log(`\n💡 --test provided without --send. Add --send to fire the test email.`);
      return;
    }
    console.log(`\n📨 Sending TEST photos email to ${testEmail}…`);
    const built = build('Friend');
    const r = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${built.subject}`,
      html: built.html,
      text: built.text,
    });
    console.log(`   photos: ${r.success ? `✅ ${r.id}` : `❌ ${r.error}`}`);
    return;
  }

  if (!send) {
    console.log(`\n💡 Dry run complete. Re-run with --send to actually deliver these emails.`);
    console.log(`   Tip: --test=you@example.com --send  → fire a single test first.`);
    return;
  }

  if (recipients.length === 0) {
    console.log(`\n⚠️  No recipients resolved — nothing to send.`);
    return;
  }

  // ── Double-send guard ─────────────────────────────────────────────────────
  // Records a marker in Firestore once the photos email has gone out so that a
  // re-triggered workflow (or an accidental re-run) can't email everyone twice.
  const guardRef = db.collection('system_flags').doc('galaPhotosSent');
  const guardSnap = await guardRef.get();
  if (guardSnap.exists && !force) {
    const g = guardSnap.data() || {};
    console.log(
      `\n🛑 Photos email already sent on ${g.sentAt} ` +
        `(${g.count} recipients, album "${g.albumSlug}"). ` +
        `Nothing sent. Use --force to override.`,
    );
    return;
  }

  // ── Live send ─────────────────────────────────────────────────────────────
  console.log(`\n📨 Sending photos email → ${recipients.length} recipients…`);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
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
        console.log(`   ✅ ${settled.value.email}`);
      } else {
        failed++;
        const reason =
          settled.status === 'fulfilled' ? settled.value.res.error : String(settled.reason);
        const who = settled.status === 'fulfilled' ? settled.value.email : '(unknown)';
        console.log(`   ❌ ${who} — ${reason}`);
      }
    }
    if (i + CHUNK_SIZE < recipients.length) {
      await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
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
    console.warn('⚠️  Could not write double-send guard marker:', err);
  }

  console.log(`\n   → done: ${sent} sent, ${failed} failed`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Script failed:', err);
    process.exit(1);
  });
