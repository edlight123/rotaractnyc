/**
 * Sandra corpus ingestion — pulls key club Google Docs from the shared Drive,
 * exports them to plain text, and stores them (tagged by access tier) in the
 * Firestore `sandra_corpus` collection. The /api/sandra endpoint reads these at
 * query time and feeds the tier-appropriate, most-relevant docs to Sandra.
 *
 * Credentials (env):
 *   GOOGLE_SA_JSON          — service account with read access to the shared Drive
 *   FIREBASE_SERVICE_ACCOUNT — website Firebase admin (Firestore write)
 *
 * Run: npx dotenv-cli -e .env.sa -e .env.local -- npx tsx scripts/sandra-ingest.ts
 */
import { createSign } from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

type Tier = 'public' | 'member' | 'board';
type Source = { id: string; title: string; tier: Tier };

// Curated corpus — all Google Docs in the RotaractNYC shared drive.
const SOURCES: Source[] = [
  { id: '18L0acwTi3Qp-icCnYKLi1n_inqW8xL7FhZXv4abfNhc', title: 'Annual Calendar 2026–2027', tier: 'public' },
  { id: '1wbHbj9UcrG1s_OPIb44W5bEO1mZCoRCtdDi-dv3Ie7A', title: 'Service Project History & Partner Directory', tier: 'public' },
  { id: '1LfX3gFIjBloyRrdvwrz-N1ljuYWHA6L6X8wQM-YyxAM', title: 'Club Handbook', tier: 'member' },
  { id: '1xR82lkYr8H1Itbdiz1ZS9Mp0VGaWYEUAWkD85OT4I3w', title: 'Committee Charters — Index', tier: 'member' },
  { id: '15CAIYS2jaTnnL8kgwxK7QRPxZZXHkj3Znmk-b5D8YVc', title: 'Events & Fellowship Committee Charter', tier: 'member' },
  { id: '1W7KirYRiZJOTm623tguxWRIi9dEvNFXQlZdoHqcBPUY', title: 'Community Service Committee Charter', tier: 'member' },
  { id: '1NEZQn_7GT8NExjolntLTJmNXqaA3fADTXflqsIQDFK8', title: 'Communications & Marketing Committee Charter', tier: 'member' },
  { id: '1_5CWUzjcd5-R7Xo-Fzq4QmPgRu9rmmwndsqQRrWEcEM', title: 'Professional Development Committee Charter', tier: 'member' },
  { id: '1aFXF9VaxlERM4CQ5tycogqcv1GcWd_c7C9_8Ywg8e54', title: 'Membership Pipeline & Onboarding SOP', tier: 'member' },
  { id: '1-ZbNesg9hVfGfaGVHx133qoYL7FxeQBaJe0NhpqI9FE', title: 'Club Knowledge Digest', tier: 'member' },
  { id: '1rTv0SLlJNRXWYvxFsmPDQS2h1uhE8gLVwj2U-_RSHqQ', title: 'Executive Plan 2026–2027', tier: 'board' },
];

const MAX_CHARS = 12000; // trim any single doc so no one file dominates context

function parseKey(raw: string) {
  let s = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!s.startsWith('{')) { try { const d = Buffer.from(s, 'base64').toString('utf8'); if (d.trim().startsWith('{')) s = d; } catch { /* */ } }
  let safe = ''; for (const ch of s) { const c = ch.charCodeAt(0); safe += c >= 0x20 ? ch : c === 10 ? '\\n' : c === 13 ? '\\r' : c === 9 ? '\\t' : '\\u' + c.toString(16).padStart(4, '0'); }
  return JSON.parse(safe);
}

async function driveToken(): Promise<string> {
  const sa = parseKey(process.env.GOOGLE_SA_JSON || '');
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/drive.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = createSign('RSA-SHA256').update(head).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${sig}` }) });
  const d = (await r.json()) as { access_token?: string; error?: string };
  if (!d.access_token) throw new Error('Drive token: ' + (d.error || JSON.stringify(d)));
  return d.access_token;
}

async function exportDocText(token: string, id: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/plain&supportsAllDrives=true`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`export ${id}: ${r.status} ${(await r.text()).slice(0, 120)}`);
  return (await r.text()).replace(/\n{3,}/g, '\n\n').trim();
}

(async () => {
  const svc = parseKey(process.env.FIREBASE_SERVICE_ACCOUNT || '');
  if (!getApps().length) initializeApp({ credential: cert(svc) });
  const dbf = getFirestore();
  const token = await driveToken();
  console.log('✅ authed (Drive + Firestore)\n');

  let ok = 0;
  for (const s of SOURCES) {
    try {
      const text = (await exportDocText(token, s.id)).slice(0, MAX_CHARS);
      await dbf.collection('sandra_corpus').doc(s.id).set({
        title: s.title, tier: s.tier, text, chars: text.length, updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ [${s.tier}] ${s.title} — ${text.length} chars`);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${s.title}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n🎉 Ingested ${ok}/${SOURCES.length} docs into sandra_corpus.`);
  process.exit(0);
})().catch((e) => { console.error('Fatal:', e); process.exit(1); });
