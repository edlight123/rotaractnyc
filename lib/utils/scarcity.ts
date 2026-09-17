/**
 * Ticket-scarcity messaging logic. Pure + framework-free so it can be unit
 * tested and reused by both the public event page and the portal registration
 * card. The message escalates as an event fills up to nudge purchases without
 * misrepresenting availability.
 */

import type { EventPricing, EventType } from '@/types';

export type ScarcityLevel = 'critical' | 'high' | 'selling' | 'momentum' | 'exclusive';

/**
 * Does this event actually sell tickets?
 *
 * Scarcity messaging is written in the language of tickets — "Almost sold
 * out", "Only 3 tickets left" — and that language only makes sense where
 * there is something to buy. A free event can still be capacity-limited: the
 * Neighborhood Supper caps at 20 volunteers. But telling someone that
 * signing up to serve a meal is "almost sold out" both misdescribes it and
 * applies purchase pressure to an act of service.
 *
 * `type` alone is not enough. A 'hybrid' event may or may not charge, and an
 * event mislabelled 'paid' with no prices set has nothing to sell, so the
 * prices are what decide.
 */
export function sellsTickets(event: {
  type?: EventType;
  pricing?: EventPricing | null;
}): boolean {
  if (event.type === 'free' || event.type === 'service') return false;
  const pricing = event.pricing;
  if (!pricing) return false;
  if (pricing.tiers?.length) {
    return pricing.tiers.some((t) => (t.guestPrice ?? 0) > 0 || (t.memberPrice ?? 0) > 0);
  }
  return (pricing.guestPrice ?? 0) > 0 || (pricing.memberPrice ?? 0) > 0;
}

export interface ScarcityInfo {
  level: ScarcityLevel;
  message: string;
  sub?: string;
  remaining: number;
  sold: number;
  capacity: number;
}

/**
 * Decide what (if any) scarcity message to show.
 *
 * Returns `null` when:
 *  - there is no capacity set (unlimited event),
 *  - the event is sold out (0 remaining — that has its own dedicated UI), or
 *  - capacity is large enough that an early "limited tickets" message would be
 *    misleading and no genuine urgency has kicked in yet.
 *
 * @param capacity     Total seats for the event.
 * @param ticketsSold  Seats already claimed (one per ticket).
 */
export function getTicketScarcity(
  capacity: number | null | undefined,
  ticketsSold: number | null | undefined,
  opts?: { maxExclusiveCapacity?: number },
): ScarcityInfo | null {
  if (capacity == null || capacity <= 0) return null;

  const sold = Math.max(0, Math.floor(ticketsSold ?? 0));
  const remaining = Math.max(0, capacity - sold);
  if (remaining <= 0) return null; // sold out → handled by dedicated UI

  const pctSold = (capacity - remaining) / capacity;
  const maxExclusive = opts?.maxExclusiveCapacity ?? 150;
  const tix = (n: number) => `${n} ticket${n === 1 ? '' : 's'}`;
  const base = { remaining, sold, capacity };

  if (remaining <= 5) {
    return { level: 'critical', message: `Only ${tix(remaining)} left!`, sub: "Almost gone — don't miss out", ...base };
  }
  if (remaining <= 12) {
    return { level: 'high', message: `Almost sold out — ${tix(remaining)} left`, ...base };
  }
  if (pctSold >= 0.5) {
    return { level: 'selling', message: `Selling fast — only ${remaining} of ${capacity} left`, ...base };
  }
  if (pctSold >= 0.15 && sold >= 5) {
    return { level: 'momentum', message: `${tix(sold)} sold — going fast!`, ...base };
  }
  if (capacity <= maxExclusive) {
    return { level: 'exclusive', message: `Limited to ${tix(capacity)}`, sub: 'Reserve your seat early', ...base };
  }
  return null;
}

/**
 * Places left on a free, capacity-limited event — or null when there is
 * nothing worth saying.
 *
 * Says what is LEFT, never how full the event is. "10 of 20 filled" reads as
 * half-empty and puts people off; "10 spots left" reads as an invitation.
 * Same number, opposite signal. Deliberately carries no urgency: these are
 * volunteering shifts and free socials, not tickets.
 *
 * Returns null for an uncapped event, a full one (sold-out has its own UI),
 * and an over-subscribed one — "-5 spots left" helps nobody.
 */
export function spotsRemainingLabel(
  capacity: number | null | undefined,
  claimed: number | null | undefined,
): string | null {
  if (capacity == null || capacity <= 0) return null;
  const taken = Math.max(0, Math.floor(claimed ?? 0));
  const remaining = capacity - taken;
  if (remaining <= 0) return null;
  return `${remaining} spot${remaining === 1 ? '' : 's'} left`;
}
