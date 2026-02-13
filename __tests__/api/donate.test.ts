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

import { NextRequest } from 'next/server';

// Must import AFTER mocks
import { POST } from '@/app/api/donate/route';

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

  it('returns 503 when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(makeRequest({ amount: '25' }));
    expect(res.status).toBe(503);
  });

  it('creates checkout session for preset $25', async () => {
    const res = await POST(makeRequest({ amount: '25' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe('https://checkout.stripe.com/test');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 2500 }),
          }),
        ]),
      }),
    );
  });

  it('creates checkout session for preset $100', async () => {
    const res = await POST(makeRequest({ amount: '100' }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 10000 }),
          }),
        ]),
      }),
    );
  });

  it('creates checkout session for custom amount', async () => {
    const res = await POST(makeRequest({ customAmount: '75' }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 7500 }),
          }),
        ]),
      }),
    );
  });

  it('rejects custom amount below $5', async () => {
    const res = await POST(makeRequest({ customAmount: '3' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/minimum/i);
  });

  it('rejects request with no amount', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects invalid preset amount', async () => {
    const res = await POST(makeRequest({ amount: '999' }));
    expect(res.status).toBe(400);
  });
});
