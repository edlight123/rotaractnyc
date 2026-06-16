/**
 * Diagnostic: verify Google Workspace user-provisioning is correctly wired up.
 *
 * Usage:
 *   npx tsx scripts/check-workspace-provisioning.ts
 *
 * It loads .env.local exactly like Next.js (so the single-quoted service-account
 * JSON parses), then probes the Admin SDK Directory API via Domain-Wide
 * Delegation and prints an actionable result.
 *
 * Interpreting the result:
 *   - configured:false → one of GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_WORKSPACE_DOMAIN
 *     / GOOGLE_WORKSPACE_ADMIN_EMAIL is missing.
 *   - "invalid_grant: Invalid email or User ID" → GOOGLE_WORKSPACE_ADMIN_EMAIL is
 *     not the PRIMARY email of a real super-admin (aliases / non-existent users
 *     can't be impersonated), or DWD hasn't propagated yet (wait a few minutes).
 *   - "unauthorized_client" → the service account's client ID isn't authorized
 *     for the admin.directory.user scope under Admin console → Security → API
 *     Controls → Domain-wide Delegation.
 *   - "insufficient permissions" / 403 → the impersonated admin lacks the
 *     privilege to manage users, or the Admin SDK API isn't enabled.
 *   - ok:true → provisioning is ready.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

(async () => {
  // Dynamic import AFTER env load — a static import would be hoisted and capture
  // the env vars before loadEnvConfig() runs.
  const { checkDirectoryConnection } = await import('../lib/google/directory');
  const status = await checkDirectoryConnection();

  console.log('\nWorkspace provisioning check');
  console.log('───────────────────────────');
  console.log(`configured : ${status.configured}`);
  console.log(`connection : ${status.ok ? 'OK ✅' : 'FAILED ❌'}`);
  console.log(`domain     : ${status.domain || '(unset)'}`);
  if (status.error) console.log(`error      : ${status.error}`);

  if (status.ok) {
    console.log('\nReady — the "Create a Workspace account" toggle will appear in Add Member.\n');
  } else if (!status.configured) {
    console.log(
      '\nSet GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_WORKSPACE_DOMAIN, and ' +
        'GOOGLE_WORKSPACE_ADMIN_EMAIL, then re-run.\n',
    );
  } else {
    console.log(
      '\nProvisioning is configured but the Directory call failed — see the ' +
        'error above and the notes at the top of this script.\n',
    );
  }

  process.exit(status.ok ? 0 : 1);
})();
