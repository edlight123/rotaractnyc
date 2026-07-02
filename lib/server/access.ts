/**
 * Server-side capability checks (Admin SDK) — the server counterpart of
 * lib/permissions.ts. Used by API routes to grant scoped powers:
 *
 *  - Events chair — "Director of Events" (or "Events Chair") boardTitle
 *    manages ALL events.
 *  - Committee events — an event linked to a committee (event.committeeId)
 *    can be run by that committee's whole team: chair, co-chair, and members
 *    (check-in, attendee management).
 */
import { adminDb } from '@/lib/firebase/admin';

export const ADMIN_ROLES = ['board', 'treasurer', 'president'] as const;
export const EVENTS_CHAIR_TITLES = ['Director of Events', 'Events Chair'] as const;

export interface MemberLite {
  role?: string;
  boardTitle?: string;
  [key: string]: unknown;
}

export async function getMemberLite(uid: string): Promise<MemberLite | null> {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.exists ? (snap.data() as MemberLite) : null;
}

export function isAdminRole(member: MemberLite | null): boolean {
  return !!member && (ADMIN_ROLES as readonly string[]).includes(member.role || '');
}

export function isEventsChair(member: MemberLite | null): boolean {
  return !!member && (EVENTS_CHAIR_TITLES as readonly string[]).includes(member.boardTitle || '');
}

/**
 * Can `uid` manage the given event (check-in, attendees, edits)?
 * Board+ and the Events chair manage everything; a committee's team manages
 * events linked to their committee.
 */
export async function canManageEvent(uid: string, eventId?: string | null): Promise<boolean> {
  const member = await getMemberLite(uid);
  if (!member) return false;
  if (isAdminRole(member) || isEventsChair(member)) return true;

  if (!eventId) return false;
  const eventSnap = await adminDb.collection('events').doc(eventId).get();
  const committeeId = eventSnap.exists ? (eventSnap.data()!.committeeId as string | undefined) : undefined;
  if (!committeeId) return false;

  const committeeSnap = await adminDb.collection('committees').doc(committeeId).get();
  if (!committeeSnap.exists) return false;
  const c = committeeSnap.data()!;
  return (
    c.chairId === uid ||
    c.coChairId === uid ||
    (Array.isArray(c.memberIds) && c.memberIds.includes(uid))
  );
}
