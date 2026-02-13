/**
 * Tests for POST /api/contact
 *
 * We mock the Resend SDK and test:
 * - validation (missing fields)
 * - success with Resend configured
 * - fallback when Resend not configured
 */

// Mock Resend
const mockSend = jest.fn().mockResolvedValue({ id: 'test-id' });
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
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

  it('sends email via Resend when API key is configured', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const res = await POST(
      makeRequest({ name: 'Test User', email: 'test@test.com', message: 'Hello!' }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'test@test.com',
        subject: expect.stringContaining('Test User'),
      }),
    );
    delete process.env.RESEND_API_KEY;
  });

  it('logs to console when Resend is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const res = await POST(
      makeRequest({ name: 'Test', email: 'a@b.com', message: 'hi' }),
    );
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Resend not configured'),
      expect.any(Object),
    );
    spy.mockRestore();
  });
});
