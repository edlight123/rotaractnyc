/**
 * Tests for POST /api/webhooks/stripe
 *
 * Verifies env-var checks, signature validation, event construction, and handler errors.
 */

const mockConstructEvent = jest.fn();
const mockHandleWebhookEvent = jest.fn();

jest.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
}));

jest.mock('@/lib/stripe/webhooks', () => ({
  handleWebhookEvent: (...args: any[]) => mockHandleWebhookEvent(...args),
}));

import { NextRequest } from 'next/server';

// `endpointSecret` in the route is captured at module scope, so we must set
// env vars BEFORE requiring the module. Jest hoists jest.mock above imports,
// so a static `import` would load the module before our process.env lines run.
let POST: typeof import('@/app/api/webhooks/stripe/route').POST;

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_456';
  const mod = await import('@/app/api/webhooks/stripe/route');
  POST = mod.POST;
});

function makeRequest(body: string, sig?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sig) headers['stripe-signature'] = sig;
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

describe('POST /api/webhooks/stripe', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_456';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns 500 when STRIPE_SECRET_KEY is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const res = await POST(makeRequest('{}', 'sig_123'));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/not configured/i);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing signature/i);
  });

  it('returns 400 when constructEvent throws (invalid signature)', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const spy = jest.spyOn(console, 'error').mockImplementation();
    const res = await POST(makeRequest('{}', 'bad_sig'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid signature/i);
    spy.mockRestore();
  });

  it('returns 200 on valid event', async () => {
    const fakeEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };
    mockConstructEvent.mockReturnValue(fakeEvent);
    mockHandleWebhookEvent.mockResolvedValue(undefined);

    const res = await POST(makeRequest('{"id":"evt_123"}', 'valid_sig'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(mockHandleWebhookEvent).toHaveBeenCalledWith(fakeEvent);
  });

  it('returns 200 even when handleWebhookEvent throws', async () => {
    const fakeEvent = { id: 'evt_456', type: 'invoice.payment_failed' };
    mockConstructEvent.mockReturnValue(fakeEvent);
    mockHandleWebhookEvent.mockRejectedValue(new Error('Handler crashed'));

    const spy = jest.spyOn(console, 'error').mockImplementation();
    const res = await POST(makeRequest('{"id":"evt_456"}', 'valid_sig'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    spy.mockRestore();
  });
});
