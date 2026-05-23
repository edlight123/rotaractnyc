/**
 * Sends the 2026 Rotaract NYC Gala invitations.
 *
 * Two curated audiences (see chat history for the full reasoning):
 *
 *   • past      → 2023 + 2025 gala attendees (with personalized "welcome back"
 *                 framing).
 *   • members   → current members + alumni who did NOT attend in 2025
 *                 (community / member framing). Recipients tagged as alumni
 *                 get a slightly different opening line.
 *
 * IMPORTANT: this script ALWAYS suppresses anyone who has already purchased
 * a ticket for the 2026 gala (queried live from Firestore: `rsvps` for
 * members + `guest_rsvps` for guests on the configured gala event).
 *
 * Usage:
 *   # Dry run — preview the suppression list, segments, and recipient counts
 *   npx tsx scripts/send-gala-invites.ts
 *
 *   # Only print the resolved recipient lists, do not send
 *   npx tsx scripts/send-gala-invites.ts --list=past
 *   npx tsx scripts/send-gala-invites.ts --list=members
 *
 *   # Actually send (requires RESEND_API_KEY in .env.local)
 *   npx tsx scripts/send-gala-invites.ts --send                 # both lists
 *   npx tsx scripts/send-gala-invites.ts --send --list=past
 *   npx tsx scripts/send-gala-invites.ts --send --list=members
 *
 *   # Override the gala event slug or ticket URL
 *   npx tsx scripts/send-gala-invites.ts --slug=other-gala-slug
 *   npx tsx scripts/send-gala-invites.ts --ticket-url=https://...
 *
 *   # Send only to a single test recipient (suppresses both lists, sends
 *   # one of each template to the address you provide). Great for QA.
 *   npx tsx scripts/send-gala-invites.ts --send --test=you@example.com
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import {
  galaInvitePastAttendeeEmail,
  galaInviteMemberEmail,
} from '../lib/email/templates';
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
const DEFAULT_EVENT_DATE = 'Saturday, June 6, 2026';
const DEFAULT_EVENT_TIME = '7:00 PM – 11:00 PM';
const DEFAULT_EVENT_VENUE = 'New York City — full address on the event page';
const POSTER_PATH = path.resolve(__dirname, '../public/rotaract-gala-2026-poster.jpg');
const POSTER_FILENAME = 'Rotaract-NYC-Gala-2026-Invitation.jpg';

const CHUNK_SIZE = 3;            // Stay under Resend's 5 req/s cap with margin
const CHUNK_DELAY_MS = 1200;

// ─── Curated recipient lists ────────────────────────────────────────────────
// Source: chat handoff — gala attendee spreadsheets (2023 & 2025) + current
// member roster + previous-year alumni roster. Deduped on lowercase email.

interface Recipient {
  firstName: string;
  email: string;
  /** "past" attendees of 2023/2025 only — used to pick template. */
  audience: 'past';
}
interface MemberRecipient {
  firstName: string;
  email: string;
  audience: 'member' | 'alumni';
}

