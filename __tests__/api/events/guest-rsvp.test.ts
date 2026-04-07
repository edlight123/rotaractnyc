/**
 * Tests for POST /api/events/rsvp (guest RSVP)
 *
 * We mock Firebase admin, rate limiting, email sending, and email templates
 * so tests are fast and deterministic.
 */

/* ------------------------------------------------------------------ */
/*  Mock setup                                                         */
/* ------------------------------------------------------------------ */

const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockEventGet = jest.fn();
const mockGuestQueryGet = jest.fn();
const mockMemberCountGet = jest.fn();
const mockGuestCountGet = jest.fn();

// Firestore-style chaining helpers
const mockCollection = jest.fn().mockImplementation((name: string) => {
  if (name === 'events') {
    return {
      doc: jest.fn().mockReturnValue({ get: mockEventGet }),
    };
  }
  if (name === 'guest_rsvps') {
    return {
      // doc() — used for creating new RSVP
      doc: jest.fn().mockReturnValue({ set: mockSet, id: 'test-rsvp-id' }),
      // where().where().limit().get() — used for duplicate check
      // where().where().count().get() — used for capacity guest count
      where: jest.fn().mockImplementation((_field: string, _op: string, _val: unknown) => ({
        where: jest.fn().mockImplementation((_f2: string, _o2: string, _v2: unknown) => ({
          limit: jest.fn().mockReturnValue({ get: mockGuestQueryGet }),
          count: jest.fn().mockReturnValue({ get: mockGuestCountGet }),
        })),
      })),
    };
  }
  if (name === 'rsvps') {
    return {
      where: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          count: jest.fn().mockReturnValue({ get: mockMemberCountGet }),
        }),
      }),
    };
  }
  return { doc: jest.fn(), where: jest.fn() };
});

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: (...args: any[]) => mockCollection(...args) },
}));

const mockRateLimit = jest.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60_000 });
jest.mock('@/lib/rateLimit', () => ({
  rateLimit: (...args: any[]) => mockRateLimit(...args),
  getRateLimitKey: () => 'test-key',
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: 'Too many requests', resetAt }), { status: 429 }),
}));

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/email/templates', () => ({
  guestRsvpConfirmationEmail: jest.fn().mockReturnValue({
    subject: 'RSVP Confirmation',
    html: '<p>Confirmed</p>',
    text: 'Confirmed',
  }),
}));

/* ------------------------------------------------------------------ */
/*  Import handler AFTER mocks                                         */
/* ------------------------------------------------------------------ */
import { POST } from '@/app/api/events/rsvp/route';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeRequest(body: Record<string, any>) {
  return new Request('http://localhost/api/events/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  eventId: 'evt-123',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-1234',
};

/** Return a mock Firestore document snapshot for a published, public, free event */
function mockPublishedEvent(overrides: Record<string, any> = {}) {
  return {
    exists: true,
    data: () => ({
      title: 'Community Cleanup',
      date: '2026-05-01',
      time: '10:00 AM',
      location: 'Central Park',
      slug: 'community-cleanup',
      status: 'published',
      isPublic: true,
      capacity: null,
      pricing: null,
      type: 'free',
      ...overrides,
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('POST /api/events/rsvp (guest RSVP)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60_000 });
    // Default: event exists, no duplicate, send email succeeds
    mockEventGet.mockResolvedValue(mockPublishedEvent());
    mockGuestQueryGet.mockResolvedValue({ empty: true });
    mockSendEmail.mockResolvedValue({ success: true });
  });

  /* ---------- Validation ----------------------------------------- */

  it('returns 400 when eventId is missing', async () => {
    const res = await POST(makeRequest({ name: 'Jane', email: 'j@e.com' }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({ eventId: 'evt-1', email: 'j@e.com' }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ eventId: 'evt-1', name: 'Jane' }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(makeRequest({ eventId: 'evt-1', name: 'Jane', email: 'not-an-email' }) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid email/i);
  });

  /* ---------- Event lookup --------------------------------------- */

  it('returns 404 if event does not exist', async () => {
    mockEventGet.mockResolvedValue({ exists: false, data: () => null });

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it('returns 400 if event is not published', async () => {
    mockEventGet.mockResolvedValue(mockPublishedEvent({ status: 'draft' }));

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not available/i);
  });

  it('returns 400 if event is not public', async () => {
    mockEventGet.mockResolvedValue(mockPublishedEvent({ isPublic: false }));

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not available/i);
  });

  /* ---------- Duplicate check ------------------------------------ */

  it('returns 409 if guest already registered for the event', async () => {
    mockGuestQueryGet.mockResolvedValue({ empty: false });

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already registered/i);
  });

  /* ---------- Capacity ------------------------------------------- */

  it('returns 409 when event is at full capacity', async () => {
    mockEventGet.mockResolvedValue(mockPublishedEvent({ capacity: 50 }));
    mockGuestQueryGet.mockResolvedValue({ empty: true });
    mockMemberCountGet.mockResolvedValue({ data: () => ({ count: 30 }) });
    mockGuestCountGet.mockResolvedValue({ data: () => ({ count: 20 }) });

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/full capacity/i);
  });

  /* ---------- Paid events ---------------------------------------- */

  it('returns requiresPayment for paid events', async () => {
    mockEventGet.mockResolvedValue(
      mockPublishedEvent({
        type: 'paid',
        pricing: { guestPrice: 2500, earlyBirdPrice: 2000, earlyBirdDeadline: '2026-04-20' },
      }),
    );

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.requiresPayment).toBe(true);
    expect(json.guestPrice).toBe(2500);
    expect(json.message).toMatch(/ticket purchase/i);
    // No RSVP should be created for paid events
    expect(mockSet).not.toHaveBeenCalled();
  });

  /* ---------- Free event RSVP success ----------------------------- */

  it('creates guest RSVP and returns success for free event', async () => {
    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/registered/i);
    expect(json.rsvpId).toBe('test-rsvp-id');

    // Firestore write
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        status: 'going',
        ticketType: 'guest',
        paymentStatus: 'free',
      }),
    );
  });

  /* ---------- Email confirmation ---------------------------------- */

  it('sends a confirmation email on successful free RSVP', async () => {
    await POST(makeRequest(validBody) as any);

    // sendEmail is fire-and-forget, but we still expect it to be called
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: 'RSVP Confirmation',
        html: '<p>Confirmed</p>',
        text: 'Confirmed',
      }),
    );
  });

  it('does not send email for paid events', async () => {
    mockEventGet.mockResolvedValue(
      mockPublishedEvent({
        type: 'paid',
        pricing: { guestPrice: 1500, earlyBirdPrice: null, earlyBirdDeadline: null },
      }),
    );

    await POST(makeRequest(validBody) as any);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  /* ---------- Rate limiting -------------------------------------- */

  it('returns 429 when rate limited', async () => {
    const futureReset = Date.now() + 60_000;
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: futureReset });

    const res = await POST(makeRequest(validBody) as any);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many/i);
  });
});
