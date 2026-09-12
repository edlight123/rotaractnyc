const mockCreateSession = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockVerifySessionCookie = jest.fn();
const mockGetUser = jest.fn();
const mockEventGet = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCreateSession,
      },
    },
    paymentIntents: {
      create: mockCreatePaymentIntent,
    },
  }));
});

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: jest.fn().mockReturnValue('test-key'),
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: 'Too many requests', resetAt }), { status: 429 }),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: any[]) => mockVerifySessionCookie(...args),
    getUser: (...args: any[]) => mockGetUser(...args),
  },
  adminDb: {
    collection: (name: string) => {
      if (name === 'events') {
        return {
          doc: () => ({ get: mockEventGet }),
        };
      }

      return {
        doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: false }), set: jest.fn(), update: jest.fn() }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [], data: () => ({ count: 0 }) }),
      };
    },
  },
}));

jest.mock('@/lib/services/tierTracking', () => ({
  incrementTierSoldCount: jest.fn(),
  tryReserveTierSpot: jest.fn().mockResolvedValue(true),
  releaseTierSpot: jest.fn(),
}));

import { POST } from '@/app/api/portal/events/checkout/route';
import { cookies } from 'next/headers';

const mockCookies = cookies as unknown as jest.Mock;

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/portal/events/checkout', {
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

function mockPaidPortalEvent() {
  mockEventGet.mockResolvedValue({
    exists: true,
    data: () => ({
      title: 'Member Benefit Night',
      date: futureDate(),
      location: 'NYC',
      pricing: {
        memberPrice: 1500,
        guestPrice: 2500,
      },
    }),
  });
}

describe('POST /api/portal/events/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://rotaractnyc.org';
    mockVerifySessionCookie.mockResolvedValue({ uid: 'member-123' });
    mockGetUser.mockResolvedValue({ email: 'member@example.com' });
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === 'rotaract_portal_session'
          ? { name, value: 'valid-session' }
          : undefined,
    } as any);
    mockCreateSession.mockResolvedValue({
      client_secret: 'cs_secret_session',
      url: 'https://checkout.stripe.com/test',
    });
    mockCreatePaymentIntent.mockResolvedValue({
      client_secret: 'pi_secret_embedded',
    });
    mockPaidPortalEvent();
  });

  afterAll(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('creates a PaymentIntent (not a session) for embedded mode', async () => {
    const res = await POST(makeRequest({
      eventId: 'evt-123',
      ticketType: 'member',
      embedded: true,
    }) as any);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ clientSecret: 'pi_secret_embedded' });

    // Embedded path uses paymentIntents.create, NOT checkout.sessions.create
    expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'usd',
      }),
    );
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('creates a hosted Checkout Session with a verifiable success URL', async () => {
    const res = await POST(makeRequest({
      eventId: 'evt-123',
      ticketType: 'member',
      embedded: false,
    }) as any);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: 'https://checkout.stripe.com/test' });

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        success_url: 'https://rotaractnyc.org/portal/events?ticket=success&event=evt-123&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://rotaractnyc.org/portal/events?ticket=cancelled',
      }),
    );
  });
});
