/**
 * Deploy composite indexes from firestore.indexes.json via the Firestore
 * Admin REST API, authenticating with FIREBASE_SERVICE_ACCOUNT.
 *
 * Mirrors scripts/deploy-firestore-rules.mjs, and exists for the same reason:
 * it avoids needing an interactive `firebase login` or a project-level IAM
 * change just to ship an index.
 *
 * Creating an index that already exists returns HTTP 409, which is treated as
 * success so the script is idempotent.
 *
 *   npm run deploy:indexes:dry
 *   npm run deploy:indexes
 */
import fs from 'fs';
import { JWT } from 'google-auth-library';

const DRY_RUN = process.argv.includes('--dry-run');

function serviceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const raw =
    inline ||
    (() => {
      const env = fs.readFileSync('.env.local', 'utf8');
      const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
      if (!line) throw new Error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
      let v = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return v;
    })();
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/\n/g, '\\n'));
  }
}

const sa = serviceAccount();
const projectId = sa.project_id;

const client = new JWT({
  email: sa.client_email,
  key: sa.private_key.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const { token } = await client.getAccessToken();

const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`;

const desired = JSON.parse(fs.readFileSync('firestore.indexes.json', 'utf8')).indexes ?? [];
console.log(`${desired.length} composite index(es) declared. ${DRY_RUN ? 'DRY RUN.' : ''}\n`);

let created = 0;
let existing = 0;
let failed = 0;

for (const index of desired) {
  const label = `${index.collectionGroup}: ${index.fields
    .map((f) => `${f.fieldPath} ${f.order ?? f.arrayConfig ?? ''}`.trim())
    .join(', ')}`;

  if (DRY_RUN) {
    console.log(`  would ensure  ${label}`);
    continue;
  }

  const res = await fetch(`${base}/${index.collectionGroup}/indexes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryScope: index.queryScope || 'COLLECTION',
      fields: index.fields,
    }),
  });

  if (res.ok) {
    console.log(`  ✅ creating    ${label}`);
    created++;
  } else if (res.status === 409) {
    console.log(`  ·  exists      ${label}`);
    existing++;
  } else {
    console.log(`  ❌ failed(${res.status}) ${label}`);
    console.log(`     ${(await res.text()).slice(0, 300)}`);
    failed++;
  }
}

if (!DRY_RUN) {
  console.log(`\ncreated: ${created}   already existed: ${existing}   failed: ${failed}`);
  console.log('Index builds are asynchronous — a new index takes a few minutes to become queryable.');
}
process.exit(failed > 0 ? 1 : 0);
