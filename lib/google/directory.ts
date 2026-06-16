/**
 * Google Workspace — user provisioning (Admin SDK Directory API).
 *
 * Creates and deactivates @{domain} member accounts. All calls authenticate
 * as a super-admin via Domain-Wide Delegation (see `getDirectoryAuth`). Every
 * exported function first checks `isDirectoryConfigured()` so callers can wire
 * provisioning in defensively — if the env vars aren't set, these throw a
 * clear, actionable error rather than making a malformed API call.
 *
 * Setup prerequisites (one-time, in the Google Admin console):
 *   1. A paid/nonprofit Workspace on the domain.
 *   2. Admin SDK API enabled in the Cloud project.
 *   3. The service account's client ID authorized for the
 *      `admin.directory.user` scope under Security → API Controls →
 *      Domain-wide Delegation.
 *   4. Env: GOOGLE_WORKSPACE_DOMAIN + GOOGLE_WORKSPACE_ADMIN_EMAIL.
 */
import { randomInt } from 'crypto';
import { google } from 'googleapis';
import {
  getDirectoryAuth,
  getWorkspaceDomain,
  isDirectoryConfigured,
} from './client';

function directory() {
  return google.admin({ version: 'directory_v1', auth: getDirectoryAuth() });
}

export { isDirectoryConfigured };

// ─── Email generation ───

/**
 * Slugify a name part to the local portion of an email: lowercase ASCII,
 * letters and digits only (diacritics stripped, spaces/punctuation removed).
 */
function slugifyNamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Suggest an org email `first.last@domain` (no collision check). Falls back
 * gracefully when a name part is empty.
 */
export function suggestOrgEmail(firstName: string, lastName: string): string {
  const domain = getWorkspaceDomain() || 'example.com';
  const first = slugifyNamePart(firstName);
  const last = slugifyNamePart(lastName);
  const local = [first, last].filter(Boolean).join('.') || 'member';
  return `${local}@${domain}`;
}

/** Whether a Workspace account already exists for the given email. */
export async function emailExists(email: string): Promise<boolean> {
  try {
    await directory().users.get({ userKey: email });
    return true;
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 404) return false;
    throw err;
  }
}

/**
 * Generate an available org email, checking for collisions and appending a
 * numeric suffix when needed (`jane.doe`, `jane.doe2`, `jane.doe3`, …).
 */
export async function generateOrgEmail(
  firstName: string,
  lastName: string,
): Promise<string> {
  const base = suggestOrgEmail(firstName, lastName);
  const [local, domain] = base.split('@');

  // Try the bare local part first, then numeric suffixes.
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? `${local}@${domain}` : `${local}${i}@${domain}`;
    if (!(await emailExists(candidate))) return candidate;
  }
  // Extremely unlikely; fall back to a random suffix.
  return `${local}.${randomInt(1000, 9999)}@${domain}`;
}

// ─── Password generation ───

/**
 * Generate a strong, human-typable temporary password. Guarantees at least
 * one lowercase, uppercase, digit, and symbol so it satisfies any reasonable
 * Workspace password policy. The member is forced to change it at first login.
 */
export function generateTemporaryPassword(length = 16): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz'; // no l/o (ambiguous)
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O
  const digits = '23456789'; // no 0/1
  const symbols = '!@#$%*?';
  const all = lower + upper + digits + symbols;

  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));

  // Fisher–Yates shuffle so the guaranteed classes aren't always in front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ─── User lifecycle ───

export interface CreateWorkspaceUserInput {
  firstName: string;
  lastName: string;
  /** Pre-resolved org email. If omitted, one is generated with collision check. */
  orgEmail?: string;
  /** Personal email — set as the account's recovery address. */
  recoveryEmail?: string;
}

export interface CreateWorkspaceUserResult {
  orgEmail: string;
  temporaryPassword: string;
  userId: string;
}

/**
 * Create a new Workspace user. The account is created with a temporary
 * password and `changePasswordAtNextLogin`, so the member sets their own
 * password (or just uses "Sign in with Google") on first login.
 */
export async function createWorkspaceUser(
  input: CreateWorkspaceUserInput,
): Promise<CreateWorkspaceUserResult> {
  if (!isDirectoryConfigured()) {
    throw new Error('Workspace provisioning is not configured.');
  }

  const orgEmail =
    input.orgEmail || (await generateOrgEmail(input.firstName, input.lastName));
  const temporaryPassword = generateTemporaryPassword();

  const requestBody: Record<string, any> = {
    primaryEmail: orgEmail,
    name: { givenName: input.firstName, familyName: input.lastName },
    password: temporaryPassword,
    changePasswordAtNextLogin: true,
  };
  if (input.recoveryEmail) requestBody.recoveryEmail = input.recoveryEmail;

  const res = await directory().users.insert({ requestBody });
  return {
    orgEmail,
    temporaryPassword,
    userId: res.data.id || orgEmail,
  };
}

/**
 * Suspend (deactivate) a Workspace user — used on offboarding so the paid seat
 * can be reclaimed without permanently deleting the account/history.
 */
export async function suspendWorkspaceUser(orgEmail: string): Promise<void> {
  if (!isDirectoryConfigured()) {
    throw new Error('Workspace provisioning is not configured.');
  }
  await directory().users.update({
    userKey: orgEmail,
    requestBody: { suspended: true },
  });
}

// ─── Diagnostics ───

export interface DirectoryConnectionStatus {
  configured: boolean;
  ok: boolean;
  domain?: string;
  error?: string;
}

/**
 * Verify that Domain-Wide Delegation is correctly set up by making a minimal
 * authenticated Directory call. Surfaces a friendly error for the admin UI so
 * setup problems (missing DWD authorization, wrong admin email, API not
 * enabled) are diagnosable without reading server logs.
 */
export async function checkDirectoryConnection(): Promise<DirectoryConnectionStatus> {
  const domain = getWorkspaceDomain();
  if (!isDirectoryConfigured()) {
    return { configured: false, ok: false, domain };
  }
  try {
    await directory().users.list({ domain, maxResults: 1 });
    return { configured: true, ok: true, domain };
  } catch (err: any) {
    const reason =
      err?.response?.data?.error?.message || err?.message || 'Unknown error';
    return { configured: true, ok: false, domain, error: reason };
  }
}
