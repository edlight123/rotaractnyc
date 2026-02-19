/**
 * Tests for POST /api/membership-interest
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

import { POST } from '@/app/api/membership-interest/route';

function makeRequest(body: Record<string, any>) {
  return new Request('http://localhost/api/membership-interest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/membership-interest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true, id: 'test-id' });
  });

  it('returns 400 when firstName is missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ firstName: 'Test' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it('sends email via sendEmail when called', async () => {
    const res = await POST(
      makeRequest({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@test.com',
        age: '25',
        occupation: 'Engineer',
        reason: 'I want to serve my community',
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'jane@test.com',
        subject: expect.stringContaining('Jane Doe'),
      }),
    );
  });

  it('succeeds with only required fields', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const res = await POST(makeRequest({ firstName: 'Test', email: 'a@b.com' }));
    expect(res.status).toBe(200);
    spy.mockRestore();
  });
});
