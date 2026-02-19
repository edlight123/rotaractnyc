/**
 * Tests for POST /api/contact
 *
 * We mock sendEmail (the app's email abstraction) and the rate limiter
 * so tests are fast and deterministic.
 */

const mockSendEmail = jest.fn();

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: () => 'test-key',
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));

import { POST } from '@/app/api/contact/route';

function makeRequest(body: Record<string, any>) {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true, id: 'test-id' });
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', message: 'hello' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ name: 'Test', message: 'hello' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('returns 400 when message is missing', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'a@b.com' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/message/i);
  });

  it('sends email via sendEmail and returns 200', async () => {
    const res = await POST(
      makeRequest({ name: 'Test User', email: 'test@test.com', message: 'Hello!' }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'test@test.com',
        subject: expect.stringContaining('Test User'),
      }),
    );
  });

  it('still returns 200 when email send fails (graceful fallback)', async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: 'Email not configured' });
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const res = await POST(
      makeRequest({ name: 'Test', email: 'a@b.com', message: 'hi' }),
    );
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('email not sent'),
      expect.any(String),
      expect.any(String),
    );
    spy.mockRestore();
  });
});
