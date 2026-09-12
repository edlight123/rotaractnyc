/**
 * Tests for POST /api/donate
 *
 * We mock Stripe and test:
 * - preset amounts (25, 50, 100)
 * - custom amount
 * - invalid input
 * - Stripe not configured
 */

const mockCreate = jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCreate } },
  }));
});

// An event-scoped donation looks the event up to check whether its donation
// window has closed. Without this mock the route reaches the real Admin SDK,
// throws "Firebase Admin credentials not configured", and returns 500 — which
// is what made the event-attribution test fail.
const mockEventGet = jest.fn().mockResolvedValue({ exists: false, data: () => null });
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({ doc: () => ({ get: () => mockEventGet() }) }),
  },
}));

import { NextRequest } from 'next/server';

// Must import AFTER mocks
import { POST } from '@/app/api/donate/route';

const DONOR = { donorName: 'Test Donor', donorEmail: 'donor@test.com' };

function makeRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/donate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/donate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterAll(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('returns 500 when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const res = await POST(makeRequest({ ...DONOR, amount: '25' }));
    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  it('creates checkout session for preset $25', async () => {
    const res = await POST(makeRequest({ ...DONOR, amount: '25' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe('https://checkout.stripe.com/test');
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      mode: 'payment',
      line_items: expect.arrayContaining([
        expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 2500 }),
        }),
      ]),
    });
  });

  it('creates checkout session for preset $100', async () => {
    const res = await POST(makeRequest({ ...DONOR, amount: '100' }));
    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      line_items: expect.arrayContaining([
        expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 10000 }),
        }),
      ]),
    });
  });

  it('creates checkout session for custom amount', async () => {
    const res = await POST(makeRequest({ ...DONOR, customAmount: '75' }));
    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      line_items: expect.arrayContaining([
        expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 7500 }),
        }),
      ]),
    });
  });

  it('rejects custom amount below $5', async () => {
    const res = await POST(makeRequest({ ...DONOR, customAmount: '3' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/minimum/i);
  });

  it('rejects request with no amount', async () => {
    const res = await POST(makeRequest({ ...DONOR }));
    expect(res.status).toBe(400);
  });

  it('rejects invalid preset amount', async () => {
    const res = await POST(makeRequest({ ...DONOR, amount: '999' }));
    expect(res.status).toBe(400);
  });

  it('rejects donation without donor name or email', async () => {
    const res = await POST(makeRequest({ amount: '25' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name and email/i);
  });

  it('attributes donation to an event when eventId/eventTitle/eventSlug provided', async () => {
    const res = await POST(
      makeRequest({
        ...DONOR,
        amount: '50',
        eventId: 'evt_abc',
        eventTitle: 'Spring Gala',
        eventSlug: 'spring-gala',
      }),
    );
    expect(res.status).toBe(200);
    const args = mockCreate.mock.calls[0][0];
    expect(args.metadata).toMatchObject({
      type: 'donation',
      eventId: 'evt_abc',
      eventTitle: 'Spring Gala',
      eventSlug: 'spring-gala',
    });
    expect(args.line_items[0].price_data.product_data.name).toMatch(/Spring Gala/);
    expect(args.success_url).toMatch(/\/events\/spring-gala\?donation=success/);
    expect(args.cancel_url).toMatch(/\/events\/spring-gala\?donation=cancelled/);
  });

  it('falls back to /donate redirects when no event context is provided', async () => {
    const res = await POST(makeRequest({ ...DONOR, amount: '25' }));
    expect(res.status).toBe(200);
    const args = mockCreate.mock.calls[0][0];
    expect(args.success_url).toMatch(/\/donate\?session_id=/);
    expect(args.cancel_url).toMatch(/\/donate\?cancelled=true/);
    expect(args.metadata).not.toHaveProperty('eventId');
  });
});
