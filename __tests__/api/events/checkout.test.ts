/**
 * Tests for POST /api/events/checkout (public guest checkout)
 *
 * Key behaviours:
 *  - Hosted Checkout Session created with correct success/cancel URLs
 *  - Embedded PaymentIntent created (NOT a checkout session)
 *  - Tier sold-out → 409
 *  - tryReserveTierSpot = false → 409 (race condition)
 *  - Promo code applied → increments usedCount AFTER Stripe
 *  - Free event → writes guest_rsvp directly, sends email
 *  - Event not found → 404
 *  - Non-public event → 403
 */

const mockCreateSession = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockEventGet = jest.fn();
const mockSendEmail = jest.fn();
const mockTryReserveTierSpot = jest.fn();
const mockIncrementTierSoldCount = jest.fn();
const mockDecrementTierSoldCount = jest.fn();
const mockGuestRsvpAdd = jest.fn();
const mockPromoWhere = jest.fn();

jest.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCreateSession } },
    paymentIntents: { create: mockCreatePaymentIntent },
  }),
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: jest.fn().mockReturnValue('test-key'),
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: 'Too many requests', resetAt }), { status: 429 }),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'events') return { doc: () => ({ get: mockEventGet }) };
      if (name === 'guest_rsvps') {
        return {
          add: mockGuestRsvpAdd,
          where: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
        };
      }
      if (name === 'rsvps') {
        return {
          where: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
        };
      }
      if (name === 'promo_codes') return { where: mockPromoWhere };
      return {
        add: jest.fn().mockResolvedValue({ id: 'doc-id' }),
        doc: jest.fn().mockReturnValue({ get: jest.fn(), update: jest.fn() }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      };
    },
  },
}));

jest.mock('@/lib/email/send', () => ({ sendEmail: (...a: any[]) => mockSendEmail(...a) }));
jest.mock('@/lib/email/templates', () => ({
  guestTicketConfirmationEmail: jest.fn().mockReturnValue({ subject: 'Ticket', html: '<p/>', text: '' }),
}));
jest.mock('@/lib/services/tierTracking', () => ({
  tryReserveTierSpot: (...a: any[]) => mockTryReserveTierSpot(...a),
  incrementTierSoldCount: (...a: any[]) => mockIncrementTierSoldCount(...a),
  decrementTierSoldCount: (...a: any[]) => mockDecrementTierSoldCount(...a),
}));

import { POST } from '@/app/api/events/checkout/route';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/events/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}


/**
 * An event date safely in the future. These fixtures previously hardcoded a
 * date; once it passed, the route short-circuited with 410 "registration is
 * closed" and the suite went red for reasons unrelated to what it tests.
 */
function futureDate(daysAhead = 30): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function mockPaidEvent(overrides: Record<string, unknown> = {}) {
  mockEventGet.mockResolvedValue({
    exists: true,
    data: () => ({
      title: 'Benefit Night',
      date: futureDate(),
      time: '7:00 PM',
      location: 'NYC',
      slug: 'benefit-night',
      status: 'published',
      isPublic: true,
      pricing: { guestPrice: 2500 },
      ...overrides,
    }),
  });
}

function mockTieredEvent(tiers: Record<string, unknown>[]) {
  mockEventGet.mockResolvedValue({
    exists: true,
    data: () => ({
      title: 'Gala Night',
      date: futureDate(),
      time: '7:00 PM',
      location: 'NYC',
      slug: 'gala-night',
      status: 'published',
      isPublic: true,
      pricing: { tiers },
    }),
  });
}

