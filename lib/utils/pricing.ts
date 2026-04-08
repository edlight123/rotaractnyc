import type { EventPricing, TicketTier } from '@/types';

// ── Tier helpers ──────────────────────────────────────────────

/** Return only tiers that are currently available (before deadline, not sold out). */
export function getAvailableTiers(pricing: EventPricing): TicketTier[] {
  if (!pricing.tiers?.length) return [];
  const now = new Date();
  return pricing.tiers
    .filter((t) => {
      if (t.deadline && new Date(t.deadline) < now) return false;
      if (t.capacity != null && (t.soldCount ?? 0) >= t.capacity) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Return all tiers sorted, regardless of availability. */
export function getAllTiers(pricing: EventPricing): TicketTier[] {
  if (!pricing.tiers?.length) return [];
  return [...pricing.tiers].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Check whether an event uses the new tier system. */
export function hasTiers(pricing: EventPricing | undefined | null): boolean {
  return !!(pricing?.tiers && pricing.tiers.length > 0);
}

/** Is a specific tier still available? */
export function isTierAvailable(tier: TicketTier): boolean {
  const now = new Date();
  if (tier.deadline && new Date(tier.deadline) < now) return false;
  if (tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity) return false;
  return true;
}

/** Spots remaining for a tier (null = unlimited). */
export function tierSpotsLeft(tier: TicketTier): number | null {
  if (tier.capacity == null) return null;
  return Math.max(0, tier.capacity - (tier.soldCount ?? 0));
}

// ── Price resolution ──────────────────────────────────────────

interface ResolvedPrice {
  priceCents: number;
  label: string;
  tierId?: string;
}

/**
 * Resolve the price for a given event pricing object.
 *
 * Priority:
 * 1. If a specific `tierId` is provided AND tiers exist, use that tier.
 * 2. If tiers exist but no tierId, use the cheapest available tier.
 * 3. Fall back to legacy flat pricing (early bird → member → guest).
 */
export function resolvePrice(
  pricing: EventPricing,
  opts: { isMember: boolean; tierId?: string },
): ResolvedPrice {
  const { isMember, tierId } = opts;

  // ── Tier-based pricing ──
  if (pricing.tiers?.length) {
    let tier: TicketTier | undefined;

    if (tierId) {
      tier = pricing.tiers.find((t) => t.id === tierId);
    }

    if (!tier) {
      // Pick the cheapest available tier for this user type
      const available = getAvailableTiers(pricing);
      if (available.length > 0) {
        tier = available[0]; // first by sortOrder (typically cheapest available)
      }
    }

    if (tier) {
      return {
        priceCents: isMember ? tier.memberPrice : tier.guestPrice,
        label: tier.label,
        tierId: tier.id,
      };
    }
  }

  // ── Legacy flat pricing ──
  const now = new Date();
  const earlyBirdActive =
    pricing.earlyBirdPrice != null &&
    pricing.earlyBirdDeadline &&
    new Date(pricing.earlyBirdDeadline) > now;

  if (earlyBirdActive) {
    return { priceCents: pricing.earlyBirdPrice!, label: 'Early Bird' };
  }
  if (isMember) {
    return { priceCents: pricing.memberPrice, label: 'Member' };
  }
  return { priceCents: pricing.guestPrice, label: 'Guest' };
}

// ── Display helpers ───────────────────────────────────────────

/** Get the lowest member price across all available tiers (or legacy pricing). */
export function getLowestMemberPrice(pricing: EventPricing): number {
  if (pricing.tiers?.length) {
    const available = getAvailableTiers(pricing);
    if (available.length > 0) {
      return Math.min(...available.map((t) => t.memberPrice));
    }
    // All sold out / expired — show the lowest from all tiers
    return Math.min(...pricing.tiers.map((t) => t.memberPrice));
  }
  // Legacy
  const now = new Date();
  if (
    pricing.earlyBirdPrice != null &&
    pricing.earlyBirdDeadline &&
    new Date(pricing.earlyBirdDeadline) > now
  ) {
    return pricing.earlyBirdPrice;
  }
  return pricing.memberPrice;
}

/** Get the lowest guest price across all available tiers (or legacy pricing). */
export function getLowestGuestPrice(pricing: EventPricing): number {
  if (pricing.tiers?.length) {
    const available = getAvailableTiers(pricing);
    if (available.length > 0) {
      return Math.min(...available.map((t) => t.guestPrice));
    }
    return Math.min(...pricing.tiers.map((t) => t.guestPrice));
  }
  const now = new Date();
  if (
    pricing.earlyBirdPrice != null &&
    pricing.earlyBirdDeadline &&
    new Date(pricing.earlyBirdDeadline) > now
  ) {
    return pricing.earlyBirdPrice;
  }
  return pricing.guestPrice;
}