/** List A — attended the 2025 and/or 2023 gala, with email on file. */
const PAST_ATTENDEES: Recipient[] = [
  // 2025 (highest priority)
  { firstName: 'Amado',     email: 'amado.suarez07@gmail.com',     audience: 'past' },
  { firstName: 'Cecily',    email: 'cecilynyc@gmail.com',          audience: 'past' },
  { firstName: 'Cigdem',    email: 'cigdemeth@gmail.com',          audience: 'past' },
  { firstName: 'Eva',       email: 'evapreoteasa@gmail.com',       audience: 'past' },
  { firstName: 'Iemanja',   email: 'iemanjadossantos77@gmail.com', audience: 'past' },
  { firstName: 'Javanni',   email: 'javanni.waugh@alumni.uwi.edu', audience: 'past' },
  { firstName: 'Leila',     email: 'leila@doeringconsulting.com',  audience: 'past' },
  { firstName: 'Lorenzo',   email: 'lorenzogrilli20@gmail.com',    audience: 'past' },
  { firstName: 'Luca',      email: 'lucamemoli94@gmail.com',       audience: 'past' },
  { firstName: 'Maria',     email: 'mavargas811@gmail.com',        audience: 'past' },
  { firstName: 'Marsha',    email: 'marsha.andrews@compass.com',   audience: 'past' },
  { firstName: 'Martina',   email: 'martina.albani95@gmail.com',   audience: 'past' },
  { firstName: 'Nally',     email: 'nallytay@gmail.com',           audience: 'past' },
  { firstName: 'Nasrin',    email: 'noor.nas@hotmail.com',         audience: 'past' },
  { firstName: 'Nyaguthie', email: 'ngethan@msn.com',              audience: 'past' },
  { firstName: 'Philipp',   email: 'immlerphilipp@gmail.com',      audience: 'past' },
  { firstName: 'Sharon',    email: 'soo2116@columbia.edu',         audience: 'past' },
  { firstName: 'Stefan',    email: 'stfnjkl@gmail.com',            audience: 'past' },
  { firstName: 'Timothy',   email: 'thechopman@live.com.au',       audience: 'past' },
  { firstName: 'Wolfgang',  email: 'wolfgangwhalen@gmail.com',     audience: 'past' },
  { firstName: 'Zachariah', email: 'zactembo@yahoo.com',           audience: 'past' },
  { firstName: 'Akash',     email: 'akbudhani@gmail.com',          audience: 'past' },
  { firstName: 'Ana',       email: 'anamsalas9@gmail.com',         audience: 'past' },
  { firstName: 'Audrey',    email: 'audreyzvinava@gmail.com',      audience: 'past' },
  { firstName: 'Carolina',  email: 'cizamoraa@gmail.com',          audience: 'past' },
  { firstName: 'Christina', email: 'cm.wellington24@gmail.com',    audience: 'past' },
  { firstName: 'Davide',    email: 'davideluca.capodici@gmail.com',audience: 'past' },
  { firstName: 'Derin',     email: 'derinozgul99@gmail.com',       audience: 'past' },
  { firstName: 'Hanna',     email: 'hannalissinna@gmail.com',      audience: 'past' },
  { firstName: 'Harrison',  email: 'harrisontudorevans@gmail.com', audience: 'past' },
  { firstName: 'Kirk',      email: 'kirkpersaud0@gmail.com',       audience: 'past' },
  { firstName: 'Marina',    email: 'marinamackk@gmail.com',        audience: 'past' },
  { firstName: 'Martin',    email: 'martin.nolan@gmail.com',       audience: 'past' },
  { firstName: 'Nicolo',    email: 'nik.carparelli98@gmail.com',   audience: 'past' },
  { firstName: 'Ted',       email: 'ted.jacquet@uwc-usa.org',      audience: 'past' },
  { firstName: 'Vincenzo',  email: 'vincenzo.giordano01@gmail.com',audience: 'past' },

  // 2023 only (lapsed re-engagement)
  { firstName: 'Suzan',         email: 'suzanalshammari@gmail.com',     audience: 'past' },
  { firstName: 'Hasmik',        email: 'hs3155@columbia.edu',           audience: 'past' },
  { firstName: 'Antonio',       email: 'anto.cesaro1@gmail.com',        audience: 'past' },
  { firstName: 'Yves',          email: 'yvabiaad@gmail.com',            audience: 'past' },
  { firstName: 'Jessie',        email: 'jzhao1799@gmail.com',           audience: 'past' },
  { firstName: 'Jakob',         email: 'hjaziegeler@gmail.com',         audience: 'past' },
  { firstName: 'Silvia',        email: 'silvia.sunseri@gmail.com',      audience: 'past' },
  { firstName: 'Gabriel',       email: 'gabrielwagner92@gmail.com',     audience: 'past' },
  { firstName: 'Gregory',       email: 'garcaro@aol.com',               audience: 'past' },
  { firstName: 'Malavika',      email: 'monicamathur24@gmail.com',      audience: 'past' },
  { firstName: 'Susanne',       email: 'susanne.schwarz.muc@gmail.com', audience: 'past' },
  { firstName: 'Maria Cristina',email: 'maricrisguillenc@gmail.com',    audience: 'past' },
  { firstName: 'Camilla',       email: 'camilla.fortuna@hotmail.it',    audience: 'past' },
  { firstName: 'Kristina',      email: 'kristina.hermann2@gmail.com',   audience: 'past' },
  { firstName: 'Markanthony',   email: 'mnm13@usa.com',                 audience: 'past' },
  { firstName: 'Ruchi',         email: 'ruchikumar8@gmail.com',         audience: 'past' },
  { firstName: 'Henry',         email: 'henry@plemper.com',             audience: 'past' },
  { firstName: 'Stefania',      email: 'stefania.samatov@gmail.com',    audience: 'past' },
  { firstName: 'Jafor',         email: 'jafornovel@hotmail.com',        audience: 'past' },
  { firstName: 'Quentin',       email: 'q.alexandre@outlook.fr',        audience: 'past' },
  { firstName: 'Hanna',         email: 'hanna.elfez@gmail.com',         audience: 'past' },
  { firstName: 'Fabio',         email: 'fbobrd1982@gmail.com',          audience: 'past' },
  { firstName: 'Luigi',         email: 'gg.piluso@gmail.com',           audience: 'past' },
  { firstName: 'Gerardo',       email: 'esgerardocon@hotmail.com',      audience: 'past' },
  { firstName: 'Letizia',       email: 'letiziamanfrin23@gmail.com',    audience: 'past' },
  { firstName: 'Anish',         email: 'prabhuanish@gmail.com',         audience: 'past' },
  { firstName: 'Shinichi',      email: 'snoguc1@gmail.com',             audience: 'past' },
  { firstName: 'Kristi',        email: 'kkaycarson@gmail.com',          audience: 'past' },
  { firstName: 'Manuela',       email: 'manuela.gencarelli@unifi.it',   audience: 'past' },
  { firstName: 'Filippo',       email: 'filippo.pederzoli@gmail.com',   audience: 'past' },
  { firstName: 'Kevin',         email: 'kchunt1@yahoo.com',             audience: 'past' },
  { firstName: 'Giorgia',       email: 'gioly.93@hotmail.it',           audience: 'past' },
];

