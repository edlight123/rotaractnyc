import { getTicketScarcity, sellsTickets, spotsRemainingLabel } from '@/lib/utils/scarcity';

describe('getTicketScarcity', () => {
  describe('no badge cases', () => {
    it('returns null when capacity is missing', () => {
      expect(getTicketScarcity(undefined, 10)).toBeNull();
      expect(getTicketScarcity(null, 10)).toBeNull();
    });

    it('returns null when capacity is zero or negative', () => {
      expect(getTicketScarcity(0, 0)).toBeNull();
      expect(getTicketScarcity(-5, 0)).toBeNull();
    });

    it('returns null when the event is sold out (0 remaining)', () => {
      expect(getTicketScarcity(80, 80)).toBeNull();
      expect(getTicketScarcity(80, 95)).toBeNull(); // oversold guard
    });

    it('returns null for large-capacity events with low sales (no false scarcity)', () => {
      // 1000-cap event, 50 sold → not critical/high/selling/momentum, and
      // capacity exceeds the exclusive threshold, so nothing is shown.
      expect(getTicketScarcity(1000, 50)).toBeNull();
    });
  });

  describe('escalating levels for an 80-ticket gala', () => {
    it('shows the exclusivity framing early (no sales)', () => {
      const r = getTicketScarcity(80, 0);
      expect(r?.level).toBe('exclusive');
      expect(r?.message).toBe('Limited to 80 tickets');
      expect(r?.remaining).toBe(80);
    });

    it('shows social-proof momentum once ~15% has sold', () => {
      const r = getTicketScarcity(80, 16); // 20% sold
      expect(r?.level).toBe('momentum');
      expect(r?.message).toBe('16 tickets sold — going fast!');
    });

    it('shows "selling fast" once half is gone', () => {
      const r = getTicketScarcity(80, 40); // 50% sold, 40 remaining
      expect(r?.level).toBe('selling');
      expect(r?.message).toBe('Selling fast — only 40 of 80 left');
    });

    it('shows "almost sold out" when 12 or fewer remain', () => {
      const r = getTicketScarcity(80, 69); // 11 remaining
      expect(r?.level).toBe('high');
      expect(r?.message).toBe('Almost sold out — 11 tickets left');
    });

    it('shows the critical pulse when 5 or fewer remain', () => {
      const r = getTicketScarcity(80, 76); // 4 remaining
      expect(r?.level).toBe('critical');
      expect(r?.message).toBe('Only 4 tickets left!');
      expect(r?.sub).toBeDefined();
    });
  });

  describe('boundaries', () => {
    it('treats exactly 5 remaining as critical', () => {
      expect(getTicketScarcity(80, 75)?.level).toBe('critical');
    });

    it('treats 6 remaining as high (not critical)', () => {
      expect(getTicketScarcity(80, 74)?.level).toBe('high');
    });

    it('treats exactly 12 remaining as high', () => {
      expect(getTicketScarcity(80, 68)?.level).toBe('high');
    });

    it('singularizes when exactly 1 ticket remains', () => {
      const r = getTicketScarcity(80, 79);
      expect(r?.level).toBe('critical');
      expect(r?.message).toBe('Only 1 ticket left!');
    });
  });

  describe('momentum guard for tiny events', () => {
    it('does not announce momentum before 5 tickets have sold', () => {
      // capacity 20, 4 sold (20%): pct ≥ 0.15 but sold < 5 → falls through to
      // exclusive framing instead of "4 tickets sold".
      const r = getTicketScarcity(20, 4);
      expect(r?.level).toBe('exclusive');
    });
  });

  describe('exclusive threshold', () => {
    it('respects a custom maxExclusiveCapacity', () => {
      expect(getTicketScarcity(200, 0)).toBeNull(); // default 150 → too big
      expect(getTicketScarcity(200, 0, { maxExclusiveCapacity: 250 })?.level).toBe('exclusive');
    });
  });

  it('floors fractional sold counts defensively', () => {
    const r = getTicketScarcity(80, 75.9 as unknown as number);
    expect(r?.remaining).toBe(5);
    expect(r?.level).toBe('critical');
  });
});

describe('sellsTickets — scarcity language only where tickets exist', () => {
  // The Neighborhood Supper: a capacity-limited volunteering shift that was
  // showing "🔥 Almost sold out — 10 tickets left" on a free event.
  it('is false for a service event with a real capacity', () => {
    expect(sellsTickets({ type: 'service', pricing: null })).toBe(false);
  });

  it('is false for a free event', () => {
    expect(sellsTickets({ type: 'free' })).toBe(false);
  });

  it('is false for a paid event with no prices actually set', () => {
    // Mislabelled rather than ticketed — there is nothing to sell.
    expect(sellsTickets({ type: 'paid', pricing: { memberPrice: 0, guestPrice: 0 } })).toBe(false);
  });

  it('is true for a paid event with a price', () => {
    expect(sellsTickets({ type: 'paid', pricing: { memberPrice: 7000, guestPrice: 7500 } })).toBe(true);
  });

  it('is true for a hybrid event that charges guests but not members', () => {
    expect(sellsTickets({ type: 'hybrid', pricing: { memberPrice: 0, guestPrice: 2500 } })).toBe(true);
  });

  it('reads tier prices when tiers are present', () => {
    const tier = (over: Record<string, unknown>) => ({
      id: 't', label: 'T', memberPrice: 0, guestPrice: 0, sortOrder: 0, ...over,
    });
    expect(sellsTickets({ type: 'paid', pricing: { memberPrice: 0, guestPrice: 0, tiers: [tier({})] } })).toBe(false);
    expect(
      sellsTickets({ type: 'paid', pricing: { memberPrice: 0, guestPrice: 0, tiers: [tier({ guestPrice: 5000 })] } }),
    ).toBe(true);
  });
});

/**
 * Free, capacity-limited events.
 *
 * Gating scarcity on sellsTickets fixed "🔥 Almost sold out" appearing on a
 * free volunteering shift, but left those events showing nothing at all — a
 * Supper capped at 20 looked uncapped. The replacement deliberately states
 * what is LEFT rather than how full the event is: "10 of 20 filled" reads as
 * half-empty and discourages people, while "10 spots left" reads as an
 * invitation. Same number, opposite signal.
 */
describe('spotsRemainingLabel', () => {
  it('says how many places are left', () => {
    expect(spotsRemainingLabel(20, 10)).toBe('10 spots left');
  });

  it('uses the singular for the last place', () => {
    expect(spotsRemainingLabel(20, 19)).toBe('1 spot left');
  });

  it('says nothing when the event has no capacity', () => {
    expect(spotsRemainingLabel(null, 4)).toBeNull();
    expect(spotsRemainingLabel(undefined, 4)).toBeNull();
    expect(spotsRemainingLabel(0, 0)).toBeNull();
  });

  it('says nothing when the event is full — that has its own UI', () => {
    expect(spotsRemainingLabel(20, 20)).toBeNull();
  });

  it('does not report negative places when an event is over capacity', () => {
    expect(spotsRemainingLabel(20, 25)).toBeNull();
  });

  it('treats a missing signup count as nobody signed up yet', () => {
    expect(spotsRemainingLabel(20, null)).toBe('20 spots left');
    expect(spotsRemainingLabel(20, undefined)).toBe('20 spots left');
  });

  it('never describes the event as filling up or selling out', () => {
    // The whole point: no urgency, no percentage, no "almost gone".
    const label = spotsRemainingLabel(20, 18) ?? '';
    expect(label).not.toMatch(/sold|almost|fast|hurry|only|%|filled/i);
  });
});
