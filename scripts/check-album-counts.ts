import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    let sa: any;
    try { sa = JSON.parse(saJson); }
    catch { sa = JSON.parse(saJson.replace(/\n/g, '\\n')); }
    initializeApp({ credential: cert(sa) });
  }
}
const db = getFirestore();

async function main() {
  const albums = await db.collection('albums').orderBy('slug').get();
  console.log('\n📊 Album Photo Counts in Firestore:\n');
  let total = 0;
  for (const doc of albums.docs) {
    const d = doc.data();
    const gallery = await db.collection('gallery').where('albumId', '==', doc.id).get();
    const actualCount = gallery.size;
    total += actualCount;
    const match = actualCount === d.photoCount ? '✅' : '⚠️';
    console.log(`  ${match} ${d.slug.padEnd(30)} doc says: ${String(d.photoCount).padStart(3)}  actual gallery docs: ${String(actualCount).padStart(3)}`);
  }
  console.log(`\n  📸 Total photos across all albums: ${total}`);
}

main().catch(console.error);
