/**
 * One-time, idempotent backfill: write explicit `host` and `audience` onto
 * every events document.
 *
 * Required because firestore.rules are not filters. The member portal queries
 * the events collection directly from the browser (usePortalEvents →
 * useCollection), so the query must carry a where('audience','in',[...])
 * clause mirroring the rule — and that clause matches no document missing the
 * field. Without this backfill, members see an empty list.
 *
 * Existing documents are all ours and all public, so this preserves current
 * behaviour exactly. Safe to re-run: documents that already carry both fields
 * are skipped.
 *
 *   npm run backfill:event-host:dry
 *   npm run backfill:event-host
 */
import fs from 'fs';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

function loadServiceAccount() {
  const raw = fs.readFileSync('.env.local', 'utf8');
  const line = raw.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
  if (!line) throw new Error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
  let value = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  try {
    return JSON.parse(value);
  } catch {
    // Some env snapshots contain literal newlines inside private_key.
    return JSON.parse(value.replace(/\n/g, '\\n'));
  }
}

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const db = admin.firestore();

const snap = await db.collection('events').get();
console.log(`Found ${snap.size} events. ${DRY_RUN ? 'DRY RUN — no writes.' : 'Writing.'}\n`);

let updated = 0;
let skipped = 0;
let batch = db.batch();
let pending = 0;

for (const doc of snap.docs) {
  const data = doc.data();
  if (data.host && data.audience) {
    skipped++;
    continue;
  }
  const host = data.host ?? 'rotaract';
  // Preserve existing visibility exactly: isPublic is the current source of truth.
  const audience = data.audience ?? (data.isPublic === true ? 'public' : 'members');
  console.log(
    `  ${doc.id}  ${String(data.title ?? '').slice(0, 46).padEnd(46)} → host=${host} audience=${audience}`,
  );
  if (!DRY_RUN) {
    batch.update(doc.ref, { host, audience });
    pending++;
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  updated++;
}

if (!DRY_RUN && pending > 0) await batch.commit();
console.log(
  `\n${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}   already tagged (skipped): ${skipped}`,
);
process.exit(0);
