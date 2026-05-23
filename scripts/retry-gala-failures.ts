/**
 * One-off retry script — resends the past-attendee gala invite to a
 * specific list of email addresses (e.g. those that hit 429 rate-limit
 * errors during the first pass).
 *
 * Reads `/tmp/retry-emails.txt` (one email per line), looks up the
 * matching first name in the PAST_ATTENDEES list, and sends with the
 * same template as the main script, throttled below Resend's 5 req/s.
 *
 * Usage:
 *   npx tsx scripts/retry-gala-failures.ts          # dry-run
 *   npx tsx scripts/retry-gala-failures.ts --send
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { galaInvitePastAttendeeEmail } from '../lib/email/templates';
import { sendEmail } from '../lib/email/send';
import { SITE } from '../lib/constants';

const RETRY_FILE = '/tmp/retry-emails.txt';
const POSTER_PATH = path.resolve(__dirname, '../public/rotaract-gala-2026-poster.jpg');

// Same curated list as send-gala-invites.ts — used purely for first-name lookup
const PAST_ATTENDEES: Array<{ firstName: string; email: string }> = [
  { firstName: 'Amado',         email: 'amado.suarez07@gmail.com' },
  { firstName: 'Cecily',        email: 'cecilynyc@gmail.com' },
  { firstName: 'Cigdem',        email: 'cigdemeth@gmail.com' },
  { firstName: 'Eva',           email: 'evapreoteasa@gmail.com' },
  { firstName: 'Iemanja',       email: 'iemanjadossantos77@gmail.com' },
  { firstName: 'Javanni',       email: 'javanni.waugh@alumni.uwi.edu' },
  { firstName: 'Leila',         email: 'leila@doeringconsulting.com' },
  { firstName: 'Lorenzo',       email: 'lorenzogrilli20@gmail.com' },
  { firstName: 'Luca',          email: 'lucamemoli94@gmail.com' },
  { firstName: 'Maria',         email: 'mavargas811@gmail.com' },
  { firstName: 'Marsha',        email: 'marsha.andrews@compass.com' },
  { firstName: 'Martina',       email: 'martina.albani95@gmail.com' },
  { firstName: 'Nally',         email: 'nallytay@gmail.com' },
  { firstName: 'Nasrin',        email: 'noor.nas@hotmail.com' },
  { firstName: 'Nyaguthie',     email: 'ngethan@msn.com' },
  { firstName: 'Philipp',       email: 'immlerphilipp@gmail.com' },
  { firstName: 'Sharon',        email: 'soo2116@columbia.edu' },
  { firstName: 'Stefan',        email: 'stfnjkl@gmail.com' },
  { firstName: 'Timothy',       email: 'thechopman@live.com.au' },
  { firstName: 'Wolfgang',      email: 'wolfgangwhalen@gmail.com' },
  { firstName: 'Zachariah',     email: 'zactembo@yahoo.com' },
  { firstName: 'Akash',         email: 'akbudhani@gmail.com' },
  { firstName: 'Ana',           email: 'anamsalas9@gmail.com' },
  { firstName: 'Audrey',        email: 'audreyzvinava@gmail.com' },
  { firstName: 'Carolina',      email: 'cizamoraa@gmail.com' },
  { firstName: 'Christina',     email: 'cm.wellington24@gmail.com' },
  { firstName: 'Davide',        email: 'davideluca.capodici@gmail.com' },
  { firstName: 'Derin',         email: 'derinozgul99@gmail.com' },
  { firstName: 'Hanna',         email: 'hannalissinna@gmail.com' },
  { firstName: 'Harrison',      email: 'harrisontudorevans@gmail.com' },
  { firstName: 'Kirk',          email: 'kirkpersaud0@gmail.com' },
  { firstName: 'Marina',        email: 'marinamackk@gmail.com' },
  { firstName: 'Martin',        email: 'martin.nolan@gmail.com' },
  { firstName: 'Nicolo',        email: 'nik.carparelli98@gmail.com' },
  { firstName: 'Ted',           email: 'ted.jacquet@uwc-usa.org' },
  { firstName: 'Vincenzo',      email: 'vincenzo.giordano01@gmail.com' },
  { firstName: 'Suzan',         email: 'suzanalshammari@gmail.com' },
  { firstName: 'Hasmik',        email: 'hs3155@columbia.edu' },
  { firstName: 'Antonio',       email: 'anto.cesaro1@gmail.com' },
  { firstName: 'Yves',          email: 'yvabiaad@gmail.com' },
  { firstName: 'Jessie',        email: 'jzhao1799@gmail.com' },
  { firstName: 'Jakob',         email: 'hjaziegeler@gmail.com' },
  { firstName: 'Silvia',        email: 'silvia.sunseri@gmail.com' },
  { firstName: 'Gabriel',       email: 'gabrielwagner92@gmail.com' },
  { firstName: 'Gregory',       email: 'garcaro@aol.com' },
  { firstName: 'Malavika',      email: 'monicamathur24@gmail.com' },
  { firstName: 'Susanne',       email: 'susanne.schwarz.muc@gmail.com' },
  { firstName: 'Maria Cristina',email: 'maricrisguillenc@gmail.com' },
  { firstName: 'Camilla',       email: 'camilla.fortuna@hotmail.it' },
  { firstName: 'Kristina',      email: 'kristina.hermann2@gmail.com' },
  { firstName: 'Markanthony',   email: 'mnm13@usa.com' },
  { firstName: 'Ruchi',         email: 'ruchikumar8@gmail.com' },
  { firstName: 'Henry',         email: 'henry@plemper.com' },
  { firstName: 'Stefania',      email: 'stefania.samatov@gmail.com' },
  { firstName: 'Jafor',         email: 'jafornovel@hotmail.com' },
  { firstName: 'Quentin',       email: 'q.alexandre@outlook.fr' },
  { firstName: 'Hanna',         email: 'hanna.elfez@gmail.com' },
  { firstName: 'Fabio',         email: 'fbobrd1982@gmail.com' },
  { firstName: 'Luigi',         email: 'gg.piluso@gmail.com' },
  { firstName: 'Gerardo',       email: 'esgerardocon@hotmail.com' },
  { firstName: 'Letizia',       email: 'letiziamanfrin23@gmail.com' },
  { firstName: 'Anish',         email: 'prabhuanish@gmail.com' },
  { firstName: 'Shinichi',      email: 'snoguc1@gmail.com' },
  { firstName: 'Kristi',        email: 'kkaycarson@gmail.com' },
  { firstName: 'Manuela',       email: 'manuela.gencarelli@unifi.it' },
  { firstName: 'Filippo',       email: 'filippo.pederzoli@gmail.com' },
  { firstName: 'Kevin',         email: 'kchunt1@yahoo.com' },
  { firstName: 'Giorgia',       email: 'gioly.93@hotmail.it' },
];

const nameByEmail = new Map(PAST_ATTENDEES.map((r) => [r.email.toLowerCase(), r.firstName]));

async function main() {
  const send = process.argv.includes('--send');
  const retry = fs.readFileSync(RETRY_FILE, 'utf-8')
    .split('\n')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  console.log(`Retrying ${retry.length} addresses (${send ? 'LIVE' : 'DRY RUN'})…`);

  const posterAttachment = fs.existsSync(POSTER_PATH)
    ? {
        filename: 'Rotaract-NYC-Gala-2026-Invitation.jpg',
        content: fs.readFileSync(POSTER_PATH),
        contentType: 'image/jpeg',
      }
    : null;

  const ticketUrl = `${SITE.url}/events/fundraiser-gala-30th-year-celebration`;

  let sent = 0, failed = 0, unknown = 0;
  // Slow: 1 send every ~400ms = ~2.5/s, well below 5/s cap
  for (const email of retry) {
    const firstName = nameByEmail.get(email);
    if (!firstName) {
      console.log(`   ⚠️  no first name found for ${email} — skipping`);
      unknown++;
      continue;
    }
    if (!send) {
      console.log(`   (dry) → ${firstName} <${email}>`);
      continue;
    }
    const built = galaInvitePastAttendeeEmail({
      firstName,
      ticketUrl,
      donateUrl: `${SITE.url}/donate`,
      eventDate: 'Saturday, June 6, 2026',
      eventTime: '7:00 PM – 11:00 PM',
      eventVenue: 'New York City — full address on the event page',
    });
    const res = await sendEmail({
      to: email,
      subject: built.subject,
      html: built.html,
      text: built.text,
      attachments: posterAttachment ? [posterAttachment] : undefined,
    });
    if (res.success) {
      sent++;
      console.log(`   ✅ ${email}`);
    } else {
      failed++;
      console.log(`   ❌ ${email} — ${res.error}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nDone: ${sent} sent, ${failed} failed, ${unknown} unknown`);
}

main().catch((e) => {
  console.error('💥', e);
  process.exit(1);
});
