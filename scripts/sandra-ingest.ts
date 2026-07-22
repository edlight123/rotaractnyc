/**
 * Sandra corpus ingestion (manual run). Uses the shared service so the CLI and
 * the Vercel cron stay in sync.
 *
 * Credentials (env):
 *   GOOGLE_SA_JSON           — service account with read access to the shared Drive
 *   FIREBASE_SERVICE_ACCOUNT — website Firebase admin (Firestore write)
 *
 * Run: npx dotenv-cli -e .env.sa -e .env.local -- npx tsx scripts/sandra-ingest.ts
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { runSandraIngest } from '../lib/services/sandraIngest';

function parseKey(raw: string) {
  let s = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!s.startsWith('{')) { try { const d = Buffer.from(s, 'base64').toString('utf8'); if (d.trim().startsWith('{')) s = d; } catch { /* */ } }
  let safe = ''; for (const ch of s) { const c = ch.charCodeAt(0); safe += c >= 0x20 ? ch : c === 10 ? '\\n' : c === 13 ? '\\r' : c === 9 ? '\\t' : '\\u' + c.toString(16).padStart(4, '0'); }
  return JSON.parse(safe);
}

(async () => {
  if (!getApps().length) initializeApp({ credential: cert(parseKey(process.env.FIREBASE_SERVICE_ACCOUNT || '')) });
  const result = await runSandraIngest(getFirestore());
  console.log(`✅ Ingested ${result.ok}/${result.total} docs into sandra_corpus.`);
  if (result.errors.length) console.log('Errors:\n  ' + result.errors.join('\n  '));
  process.exit(result.errors.length ? 1 : 0);
})().catch((e) => { console.error('Fatal:', e); process.exit(1); });
