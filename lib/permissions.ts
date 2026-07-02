/**
 * Central role/capability helpers.
 *
 * The portal has four base roles (member | board | treasurer | president),
 * plus two scoped capabilities layered on top:
 *
 *  - Membership chair — a member whose `boardTitle` is "Director of
 *    Membership" (or "Membership Chair") can manage the membership pipeline
 *    (approve/reject pending members, edit member profiles) even without a
 *    full admin role.
 *  - Committee chair — a member listed as `chairId` / `coChairId` on a
 *    committee can manage THAT committee (roster, updates, docs).
 */

export const ADMIN_ROLES = ['board', 'treasurer', 'president'] as const;

export const MEMBERSHIP_CHAIR_TITLES = ['Director of Membership', 'Membership Chair'] as const;

interface RoleLike {
  role?: string;
  boardTitle?: string;
}

export function isAdminRole(member: RoleLike | null | undefined): boolean {
  return !!member && (ADMIN_ROLES as readonly string[]).includes(member.role || '');
}

export function isMembershipChair(member: RoleLike | null | undefined): boolean {
  return !!member && (MEMBERSHIP_CHAIR_TITLES as readonly string[]).includes(member.boardTitle || '');
}

/** Can approve/reject pending members and edit member profiles. */
export function canManageMembership(member: RoleLike | null | undefined): boolean {
  return isAdminRole(member) || isMembershipChair(member);
}

interface CommitteeLike {
  chairId?: string;
  coChairId?: string;
}

export function isCommitteeChair(uid: string | null | undefined, committee: CommitteeLike | null | undefined): boolean {
  if (!uid || !committee) return false;
  return committee.chairId === uid || committee.coChairId === uid;
}
