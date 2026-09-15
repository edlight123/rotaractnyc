import {
  resolveVenueVisibility,
  resolveMemberPriceVisibility,
  redactEventForPublic,
} from '@/lib/utils/eventGating';
import type { RotaractEvent } from '@/types';

function evt(over: Partial<RotaractEvent>): RotaractEvent {
  return {
    id: 'e1',
    title: 'Event',
    slug: 'event',
    description: 'A description.',
    date: '2026-10-01T18:00:00.000Z',
    time: '2:00 PM',
    location: 'Bohemian Astoria Beer Garden, Astoria, NY',
    address: '29-19 24th Avenue, Astoria, NY 11102',
    type: 'free',
    isPublic: true,
    status: 'published',
    createdAt: '2026-09-15T00:00:00.000Z',
    ...over,
  } as RotaractEvent;
}

describe('resolveVenueVisibility', () => {
  it('shows the venue on volunteering events — turnout is the point', () => {
    expect(resolveVenueVisibility({ type: 'service' })).toBe('public');
  });
  it.each(['free', 'paid', 'hybrid'] as const)('hides the venue on a %s event', (type) => {
    expect(resolveVenueVisibility({ type })).toBe('members');
  });
  it('lets an explicit value win in both directions', () => {
    expect(resolveVenueVisibility({ type: 'service', venueVisibility: 'members' })).toBe('members');
    expect(resolveVenueVisibility({ type: 'free', venueVisibility: 'public' })).toBe('public');
  });
});

describe('resolveMemberPriceVisibility', () => {
  it('gates the member price by default', () => {
    expect(resolveMemberPriceVisibility({ type: 'paid' })).toBe('members');
  });
  it('honours an explicit public setting', () => {
    expect(resolveMemberPriceVisibility({ type: 'paid', memberPriceVisibility: 'public' })).toBe('public');
  });
});

describe('redactEventForPublic — venue', () => {
  it('leaves a service event untouched', () => {
    const e = evt({ type: 'service' });
    const r = redactEventForPublic(e);
    expect(r.location).toBe(e.location);
    expect(r.address).toBe(e.address);
    expect(r.venueHidden).toBeUndefined();
  });

  it('strips location and address from a social', () => {
    const r = redactEventForPublic(evt({ type: 'free' }));
    expect(r.location).toBeUndefined();
    expect(r.address).toBeUndefined();
    expect(r.venueHidden).toBe(true);
  });

  // The Supper's real description carries its own street address, so gating
  // the location field alone would be decorative.
  it('substitutes publicDescription so an address in prose cannot leak', () => {
    const r = redactEventForPublic(
      evt({
        type: 'free',
        description: 'Join us at **316 East 88th Street** for drinks.',
        publicDescription: 'Join us for drinks — location shared with members.',
      }),
    );
    expect(r.description).toBe('Join us for drinks — location shared with members.');
    expect(r.description).not.toContain('316 East 88th Street');
  });

  it('never ships the publicDescription field itself', () => {
    const r = redactEventForPublic(evt({ type: 'service', publicDescription: 'blurb' }));
    expect(r.publicDescription).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const e = evt({ type: 'free' });
    redactEventForPublic(e);
    expect(e.location).toBe('Bohemian Astoria Beer Garden, Astoria, NY');
  });
});

