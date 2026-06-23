/**
 * Renders the gala "photos are ready" email to /tmp for visual QA.
 *
 * Usage:
 *   npx tsx scripts/preview-gala-photos.ts
 *
 * Then open the printed file path in a browser (or VS Code's Simple Browser).
 *
 * The hero image uses the REAL imported album cover from Firebase (the exact
 * image recipients will see). If Firebase can't be reached, it falls back to
 * the local gala poster so the preview still renders offline.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { galaPhotosEmail } from '../lib/email/templates';

const ALBUM_SLUG = 'gala-2026';
const OUT_DIR = '/tmp/gala-photos-preview';
fs.mkdirSync(OUT_DIR, { recursive: true });

/** Pull the real album cover from Firestore so the preview matches the send. */
async function fetchRealCover(): Promise<string | undefined> {
  try {
    const saJson =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saJson) return undefined;
    if (!getApps().length) {
      let sa: ServiceAccount;
      try {
        sa = JSON.parse(saJson) as ServiceAccount;
      } catch {
        sa = JSON.parse(saJson.replace(/\n/g, '\\n')) as ServiceAccount;
      }
      initializeApp({ credential: cert(sa) });
    }
    const snap = await getFirestore()
      .collection('albums')
      .where('slug', '==', ALBUM_SLUG)
      .limit(1)
      .get();
    if (snap.empty) return undefined;
    return (snap.docs[0].data().coverPhotoUrl as string | undefined) || undefined;
  } catch {
    return undefined;
  }
}

// Copy the poster in as a local hero fallback so the preview always renders.
const POSTER_SRC = path.resolve(__dirname, '../public/rotaract-gala-2026-poster.jpg');
if (fs.existsSync(POSTER_SRC)) {
  fs.copyFileSync(POSTER_SRC, path.join(OUT_DIR, 'hero.jpg'));
}

// Inline a 1x1 transparent logo placeholder so the header isn't a broken image.
const LOGO_OUT = path.join(OUT_DIR, 'rotaract-logo-white.png');
if (!fs.existsSync(LOGO_OUT)) {
  fs.writeFileSync(
    LOGO_OUT,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    ),
  );
}

async function render() {
  const realCover = await fetchRealCover();
  const coverImageUrl = realCover ?? 'hero.jpg'; // real Firebase cover, or local fallback
  console.log(
    realCover
      ? `🖼️  Using real album cover from Firebase`
      : `🖼️  Firebase cover unavailable — using local poster fallback`,
  );

  const built = galaPhotosEmail({
    firstName: 'Christina',
    galleryUrl: 'https://rotaractnyc.org/gallery/gala-2026',
    googlePhotosUrl: 'https://photos.app.goo.gl/ovZzH8gfvS4WFCNQ7',
    donateUrl: 'https://rotaractnyc.org/donate',
    coverImageUrl,
  });

  // Patch absolute logo references so they render locally.
  function localize(html: string): string {
    return html.replace(
      /https:\/\/rotaractnyc\.org\/rotaract-logo-white\.png/g,
      'rotaract-logo-white.png',
    );
  }

  const wrap = `<!doctype html><html><head><meta charset="utf-8"><title>Gala photos email preview</title>
  <style>body{margin:0;background:#e7e9ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .meta{max-width:680px;margin:24px auto;padding:16px 20px;background:#fff;border-radius:10px;border:1px solid #d4d8e0;}
  .meta h2{margin:0 0 6px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;}
  .meta p{margin:0 0 6px;font-size:15px;color:#111;}
  .meta .subj{font-weight:700;}
  pre{white-space:pre-wrap;font-size:12px;color:#374151;background:#f4f5f7;padding:12px;border-radius:6px;}
  </style></head><body>
  <div class="meta">
    <h2>Gala 2026 — "photos are ready" email</h2>
    <p class="subj">Subject: ${built.subject.replace(/</g, '&lt;')}</p>
    <details><summary style="cursor:pointer;color:#9B1B30;font-size:13px;font-weight:600;">View plain-text version</summary><pre>${built.text.replace(/</g, '&lt;')}</pre></details>
  </div>
  ${localize(built.html)}
</body></html>`;

  const out = path.join(OUT_DIR, 'index.html');
  fs.writeFileSync(out, wrap);
  console.log(`✅ Gala photos email preview written`);
  console.log(`   → ${out}`);
  process.exit(0);
}

render();
