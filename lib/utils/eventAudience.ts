/**
 * Event host and audience resolution.
 *
 * Events fall on three independent axes:
 *   `type`     — what does it cost   (free | paid | service | hybrid)
 *   `host`     — whose event is it   (rotaract | rotary | community)
 *   `audience` — who may see it      (public | members | board)
 *
 * Every default here fails closed. Rotaract NYC is invited to most Rotary
 * Metro events, but those invitations are for members unless the host says
 * otherwise, and Rotary Club of New York events are board-only because the
 * club pays. So an event that is not ours and carries no explicit audience
 * resolves to members-only, never public.
 */
import type { EventAudience, EventHost, MemberRole } from '@/types';

/** Roles that may see board-only events. VP is covered by 'board'. */
export const BOARD_ROLES: readonly MemberRole[] = ['board', 'president', 'treasurer'];

export const HOST_LABELS: Record<EventHost, string> = {
  rotaract: 'Rotaract NYC',
  rotary: 'Rotary & District',
  community: 'Community & Partner',
};

export interface HostedEvent {
  host?: EventHost;
  audience?: EventAudience;
  countsForServiceHours?: boolean;
  externalUrl?: string;
}

export interface Viewer {
  signedIn: boolean;
  role?: MemberRole;
}

export function resolveHost(event: HostedEvent): EventHost {
  return event.host ?? 'rotaract';
}

/**
 * Fail closed. If this defaulted to 'public', any write path that forgot to
 * set `audience` — a script, a future importer, a hand-edited document —
 * would publish a private invitation. Resolving from `host` instead means
 * the only way to make a non-Rotaract event public is to say so explicitly.
 */
export function resolveAudience(event: HostedEvent): EventAudience {
  if (event.audience) return event.audience;
  return resolveHost(event) === 'rotaract' ? 'public' : 'members';
}

export function resolveCountsForServiceHours(event: HostedEvent): boolean {
  if (typeof event.countsForServiceHours === 'boolean') return event.countsForServiceHours;
  return resolveHost(event) === 'rotaract';
}

export function canSeeEvent(event: HostedEvent, viewer: Viewer): boolean {
  const audience = resolveAudience(event);
  if (audience === 'public') return true;
  if (!viewer.signedIn) return false;
  if (audience === 'members') return true;
  return !!viewer.role && BOARD_ROLES.includes(viewer.role);
}

/** The presence of externalUrl is the registration toggle — no separate flag. */
export function isExternallyRegistered(event: HostedEvent): boolean {
  return !!event.externalUrl && event.externalUrl.trim().length > 0;
}

/**
 * Audiences a viewer may query for.
 *
 * This must mirror `match /events` in firestore.rules exactly. Firestore
 * rules are not filters: a query that could return an unreadable document
 * fails in its entirety rather than omitting it, so a mismatch shows members
 * an error rather than a shorter list.
 */
export function visibleAudiences(viewer: Viewer): EventAudience[] {
  if (!viewer.signedIn) return ['public'];
  if (viewer.role && BOARD_ROLES.includes(viewer.role)) return ['public', 'members', 'board'];
  return ['public', 'members'];
}