describe('redactEventForPublic — member price', () => {
  const paid = (over: Partial<RotaractEvent> = {}) =>
    evt({ type: 'paid', pricing: { memberPrice: 2000, guestPrice: 3500 }, ...over } as Partial<RotaractEvent>);

  it('removes the member price and keeps the guest price', () => {
    const r = redactEventForPublic(paid());
    expect(r.pricing?.memberPrice).toBeUndefined();
    expect(r.pricing?.guestPrice).toBe(3500);
    expect(r.memberPriceHidden).toBe(true);
  });

  it('removes the member price from every tier', () => {
    const r = redactEventForPublic(
      paid({
        pricing: {
          memberPrice: 0,
          guestPrice: 0,
          tiers: [
            { id: 'a', label: 'Early Bird', memberPrice: 5000, guestPrice: 7500, sortOrder: 0 },
            { id: 'b', label: 'General', memberPrice: 7000, guestPrice: 9500, sortOrder: 1 },
          ],
        },
      } as Partial<RotaractEvent>),
    );
    for (const t of r.pricing?.tiers ?? []) {
      expect((t as unknown as Record<string, unknown>).memberPrice).toBeUndefined();
    }
    expect(r.pricing?.tiers?.map((t) => t.guestPrice)).toEqual([7500, 9500]);
  });

  it('leaves pricing alone when explicitly published', () => {
    const r = redactEventForPublic(paid({ memberPriceVisibility: 'public' }));
    expect(r.pricing?.memberPrice).toBe(2000);
    expect(r.memberPriceHidden).toBeUndefined();
  });

  it('ignores pricing on a free event even if a stray pricing object exists', () => {
    const r = redactEventForPublic(evt({ type: 'free', pricing: { memberPrice: 1, guestPrice: 2 } } as Partial<RotaractEvent>));
    expect(r.pricing?.memberPrice).toBe(1);
    expect(r.memberPriceHidden).toBeUndefined();
  });

  it('leaves no memberPrice key anywhere in the serialised payload', () => {
    const r = redactEventForPublic(
      paid({
        pricing: {
          memberPrice: 2000,
          guestPrice: 3500,
          tiers: [{ id: 'a', label: 'GA', memberPrice: 5000, guestPrice: 7500, sortOrder: 0 }],
        },
      } as Partial<RotaractEvent>),
    );
    expect(JSON.stringify(r)).not.toContain('"memberPrice":');
  });
});

describe('memberDiscountAvailable — computed before the price is stripped', () => {
  const paid = (pricing: Record<string, unknown>) =>
    evt({ type: 'paid', pricing } as unknown as Partial<RotaractEvent>);

  // Without this flag the page only sees `guestPrice > undefined`, which is
  // true for every paid event — so it would invite people to sign in for a
  // saving that does not exist.
  it('is true when members genuinely pay less', () => {
    const r = redactEventForPublic(paid({ memberPrice: 7000, guestPrice: 7500 }));
    expect(r.memberDiscountAvailable).toBe(true);
    expect(r.pricing?.memberPrice).toBeUndefined();
  });

  it('is false when member and guest pay the same', () => {
    const r = redactEventForPublic(paid({ memberPrice: 7500, guestPrice: 7500 }));
    expect(r.memberDiscountAvailable).toBe(false);
  });

  it('is true when any tier discounts members', () => {
    const r = redactEventForPublic(
      paid({
        memberPrice: 0,
        guestPrice: 0,
        tiers: [
          { id: 'a', label: 'GA', memberPrice: 5000, guestPrice: 5000, sortOrder: 0 },
          { id: 'b', label: 'VIP', memberPrice: 8000, guestPrice: 9500, sortOrder: 1 },
        ],
      }),
    );
    expect(r.memberDiscountAvailable).toBe(true);
  });

  it('is false when no tier discounts members', () => {
    const r = redactEventForPublic(
      paid({
        memberPrice: 0,
        guestPrice: 0,
        tiers: [{ id: 'a', label: 'GA', memberPrice: 5000, guestPrice: 5000, sortOrder: 0 }],
      }),
    );
    expect(r.memberDiscountAvailable).toBe(false);
  });

  it('is not set when the member price is published anyway', () => {
    const r = redactEventForPublic(
      evt({ type: 'paid', memberPriceVisibility: 'public', pricing: { memberPrice: 7000, guestPrice: 7500 } } as Partial<RotaractEvent>),
    );
    expect(r.memberDiscountAvailable).toBeUndefined();
  });
});
