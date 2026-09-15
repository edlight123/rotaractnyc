/**
 * Member-gated event details.
 *
 * Two details are withheld from anonymous visitors so that signing in buys
 * something a stranger cannot see — and they gate differently:
 *
 *   • The venue. Hiding it on a volunteering event is self-defeating: the
 *     point is turnout and the work is a public good. On a social the venue
 *     IS the draw, so "sign in to see where we're meeting" is a real reason
 *     to join. Hence the default is derived from `type`.
 *
 *   • The member price. Paid events carry both a member and a guest price.
 *     Showing the guest price while gating the member one turns the discount
 *     from a footnote into a reason to sign up.
 *
 * `redactEventForPublic` must be applied on the SERVER, in every path that
 * sends event data to an anonymous browser. A React-level hide is not enough:
 * the pages are server-rendered and props are serialised into the RSC
 * payload, so a field that is merely not rendered is still in the HTML.
 */
import type { DetailVisibility, RotaractEvent } from '@/types';

type GatedEvent = Pick<RotaractEvent, 'type'> &
  Partial<Pick<RotaractEvent, 'venueVisibility' | 'memberPriceVisibility'>>;

/** Volunteering shows its venue; everything else hides it unless told otherwise. */
export function resolveVenueVisibility(event: GatedEvent): DetailVisibility {
  if (event.venueVisibility) return event.venueVisibility;
  return event.type === 'service' ? 'public' : 'members';
}

/** The discount is the incentive, so it is private unless explicitly published. */
export function resolveMemberPriceVisibility(event: GatedEvent): DetailVisibility {
  return event.memberPriceVisibility ?? 'members';
}

/** Does this event have a member price worth gating at all? */
function hasPricing(event: RotaractEvent): boolean {
  return !!event.pricing && (event.type === 'paid' || event.type === 'hybrid');
}

/**
 * Strip member-only details from an event before it leaves the server.
 *
 * Returns a copy — the input is never mutated, so callers holding the full
 * document (the portal, admin APIs) are unaffected.
 */
export function redactEventForPublic(event: RotaractEvent): RotaractEvent {
  // A redacted event is deliberately a partial view of the model — `location`
  // and `memberPrice` are required on the full type but absent here. The cast
  // is confined to this function rather than loosening the interface for every
  // consumer that legitimately has the complete document.
  const out: Record<string, unknown> = { ...event };

  if (resolveVenueVisibility(event) === 'members') {
    // Replace the description first: it routinely carries the street address
    // in prose ("**Where:** 316 East 88th Street"), which would make gating
    // the location field purely decorative.
    if (event.publicDescription) out.description = event.publicDescription;
    delete out.location;
    delete out.address;
    out.venueHidden = true;
  }
  // The blurb is an authoring aid, never something the public needs shipped.
  delete out.publicDescription;

  if (hasPricing(event) && resolveMemberPriceVisibility(event) === 'members' && event.pricing) {
    const pricing = { ...event.pricing } as Record<string, unknown>;
    delete pricing.memberPrice;
    if (Array.isArray(pricing.tiers)) {
      pricing.tiers = (pricing.tiers as Record<string, unknown>[]).map((t) => {
        const tier = { ...t };
        delete tier.memberPrice;
        return tier;
      });
    }
    out.pricing = pricing;
    out.memberPriceHidden = true;
  }

  return out as unknown as RotaractEvent;
}

/** Convenience for list queries. */
export function redactEventsForPublic(events: RotaractEvent[]): RotaractEvent[] {
  return events.map(redactEventForPublic);
}