/**
 * List B — current members + alumni from prior rosters who did NOT attend
 * 2025 and are not already on List A (deduped by email).
 */
const MEMBERS_AND_ALUMNI: MemberRecipient[] = [
  // Current members
  { firstName: 'Maryann',  email: 'maryann.mirandacuenca@gmail.com', audience: 'member' },
  { firstName: 'Julia',    email: 'julia.bashta@gmail.com',          audience: 'member' },
  { firstName: 'Elody',    email: 'elodyparaison@gmail.com',         audience: 'member' },
  { firstName: 'Caleb',    email: 'calebgiess@gmail.com',            audience: 'member' },
  { firstName: 'Jeremhy',  email: 'jeremhy.cesar31@gmail.com',       audience: 'member' },
  { firstName: 'Miriam',   email: 'mszp85@gmail.com',                audience: 'member' },
  { firstName: 'Vicente',  email: 'vagustiin@hotmail.com',           audience: 'member' },

  // Alumni (prior member rosters, no 2025 attendance)
  { firstName: 'Evan',      email: 'ejh103@case.edu',                   audience: 'alumni' },
  { firstName: 'Alara',     email: 'alarasuperisi@gmail.com',           audience: 'alumni' },
  { firstName: 'Daniel',    email: 'sdanielfrantz@gmail.com',           audience: 'alumni' },
  { firstName: 'Krishna',   email: 'sayorideb98@gmail.com',             audience: 'alumni' },
  { firstName: 'Jacob',     email: 'jacob.hoschouer@gmail.com',         audience: 'alumni' },
  { firstName: 'Gigi',      email: 'gourgega@mail.uc.edu',              audience: 'alumni' },
  { firstName: 'Abbey',     email: 'abbeyrose93@gmail.com',             audience: 'alumni' },
  { firstName: 'Hossein',   email: 'ebrahimi@knights.ucf.edu',          audience: 'alumni' },
  { firstName: 'Luis',      email: 'fernandoherrera062081@gmail.com',   audience: 'alumni' },
  { firstName: 'Anna',      email: 'ajfolz014@gmail.com',               audience: 'alumni' },
  { firstName: 'Tanatswa',  email: 'musundatana@icloud.com',            audience: 'alumni' },
  { firstName: 'Sylvester', email: 'sw@famweise.de',                    audience: 'alumni' },
  { firstName: 'Crystal',   email: 'crystalosner@gmail.com',            audience: 'alumni' },
  { firstName: 'Suleyman',  email: 'sck436@nyu.edu',                    audience: 'alumni' },
  { firstName: 'Jennifer',  email: 'lapper.jennifer@gmail.com',         audience: 'alumni' },
  { firstName: 'Petra',     email: 'pkn721@gmail.com',                  audience: 'alumni' },
  { firstName: 'Katarina',  email: 'kmejean12@gmail.com',               audience: 'alumni' },
  { firstName: 'Leo',       email: 'lzambrano0330@gmail.com',           audience: 'alumni' },
  { firstName: 'Miller',    email: 'miller.wei.zhou@gmail.com',         audience: 'alumni' },
  { firstName: 'Antonio',   email: 'aferega@outlook.com',               audience: 'alumni' },
  { firstName: 'Emilia',    email: 'emiliaguzman.10@gmail.com',         audience: 'alumni' },
  { firstName: 'Tyler',     email: 'tyler.m.bauer@gmail.com',           audience: 'alumni' },
  { firstName: 'Lisa',      email: 'kennedy.lisa.jean@gmail.com',       audience: 'alumni' },
  { firstName: 'Kristina',  email: 'qeramakristina@gmail.com',          audience: 'alumni' },
  { firstName: 'Maia',      email: 'mkrivoruk16@gmail.com',             audience: 'alumni' },
  { firstName: 'Rigers',    email: 'rigersqeraj@gmail.com',             audience: 'alumni' },
  { firstName: 'Jieun',     email: 'jieunlee1711@gmail.com',            audience: 'alumni' },
  { firstName: 'Veronica',  email: 'v.zanetta@icloud.com',              audience: 'alumni' },
  { firstName: 'Alexandra', email: 'amw16@stern.nyu.edu',               audience: 'alumni' },
  { firstName: 'Karina',    email: 'karina.k.lambert@gmail.com',        audience: 'alumni' },
  { firstName: 'Elaine',    email: 'elixsprite@gmail.com',              audience: 'alumni' },
  { firstName: 'Utsav',     email: 'utsavbanatwala@gmail.com',          audience: 'alumni' },
  { firstName: 'Moritz',    email: 'mullermoritz@icloud.com',           audience: 'alumni' },
  { firstName: 'Anisa',     email: 'anisaismaili25@gmail.com',          audience: 'alumni' },
  { firstName: 'William',   email: 'wfhsu.taiwan@gmail.com',            audience: 'alumni' },
  { firstName: 'Melissa',   email: 'me2682@columbia.edu',               audience: 'alumni' },
  { firstName: 'Silvia',    email: 'sisaquispe.q@gmail.com',            audience: 'alumni' },
  { firstName: 'Maddie',    email: 'maddiegracedrew@gmail.com',         audience: 'alumni' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function norm(email: string): string {
  return email.trim().toLowerCase();
}

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/**
 * Pull the live list of 2026 gala ticket holders so we can suppress them.
 *
 * Looks at:
 *   • events with the configured slug → find the eventId
 *   • guest_rsvps where eventId == X → emails of guest purchasers
 *   • rsvps where eventId == X AND status == 'going' → look up member emails
 */
async function buildSuppressionList(slug: string): Promise<{
  eventId: string | null;
  emails: Set<string>;
}> {
  const eventSnap = await db
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (eventSnap.empty) {
    console.warn(`⚠️  No event found with slug "${slug}". Suppression list is empty.`);
    return { eventId: null, emails: new Set() };
  }

  const eventId = eventSnap.docs[0].id;
  const emails = new Set<string>();

  // Guests
  const guestSnap = await db
    .collection('guest_rsvps')
    .where('eventId', '==', eventId)
    .get();
  for (const doc of guestSnap.docs) {
    const e = (doc.data().email || '').trim().toLowerCase();
    if (e) emails.add(e);
  }

  // Members who RSVP'd
  const rsvpSnap = await db
    .collection('rsvps')
    .where('eventId', '==', eventId)
    .where('status', '==', 'going')
    .get();
  const memberIds = rsvpSnap.docs
    .map((d) => d.data().memberId)
    .filter((x): x is string => Boolean(x));

  for (let i = 0; i < memberIds.length; i += 30) {
    const batch = memberIds.slice(i, i + 30);
    if (!batch.length) continue;
    const snap = await db
      .collection('members')
      .where('__name__', 'in', batch)
      .get();
    snap.docs.forEach((d) => {
      const e = (d.data().email || '').trim().toLowerCase();
      if (e) emails.add(e);
    });
  }

  return { eventId, emails };
}

interface ResolvedSegment<T extends { email: string }> {
  label: string;
  recipients: T[];
  suppressed: T[];
  dupes: T[];
}

function resolveSegment<T extends { email: string }>(
  label: string,
  input: T[],
  suppression: Set<string>,
): ResolvedSegment<T> {
  const seen = new Set<string>();
  const recipients: T[] = [];
  const suppressed: T[] = [];
  const dupes: T[] = [];

  for (const r of input) {
    const e = norm(r.email);
    if (!e) continue;
    if (seen.has(e)) {
      dupes.push(r);
      continue;
    }
    seen.add(e);
    if (suppression.has(e)) {
      suppressed.push(r);
      continue;
    }
    recipients.push({ ...r, email: e });
  }

  return { label, recipients, suppressed, dupes };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const send = hasFlag('send');
  const listArg = (parseArg('list', 'both') || 'both') as 'past' | 'members' | 'both';
  const slug = parseArg('slug', DEFAULT_GALA_SLUG)!;
  const testEmail = parseArg('test');
  const ticketUrlOverride = parseArg('ticket-url');
  const ticketUrl = ticketUrlOverride || `${SITE.url}/events/${slug}`;
  const donateUrl = `${SITE.url}/donate`;

  console.log('\n── Rotaract NYC Gala 2026 — Invite Sender ──');
  console.log(`Mode:        ${send ? '🟢 LIVE SEND' : '🟡 dry run (no emails sent)'}`);
  console.log(`Segment(s):  ${listArg}`);
  console.log(`Event slug:  ${slug}`);
  console.log(`Ticket URL:  ${ticketUrl}`);
  if (testEmail) console.log(`Test only:   ${testEmail}`);
  console.log('');

  // Load poster attachment
  let posterAttachment: { filename: string; content: Buffer; contentType: string } | null = null;
  if (fs.existsSync(POSTER_PATH)) {
    posterAttachment = {
      filename: POSTER_FILENAME,
      content: fs.readFileSync(POSTER_PATH),
      contentType: 'image/jpeg',
    };
    console.log(
      `📎 Attaching poster: ${POSTER_FILENAME} (${(posterAttachment.content.length / 1024).toFixed(1)} KB)`,
    );
  } else {
    console.warn(`⚠️  Poster not found at ${POSTER_PATH} — emails will go without attachment.`);
  }

  // Build suppression list from Firestore
  const { eventId, emails: suppression } = await buildSuppressionList(slug);
  console.log(
    `🛑 Suppression list: ${suppression.size} email${suppression.size === 1 ? '' : 's'} ` +
      `already purchased 2026 tickets${eventId ? ` (eventId: ${eventId})` : ''}`,
  );

  // Resolve both segments
  const pastSegment = resolveSegment('Past attendees (2023/2025)', PAST_ATTENDEES, suppression);
  // Members list also dedupes against past attendees (some past attendees are members)
  const pastEmails = new Set(pastSegment.recipients.map((r) => r.email));
  const memberSuppression = new Set<string>();
  suppression.forEach((e) => memberSuppression.add(e));
  pastEmails.forEach((e) => memberSuppression.add(e));
  const memberSegment = resolveSegment('Members & alumni', MEMBERS_AND_ALUMNI, memberSuppression);

  printSegmentSummary(pastSegment);
  printSegmentSummary(memberSegment);

  // Test mode — send one of each template to a single address and exit
  if (testEmail) {
    if (!send) {
      console.log(`\n💡 --test provided without --send. Add --send to fire the two test emails.`);
      return;
    }
    console.log(`\n📨 Sending TEST emails to ${testEmail}…`);
    const testFirstName = 'Friend';
    const past = galaInvitePastAttendeeEmail({
      firstName: testFirstName,
      ticketUrl,
      donateUrl,
      eventDate: DEFAULT_EVENT_DATE,
      eventTime: DEFAULT_EVENT_TIME,
      eventVenue: DEFAULT_EVENT_VENUE,
    });
    const mem = galaInviteMemberEmail({
      firstName: testFirstName,
      ticketUrl,
      donateUrl,
      eventDate: DEFAULT_EVENT_DATE,
      eventTime: DEFAULT_EVENT_TIME,
      eventVenue: DEFAULT_EVENT_VENUE,
    });
    const r1 = await sendEmail({
      to: testEmail,
      subject: `[TEST · past] ${past.subject}`,
      html: past.html,
      text: past.text,
      attachments: posterAttachment ? [posterAttachment] : undefined,
    });
    const r2 = await sendEmail({
      to: testEmail,
      subject: `[TEST · member] ${mem.subject}`,
      html: mem.html,
      text: mem.text,
      attachments: posterAttachment ? [posterAttachment] : undefined,
    });
    console.log(`   past:    ${r1.success ? `✅ ${r1.id}` : `❌ ${r1.error}`}`);
    console.log(`   member:  ${r2.success ? `✅ ${r2.id}` : `❌ ${r2.error}`}`);
    return;
  }

  if (!send) {
    console.log(`\n💡 Dry run complete. Re-run with --send to actually deliver these emails.`);
    console.log(`   Tip: --test=you@example.com --send  → fire a single test of each template first.`);
    return;
  }

  // Live send
  const targets: Array<{
    segment: ResolvedSegment<Recipient> | ResolvedSegment<MemberRecipient>;
    kind: 'past' | 'members';
  }> = [];
  if (listArg === 'past' || listArg === 'both') targets.push({ segment: pastSegment, kind: 'past' });
  if (listArg === 'members' || listArg === 'both') targets.push({ segment: memberSegment, kind: 'members' });

  for (const { segment, kind } of targets) {
    console.log(`\n📨 Sending "${segment.label}" → ${segment.recipients.length} recipients…`);
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < segment.recipients.length; i += CHUNK_SIZE) {
      const chunk = segment.recipients.slice(i, i + CHUNK_SIZE);

      const results = await Promise.allSettled(
        chunk.map((r) => {
          const built =
            kind === 'past'
              ? galaInvitePastAttendeeEmail({
                  firstName: r.firstName,
                  ticketUrl,
                  donateUrl,
                  eventDate: DEFAULT_EVENT_DATE,
                  eventTime: DEFAULT_EVENT_TIME,
                  eventVenue: DEFAULT_EVENT_VENUE,
                })
              : galaInviteMemberEmail({
                  firstName: r.firstName,
                  ticketUrl,
                  donateUrl,
                  eventDate: DEFAULT_EVENT_DATE,
                  eventTime: DEFAULT_EVENT_TIME,
                  eventVenue: DEFAULT_EVENT_VENUE,
                  alumni: (r as MemberRecipient).audience === 'alumni',
                });
          return sendEmail({
            to: r.email,
            subject: built.subject,
            html: built.html,
            text: built.text,
            attachments: posterAttachment ? [posterAttachment] : undefined,
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
            settled.status === 'fulfilled'
              ? settled.value.res.error
              : String(settled.reason);
          const who = settled.status === 'fulfilled' ? settled.value.email : '(unknown)';
          console.log(`   ❌ ${who} — ${reason}`);
        }
      }

      // Rate-limit pause
      if (i + CHUNK_SIZE < segment.recipients.length) {
        await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
      }
    }

    console.log(`   → done: ${sent} sent, ${failed} failed`);
  }
}

function printSegmentSummary(seg: ResolvedSegment<{ email: string; firstName: string }>) {
  console.log(`\n── ${seg.label} ──`);
  console.log(`   Will send to:   ${seg.recipients.length}`);
  console.log(`   Suppressed:     ${seg.suppressed.length}`);
  console.log(`   Dupes skipped:  ${seg.dupes.length}`);
  if (seg.suppressed.length) {
    console.log(`   Suppressed emails:`);
    seg.suppressed.forEach((r) => console.log(`     · ${r.firstName} <${r.email}>`));
  }
  if (process.argv.includes('--verbose') || process.argv.includes(`--list=${seg.label.toLowerCase().split(' ')[0]}`)) {
    console.log(`   Recipients:`);
    seg.recipients.forEach((r) => console.log(`     · ${r.firstName} <${r.email}>`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Script failed:', err);
    process.exit(1);
  });