describe('POST /api/events/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://rotaractnyc.org';
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    mockCreatePaymentIntent.mockResolvedValue({ client_secret: 'pi_secret_123' });
    mockGuestRsvpAdd.mockResolvedValue({ id: 'rsvp-id' });
    mockTryReserveTierSpot.mockResolvedValue(true);
    mockSendEmail.mockResolvedValue({ success: true });
    mockPaidEvent();
  });

  afterAll(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  // ── Validation ─────────────────────────────────────────────────────────

  it('returns 400 when eventId is missing', async () => {
    const res = await POST(makeRequest({ name: 'Alice', email: 'a@b.com' }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required/i);
  });

  it('returns 400 with an invalid email address', async () => {
    const res = await POST(makeRequest({ eventId: 'e', name: 'Alice', email: 'not-email' }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('returns 404 when event does not exist', async () => {
    mockEventGet.mockResolvedValue({ exists: false });
    const res = await POST(makeRequest({ eventId: 'missing', name: 'Alice', email: 'a@b.com' }) as any);
    expect(res.status).toBe(404);
  });

  it('returns 403 for a non-public event', async () => {
    mockPaidEvent({ isPublic: false });
    const res = await POST(makeRequest({ eventId: 'e', name: 'Alice', email: 'a@b.com' }) as any);
    expect(res.status).toBe(403);
  });

  // ── Hosted Checkout Session ─────────────────────────────────────────────

  it('creates a hosted Checkout Session with correct success/cancel URLs', async () => {
    const res = await POST(makeRequest({
      eventId: 'evt-123',
      name: 'Guest',
      email: 'guest@example.com',
      embedded: false,
    }) as any);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: 'https://checkout.stripe.com/test' });
    expect(mockCreateSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      success_url: 'https://rotaractnyc.org/events/benefit-night?rsvp=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://rotaractnyc.org/events/benefit-night?rsvp=cancelled',
    }));
  });

  // ── Embedded PaymentIntent ──────────────────────────────────────────────

  it('creates a PaymentIntent (not a session) for embedded mode', async () => {
    const res = await POST(makeRequest({
      eventId: 'evt-123',
      name: 'Guest',
      email: 'guest@example.com',
      embedded: true,
    }) as any);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ clientSecret: 'pi_secret_123' });
    // PaymentIntent created, NOT a checkout session
    expect(mockCreatePaymentIntent).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'usd',
      receipt_email: 'guest@example.com',
    }));
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  // ── Tiers ───────────────────────────────────────────────────────────────

  it('returns 409 when all tiers are fully sold out', async () => {
    mockTieredEvent([
      { id: 'tier-vip', label: 'VIP', guestPrice: 5000, capacity: 10, soldCount: 10 },
    ]);
    const res = await POST(makeRequest({ eventId: 'gala', name: 'A', email: 'a@b.com' }) as any);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/sold out/i);
  });

  it('returns 409 when tryReserveTierSpot fails (concurrent race condition)', async () => {
    mockTryReserveTierSpot.mockResolvedValue(false);
    mockTieredEvent([
      { id: 'tier-ga', label: 'General Admission', guestPrice: 2500, capacity: 50, soldCount: 49 },
    ]);
    const res = await POST(makeRequest({ eventId: 'gala', name: 'A', email: 'a@b.com' }) as any);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/sold out while/i);
  });

  it('passes correct capacity and quantity to tryReserveTierSpot', async () => {
    mockTieredEvent([
      { id: 'tier-ga', label: 'GA', guestPrice: 2500, capacity: 50, soldCount: 0 },
    ]);
    await POST(makeRequest({
      eventId: 'gala',
      name: 'A',
      email: 'a@b.com',
      quantity: 3,
      embedded: false,
    }) as any);
    expect(mockTryReserveTierSpot).toHaveBeenCalledWith('gala', 'tier-ga', 50, 3);
  });

  // ── Promo codes ─────────────────────────────────────────────────────────

  it('returns 400 for an invalid promo code', async () => {
    mockPromoWhere.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
    const res = await POST(makeRequest({
      eventId: 'evt-123',
      name: 'A',
      email: 'a@b.com',
      promoCode: 'BAD',
    }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid|expired/i);
  });

  it('increments promo usedCount after successful Stripe call', async () => {
    const mockPromoUpdate = jest.fn().mockResolvedValue(undefined);
    mockPromoWhere.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{
          ref: { update: mockPromoUpdate },
          data: () => ({ code: 'SAVE20', active: true, discountPercent: 20, usedCount: 0 }),
        }],
      }),
    });
    const res = await POST(makeRequest({
      eventId: 'evt-123',
      name: 'A',
      email: 'a@b.com',
      promoCode: 'SAVE20',
      embedded: false,
    }) as any);
    expect(res.status).toBe(200);
    // Stripe call happened first, then promo increment
    expect(mockCreateSession).toHaveBeenCalled();
    expect(mockPromoUpdate).toHaveBeenCalled();
  });

  // ── Free event ──────────────────────────────────────────────────────────

  it('writes guest_rsvp directly and sends email for a free event', async () => {
    mockPaidEvent({ pricing: { guestPrice: 0 } });
    const res = await POST(makeRequest({ eventId: 'evt-free', name: 'Bob', email: 'bob@b.com' }) as any);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ free: true });
    expect(mockGuestRsvpAdd).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'going', paymentStatus: 'free' }),
    );
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
