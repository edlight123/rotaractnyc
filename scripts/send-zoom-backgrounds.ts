/**
 * Email each active board member their Zoom background, at their personal
 * email, with the PNG attached.
 *
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/send-zoom-backgrounds.ts            # dry run: list who would get what
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/send-zoom-backgrounds.ts --send     # send to every board member
 *   ... --send --only someone@gmail.com                                                  # send to one person
 *
 * Dry run also writes each PNG to ./zoom-backgrounds-preview/ to check by eye.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), quiet: true });

import { mkdir, writeFile } from 'fs/promises';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sendEmail } from '../lib/email/send';
import { zoomBackgroundEmail } from '../lib/email/templates';
import { SITE } from '../lib/constants';
import { getCurrentRotaryYear } from '../lib/utils/rotaryYear';
import { boardTitleFor, renderZoomBackground, zoomBackgroundFilename } from '../lib/zoomBackground/render';

if (!getApps().length) {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  let sa: any;
  try { sa = JSON.parse(saJson); }
  catch { sa = JSON.parse(saJson.replace(/\n/g, '\\n')); }
  initializeApp({ credential: cert(sa) });
}

const args = process.argv.slice(2);
const SEND = args.includes('--send');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1]?.toLowerCase() : undefined;

async function main() {
  const snap = await getFirestore()
    .collection('members')
    .where('role', 'in', ['board', 'president', 'treasurer'])
    .where('status', '==', 'active')
    .get();

  const board = snap.docs
    .map((d) => d.data())
    .filter((m) => !m.isSystemAccount)
    .sort((a, b) => (a.boardOrder ?? 999) - (b.boardOrder ?? 999));

  const rotaryYear = getCurrentRotaryYear().replace('-', '–');
  const previewDir = path.resolve(__dirname, '../zoom-backgrounds-preview');
  if (!SEND) await mkdir(previewDir, { recursive: true });

  let sent = 0;
  let failed = 0;
  for (const m of board) {
    const name = m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim();
    const title = boardTitleFor(m);
    const to = (m.personalEmail || '').trim();
    if (ONLY && to.toLowerCase() !== ONLY) continue;
    if (!to) {
      console.log(`⚠️  ${name} (${title}) — no personal email on file, skipped`);
      continue;
    }

    const png = Buffer.from(await (await renderZoomBackground({ name, title, rotaryYear })).arrayBuffer());
    const filename = zoomBackgroundFilename(name);

    if (!SEND) {
      await writeFile(path.join(previewDir, filename), png);
      console.log(`· ${name.padEnd(24)} ${title.padEnd(30)} → ${to}`);
      continue;
    }

    const firstName = m.firstName || name.split(' ')[0];
    const { subject, html, text } = zoomBackgroundEmail({ firstName, title });
    const res = await sendEmail({
      to,
      subject,
      html,
      text,
      replyTo: SITE.email,
      attachments: [{ filename, content: png, contentType: 'image/png' }],
    });
    if (res.success && res.id !== 'paused-skip') {
      sent++;
      console.log(`✅ ${name} → ${to} (${res.id})`);
    } else {
      failed++;
      console.log(`❌ ${name} → ${to}: ${res.id === 'paused-skip' ? 'EMAILS_PAUSED is on' : res.error}`);
    }
  }

  if (SEND) console.log(`\nSent ${sent}, failed ${failed}.`);
  else console.log(`\nDry run. PNGs written to ${previewDir}. Add --send to email them.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
