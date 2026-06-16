/**
 * Google Workspace — committee group emails (Admin SDK Directory → Groups).
 *
 * A Google Group is a real group-email distribution list: mail sent to
 * `community-service@{domain}` fans out to every member of the group. This
 * module creates/manages those groups and (separately) exposes membership
 * helpers.
 *
 * IMPORTANT: the membership helpers (addGroupMember / removeGroupMember) are
 * intentionally NOT wired into the committee join/leave flow yet. The feature
 * is "ready to use" — groups can be created empty — but no one is auto-added
 * until that wiring is deliberately turned on.
 *
 * Setup prerequisites (in addition to the user-provisioning setup):
 *   - Authorize the service account's client ID for these DWD scopes:
 *       https://www.googleapis.com/auth/admin.directory.group
 *       https://www.googleapis.com/auth/admin.directory.group.member
 */
import { google } from 'googleapis';
import {
  getGroupsAuth,
  getWorkspaceDomain,
  isGroupsConfigured,
} from './client';

function groupsApi() {
  return google.admin({ version: 'directory_v1', auth: getGroupsAuth() });
}

export { isGroupsConfigured };

// ─── Email derivation ───

/**
 * Derive a committee's group email from its slug, e.g.
 * `marketing-communications` → `marketing-communications@{domain}`.
 * Slugs are already URL-safe (lowercase, hyphenated), which is also a valid
 * Google Group local-part.
 */
export function committeeGroupEmail(slug: string): string {
  const domain = getWorkspaceDomain() || 'example.com';
  return `${slug}@${domain}`;
}

// ─── Group lifecycle ───

export interface GroupInfo {
  id: string;
  email: string;
  name: string;
  description?: string;
}

/** Whether a group already exists for the given email. */
export async function groupExists(email: string): Promise<boolean> {
  try {
    await groupsApi().groups.get({ groupKey: email });
    return true;
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 404) return false;
    throw err;
  }
}

/** Fetch a group, or null if it doesn't exist. */
export async function getGroup(email: string): Promise<GroupInfo | null> {
  try {
    const res = await groupsApi().groups.get({ groupKey: email });
    return {
      id: res.data.id || '',
      email: res.data.email || email,
      name: res.data.name || '',
      description: res.data.description || '',
    };
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 404) return null;
    throw err;
  }
}

export interface CreateGroupInput {
  email: string;
  name: string;
  description?: string;
}

/** Create a Google Group. Throws if it already exists (use ensureGroup for idempotency). */
export async function createGroup(input: CreateGroupInput): Promise<GroupInfo> {
  if (!isGroupsConfigured()) {
    throw new Error('Workspace group management is not configured.');
  }
  const res = await groupsApi().groups.insert({
    requestBody: {
      email: input.email,
      name: input.name,
      description: input.description || '',
    },
  });
  return {
    id: res.data.id || '',
    email: res.data.email || input.email,
    name: res.data.name || input.name,
    description: res.data.description || input.description || '',
  };
}

/**
 * Idempotently ensure a group exists. Returns the existing group when present,
 * otherwise creates it. Safe to call repeatedly (e.g. a "set up all committee
 * groups" action).
 */
export async function ensureGroup(input: CreateGroupInput): Promise<{ group: GroupInfo; created: boolean }> {
  const existing = await getGroup(input.email);
  if (existing) return { group: existing, created: false };
  const group = await createGroup(input);
  return { group, created: true };
}

/** Delete a group. */
export async function deleteGroup(email: string): Promise<void> {
  if (!isGroupsConfigured()) {
    throw new Error('Workspace group management is not configured.');
  }
  await groupsApi().groups.delete({ groupKey: email });
}

// ─── Membership (BUILT, but not auto-wired to committee join/leave yet) ───

export type GroupMemberRole = 'MEMBER' | 'MANAGER' | 'OWNER';

/**
 * Add a member to a group. Idempotent — a 409 (already a member) resolves
 * successfully. NOTE: not called automatically anywhere yet; wiring this into
 * the committee join flow is a separate, deliberate step.
 */
export async function addGroupMember(
  groupEmail: string,
  memberEmail: string,
  role: GroupMemberRole = 'MEMBER',
): Promise<void> {
  if (!isGroupsConfigured()) {
    throw new Error('Workspace group management is not configured.');
  }
  try {
    await groupsApi().members.insert({
      groupKey: groupEmail,
      requestBody: { email: memberEmail, role },
    });
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 409) return; // already a member — fine
    throw err;
  }
}

/**
 * Remove a member from a group. Idempotent — a 404 (not a member / no such
 * group member) resolves successfully.
 */
export async function removeGroupMember(
  groupEmail: string,
  memberEmail: string,
): Promise<void> {
  if (!isGroupsConfigured()) {
    throw new Error('Workspace group management is not configured.');
  }
  try {
    await groupsApi().members.delete({
      groupKey: groupEmail,
      memberKey: memberEmail,
    });
  } catch (err: any) {
    const code = err?.code || err?.response?.status;
    if (code === 404) return; // not a member — fine
    throw err;
  }
}

/** List the email addresses of a group's members. */
export async function listGroupMembers(groupEmail: string): Promise<string[]> {
  if (!isGroupsConfigured()) {
    throw new Error('Workspace group management is not configured.');
  }
  const emails: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await groupsApi().members.list({
      groupKey: groupEmail,
      maxResults: 200,
      pageToken,
    });
    for (const m of res.data.members || []) {
      if (m.email) emails.push(m.email);
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return emails;
}

// ─── Diagnostics ───

export interface GroupsConnectionStatus {
  configured: boolean;
  ok: boolean;
  domain?: string;
  error?: string;
}

/**
 * Verify the group DWD scopes are authorized by making a minimal authenticated
 * Groups call. Distinguishes "not configured" from "configured but the group
 * scopes aren't authorized yet" so the admin UI can guide setup precisely.
 */
export async function checkGroupsConnection(): Promise<GroupsConnectionStatus> {
  const domain = getWorkspaceDomain();
  if (!isGroupsConfigured()) {
    return { configured: false, ok: false, domain };
  }
  try {
    await groupsApi().groups.list({ domain, maxResults: 1 });
    return { configured: true, ok: true, domain };
  } catch (err: any) {
    const reason =
      err?.response?.data?.error?.message || err?.message || 'Unknown error';
    return { configured: true, ok: false, domain, error: reason };
  }
}
