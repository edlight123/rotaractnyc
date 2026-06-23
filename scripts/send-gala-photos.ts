/**
 * Local CLI wrapper for the gala "photos are ready" email blast.
 *
 * The real scheduled send runs on Vercel via the authenticated API route
 * (app/api/admin/gala/send-photos/route.ts), triggered by the GitHub Actions
 * workflow. This script shares the SAME logic (lib/services/galaPhotos.ts) and
 * exists for local previews / manual test sends.
 *
 * Usage:
 *   # Dry run — print the resolved recipient list + counts, send nothing
 *   npx tsx scripts/send-gala-photos.ts
 *
 *   # Send a single test to yourself first (requires RESEND_API_KEY in .env.local)
 *   npx tsx scripts/send-gala-photos.ts --send --test=you@example.com
 *
 *   # Actually send to every gala participant
 *   npx tsx scripts/send-gala-photos.ts --send
 *
 *   # Only people checked in at the door
 *   npx tsx scripts/send-gala-photos.ts --send --checked-in-only
 *
 *   # Override the double-send guard
 *   npx tsx scripts/send-gala-photos.ts --send --force
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

import { sendGalaPhotos, DEFAULT_GALA_SLUG, DEFAULT_ALBUM_SLUG } from '../lib/services/galaPhotos';

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

// ─── CLI parsing ────────────────────────────────────────────────────────────

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((a) => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const send = hasFlag('send');
  const force = hasFlag('force');
  const checkedInOnly = hasFlag('checked-in-only');
  const verbose = hasFlag('verbose');
  const slug = parseArg('slug', DEFAULT_GALA_SLUG)!;
  const albumSlug = parseArg('album-slug', DEFAULT_ALBUM_SLUG)!;
  const testEmail = parseArg('test');
  const galleryUrl = parseArg('gallery-url');
  const googlePhotosUrl = parseArg('google-photos-url');

  console.log('\n── Rotaract NYC Gala 2026 — Photos Sender ──');
  console.log(`Mode:        ${send ? '🟢 LIVE SEND' : '🟡 dry run (no emails sent)'}`);
  console.log(`Audience:    ${checkedInOnly ? 'checked-in attendees only' : 'all ticket holders (going)'}`);
  console.log(`Event slug:  ${slug}`);
  console.log(`Album slug:  ${albumSlug}`);
  if (testEmail) console.log(`Test only:   ${testEmail}`);
  console.log('');

  const result = await sendGalaPhotos(db, {
    send,
    force,
    checkedInOnly,
    slug,
    albumSlug,
    galleryUrl,
    googlePhotosUrl,
    testEmail,
    includeRecipients: !send || verbose,
    onLog: (line) => console.log(`   ${line}`),
  });

  console.log(`\n── Result ──`);
  console.log(`   Event ID:       ${result.eventId ?? '(none)'}`);
  console.log(`   Gallery URL:    ${result.galleryUrl}`);
  console.log(`   Google URL:     ${result.googlePhotosUrl || '(none)'}`);
  console.log(`   Album cover:    ${result.coverImageUrl ? 'found' : '(not found)'}`);
  console.log(`   Resolved:       ${result.resolved}  (${result.members} members · ${result.guests} guests)`);
  console.log(`   Dupes skipped:  ${result.dupes}`);
  if (result.recipients) {
    console.log(`   Recipients:`);
    result.recipients.forEach((r) => console.log(`     · ${r.firstName} <${r.email}>  [${r.source}]`));
  }
  if (result.skipped === 'already-sent') {
    console.log(`\n🛑 Already sent on ${result.alreadySentAt}. Use --force to override.`);
    return;
  }
  if (send) {
    console.log(`\n   → done: ${result.sent} sent, ${result.failed} failed`);
    if (result.errors?.length) {
      console.log(`   errors:`);
      result.errors.forEach((e) => console.log(`     ✗ ${e}`));
    }
  } else {
    console.log(`\n💡 Dry run complete. Re-run with --send to actually deliver these emails.`);
    console.log(`   Tip: --send --test=you@example.com  → fire a single test first.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Script failed:', err);
    process.exit(1);
  });
