/**
 * Ticket-scarcity messaging logic. Pure + framework-free so it can be unit
 * tested and reused by both the public event page and the portal registration
 * card. The message escalates as an event fills up to nudge purchases without
 * misrepresenting availability.
 */

export type ScarcityLevel = 'critical' | 'high' | 'selling' | 'momentum' | 'exclusive';

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
