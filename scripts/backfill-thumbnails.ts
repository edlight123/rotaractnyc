/**
 * scripts/backfill-thumbnails.ts
 *
 * One-off script to generate 480px thumbnails for all existing gallery photos
 * that don't have a thumbnailUrl yet.
 *
 * Usage:
 *   npx tsx scripts/backfill-thumbnails.ts
 *   npx tsx scripts/backfill-thumbnails.ts --dry-run
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import sharp from 'sharp';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Init Firebase ───
function initFirebase() {
  if (getApps().length) return;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    let sa: ServiceAccount;
    try { sa = JSON.parse(saJson) as ServiceAccount; }
    catch {
      // dotenv may turn literal \n inside the key into real newlines — re-escape them
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
    throw new Error('No Firebase credentials found.');
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function main() {
  initFirebase();
  const db = getFirestore();
  const bucket = getStorage().bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET
  );

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumb-'));

  // Get all gallery photos without a thumbnailUrl
  const snap = await db.collection('gallery').get();
  const needsThumb = snap.docs.filter((d) => {
    const data = d.data();
    return !data.thumbnailUrl && data.url && data.storagePath;
  });

  console.log(`Found ${snap.size} total photos, ${needsThumb.length} need thumbnails.`);
  if (DRY_RUN) {
    console.log('Dry run — no changes made.');
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < needsThumb.length; i++) {
    const doc = needsThumb[i];
    const data = doc.data();
    const storagePath = data.storagePath as string;
    const thumbStoragePath = storagePath.replace(/\.jpg$/i, '_thumb.jpg');
    const localFull = path.join(tmpDir, `full_${i}.jpg`);
    const localThumb = path.join(tmpDir, `thumb_${i}.jpg`);

    process.stdout.write(`\r  📐 Generating thumbnail ${i + 1}/${needsThumb.length}: ${storagePath}...`);

    try {
      // Download original
      await downloadFile(data.url, localFull);

      // Resize
      await sharp(localFull)
        .resize(480, 480, { fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toFile(localThumb);

      // Upload thumbnail
      await bucket.upload(localThumb, {
        destination: thumbStoragePath,
        metadata: { contentType: 'image/jpeg' },
        public: true,
      });

      const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbStoragePath}`;

      // Update Firestore doc
      await db.collection('gallery').doc(doc.id).update({ thumbnailUrl });

      success++;
    } catch (err: any) {
      console.log(`\n  ⚠️  Failed for ${doc.id}: ${err.message}`);
      failed++;
    } finally {
      try { fs.unlinkSync(localFull); } catch {}
      try { fs.unlinkSync(localThumb); } catch {}
    }
  }

  // Cleanup temp dir
  try { fs.rmdirSync(tmpDir); } catch {}

  console.log(`\n\n✅ Done! ${success} thumbnails generated, ${failed} failed.`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
