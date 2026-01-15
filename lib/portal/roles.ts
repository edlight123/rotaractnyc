import { UserRole } from '@/types/portal';

export const roleHierarchy: Record<UserRole, number> = {
  MEMBER: 1,
  BOARD: 2,
  TREASURER: 3,
  ADMIN: 4,
};

export function hasRole(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function isMember(role: UserRole | undefined): boolean {
  return hasRole(role, 'MEMBER');
}

export function isBoard(role: UserRole | undefined): boolean {
  return hasRole(role, 'BOARD');
}

export function isTreasurer(role: UserRole | undefined): boolean {
  return hasRole(role, 'TREASURER');
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

export function canViewBoardContent(role: UserRole | undefined): boolean {
  return isBoard(role);
}

export function canManageEvents(role: UserRole | undefined): boolean {
  return isBoard(role);
}

export function canManageAnnouncements(role: UserRole | undefined): boolean {
  return isBoard(role);
}

export function canManageDocuments(role: UserRole | undefined): boolean {
  return isBoard(role);
}

export function canManageFinances(role: UserRole | undefined): boolean {
  return isTreasurer(role);
}

export function canManageUsers(role: UserRole | undefined): boolean {
  return isAdmin(role);
}
