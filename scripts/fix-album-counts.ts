import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT || '';
  let sa: any;
  try { sa = JSON.parse(saJson); }
  catch { sa = JSON.parse(saJson.replace(/\n/g, '\\n')); }
  initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

async function fixCounts() {
  const albums = await db.collection('albums').get();
  for (const doc of albums.docs) {
    const d = doc.data();
    const gallery = await db.collection('gallery').where('albumId', '==', doc.id).get();
    const actual = gallery.size;
    if (actual !== d.photoCount) {
      await doc.ref.update({ photoCount: actual });
      console.log(`Fixed ${d.slug}: ${d.photoCount} → ${actual}`);
    }
  }
  console.log('Done fixing counts.');
}

fixCounts().catch(console.error);
