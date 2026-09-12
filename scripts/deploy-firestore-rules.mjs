#!/usr/bin/env node
/**
 * Deploy firestore.rules via the Firebase Rules REST API.
 *
 *   npm run deploy:rules            # deploy
 *   npm run deploy:rules:dry        # read-only: diff live vs local, no writes
 *
 * Why this exists instead of `firebase deploy --only firestore:rules`:
 *
 * The Firebase CLI runs a precheck ("ensuring required API
 * firestore.googleapis.com is enabled") that calls serviceusage.googleapis.com
 * and needs the `serviceusage.services.use` permission. Our operator accounts
 * don't have it on this project, so the CLI fails with HTTP 403 before it ever
 * reaches the rules — even though the Firestore API is plainly enabled, since
 * the whole app runs on it.
 *
 * The Rules REST API skips that precheck. The service account in
 * FIREBASE_SERVICE_ACCOUNT already holds `firebaserules.rulesets.create` and
 * `firebaserules.releases.update`, which is all a rules deploy needs. That
 * keeps the deploy path working without widening anyone's project IAM.
 *
 * Credentials come from the environment (so CI can set them directly) and fall
 * back to .env.local for local runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JWT } from 'google-auth-library';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULES_PATH = path.join(ROOT, 'firestore.rules');
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Load .env.local if the service account isn't already in the environment.
 *
 * Deliberately hand-rolled rather than using node's --env-file: the service
 * account value is a JSON blob wrapped in double quotes, and --env-file ends
 * the value at the JSON's own first quote, yielding "{" and a parse error.
 */
function loadLocalEnv() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

function serviceAccount() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.FIREBASE_SERVICE_ACCOUNT) {
    loadLocalEnv();
  }
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'No service account. Set FIREBASE_SERVICE_ACCOUNT_KEY (or FIREBASE_SERVICE_ACCOUNT), ' +
        'or provide it in .env.local.',
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    // Some environments store the private_key with literal newlines rather
    // than the JSON-escaped \n sequence.
    return JSON.parse(raw.replace(/\n/g, '\\n'));
  }
}

async function main() {
  const sa = serviceAccount();
  const projectId = sa.project_id;

  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const { token } = await client.getAccessToken();

  const api = async (url, init = {}) => {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const body = await res.json();
    if (body.error) {
      throw new Error(`${res.status} ${body.error.status}: ${body.error.message}`);
    }
    return body;
  };

  const base = `https://firebaserules.googleapis.com/v1/projects/${projectId}`;
  const local = fs.readFileSync(RULES_PATH, 'utf8');

  const release = await api(`${base}/releases/cloud.firestore`);
  const liveRuleset = await api(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  const live = liveRuleset.source?.files?.[0]?.content ?? '';

  console.log('project        :', projectId);
  console.log('current ruleset:', release.rulesetName);
  console.log('last deployed  :', release.updateTime);

  if (live === local) {
    console.log('\n✅ Live rules already match firestore.rules — nothing to deploy.');
    return;
  }

  const added = local.split('\n').length - live.split('\n').length;
  console.log(`\nfirestore.rules differs from what is live (${added >= 0 ? '+' : ''}${added} lines).`);

  if (DRY_RUN) {
    console.log('Dry run — no changes made. Re-run without --dry-run to deploy.');
    return;
  }

  // Creating the ruleset compiles and validates it server-side, so a syntax
  // error fails here, before anything live is touched.
  const created = await api(`${base}/rulesets`, {
    method: 'POST',
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: local }] } }),
  });
  console.log('new ruleset    :', created.name);

  const released = await api(`${base}/releases/cloud.firestore`, {
    method: 'PATCH',
    body: JSON.stringify({
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: created.name,
      },
    }),
  });

  console.log('released       :', released.rulesetName);
  console.log('updateTime     :', released.updateTime);
  console.log(`\n✅ Firestore rules are live. Rollback target: ${release.rulesetName}`);
}

main().catch((err) => {
  console.error('\n❌ Rules deploy failed:', err.message);
  console.error('Live rules were not changed.');
  process.exit(1);
});
