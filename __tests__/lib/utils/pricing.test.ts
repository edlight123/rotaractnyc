import { hasMemberDiscount } from '@/lib/utils/pricing';
import type { EventPricing, TicketTier } from '@/types';

const tier = (over: Partial<TicketTier>): TicketTier => ({
  id: 't1',
  label: 'General',
  memberPrice: 0,
  guestPrice: 0,
  sortOrder: 0,
  ...over,
});

describe('hasMemberDiscount', () => {
  // The bug this guards: the Neighborhood Supper volunteering event (type
  // 'service', pricing null) advertised "Sign in for member pricing".
  it('is false for a service event with no pricing', () => {
    expect(hasMemberDiscount({ type: 'service', pricing: null })).toBe(false);
  });

  it('is false for a free event', () => {
    expect(hasMemberDiscount({ type: 'free', pricing: null })).toBe(false);
  });

  it('is false when pricing exists but the event is not ticketed', () => {
    const pricing = { memberPrice: 0, guestPrice: 2500 } as EventPricing;
    expect(hasMemberDiscount({ type: 'service', pricing })).toBe(false);
  });

  it('is true when a paid event charges members less than guests', () => {
    const pricing = { memberPrice: 2000, guestPrice: 3500 } as EventPricing;
    expect(hasMemberDiscount({ type: 'paid', pricing })).toBe(true);
  });

  it('is false when a paid event charges members and guests the same', () => {
    const pricing = { memberPrice: 3500, guestPrice: 3500 } as EventPricing;
    expect(hasMemberDiscount({ type: 'paid', pricing })).toBe(false);
  });

  it('is true when any tier of a hybrid event discounts members', () => {
    const pricing = {
      memberPrice: 0,
      guestPrice: 0,
      tiers: [
        tier({ id: 'a', memberPrice: 1000, guestPrice: 1000 }),
        tier({ id: 'b', memberPrice: 2000, guestPrice: 3000, sortOrder: 1 }),
      ],
    } as EventPricing;
    expect(hasMemberDiscount({ type: 'hybrid', pricing })).toBe(true);
  });

  it('is false when no tier discounts members', () => {
    const pricing = {
      memberPrice: 0,
      guestPrice: 0,
      tiers: [tier({ id: 'a', memberPrice: 1000, guestPrice: 1000 })],
    } as EventPricing;
    expect(hasMemberDiscount({ type: 'paid', pricing })).toBe(false);
  });
});
