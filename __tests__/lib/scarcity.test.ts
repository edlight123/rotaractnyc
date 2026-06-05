import { getTicketScarcity } from '@/lib/utils/scarcity';

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
