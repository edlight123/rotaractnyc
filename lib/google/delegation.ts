/**
 * Gmail mailbox delegation for office accounts (president@…, treasurer@…).
 *
 * When a board title transfers, the new holder should be able to read/send
 * from the office mailbox without a password handover. Gmail supports this
 * natively via delegates — this module grants/revokes them through the Gmail
 * API using Domain-Wide Delegation, impersonating the OFFICE account itself
 * (the delegator).
 *
 * Requirements (degrades gracefully when unmet — callers get {ok:false,reason}):
 *  1. The service-account client ID must be authorized in the Admin console
 *     for the scope: https://www.googleapis.com/auth/gmail.settings.sharing
 *  2. The office address must exist as a real Workspace USER mailbox.
 *  3. Gmail only allows delegates in the SAME domain — members signed in with
 *     personal gmail.com addresses cannot be delegates until they have an
 *     org account (see Workspace provisioning in the members API).
 */
import { google } from 'googleapis';
import { getWorkspaceDomain, isDirectoryConfigured } from './client';

const PROVISIONING_SA_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  process.env.FIREBASE_SERVICE_ACCOUNT;

const DELEGATION_SCOPE = 'https://www.googleapis.com/auth/gmail.settings.sharing';

export interface DelegationResult {
  ok: boolean;
  reason?: string;
}

function parseKey(): Record<string, any> | null {
  if (!PROVISIONING_SA_KEY) return null;
  try {
    return JSON.parse(PROVISIONING_SA_KEY);
  } catch {
    try {
      return JSON.parse(PROVISIONING_SA_KEY.replace(/\n/g, '\\n'));
    } catch {
      return null;
    }
  }
}

/** Gmail client impersonating the office (delegator) mailbox. */
function gmailAs(officeEmail: string) {
  const credentials = parseKey();
  if (!credentials) throw new Error('Service account key not configured');
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [DELEGATION_SCOPE],
    subject: officeEmail,
  });
  return google.gmail({ version: 'v1', auth });
}

function sameDomain(email: string): boolean {
  const domain = getWorkspaceDomain();
  return !!domain && email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

/**
 * Grant `delegateEmail` access to the `officeEmail` mailbox. Idempotent —
 * an already-existing delegate resolves ok.
 */
export async function grantOfficeDelegate(officeEmail: string, delegateEmail: string): Promise<DelegationResult> {
  if (!isDirectoryConfigured()) return { ok: false, reason: 'Workspace integration not configured' };
  if (!sameDomain(delegateEmail)) {
    return { ok: false, reason: `Gmail delegates must be in the ${getWorkspaceDomain()} domain — ${delegateEmail} is external. Provision an org account for them first.` };
  }
  try {
    await gmailAs(officeEmail).users.settings.delegates.create({
      userId: 'me',
      requestBody: { delegateEmail, verificationStatus: 'accepted' },
    });
    return { ok: true };
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 409) return { ok: true }; // already a delegate
    const msg = err?.response?.data?.error?.message || err?.message || 'Unknown error';
    if (/unauthorized_client/i.test(String(msg))) {
      return { ok: false, reason: `The gmail.settings.sharing scope isn't authorized for the service account in the Admin console (Security → API Controls → Domain-wide Delegation).` };
    }
    return { ok: false, reason: msg };
  }
}

/** Revoke `delegateEmail`'s access to the `officeEmail` mailbox. Idempotent. */
export async function revokeOfficeDelegate(officeEmail: string, delegateEmail: string): Promise<DelegationResult> {
  if (!isDirectoryConfigured()) return { ok: false, reason: 'Workspace integration not configured' };
  if (!sameDomain(delegateEmail)) return { ok: true }; // externals were never delegates
  try {
    await gmailAs(officeEmail).users.settings.delegates.delete({
      userId: 'me',
      delegateEmail,
    });
    return { ok: true };
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 404) return { ok: true }; // wasn't a delegate
    return { ok: false, reason: err?.response?.data?.error?.message || err?.message || 'Unknown error' };
  }
}
