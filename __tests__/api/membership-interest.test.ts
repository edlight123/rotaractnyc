/**
 * Tests for POST /api/membership-interest
 */

const mockSend = jest.fn().mockResolvedValue({ id: 'test-id' });
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
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

  it('sends email via Resend when configured', async () => {
    process.env.RESEND_API_KEY = 'test-key';
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
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'jane@test.com',
        subject: expect.stringContaining('Jane Doe'),
      }),
    );
    delete process.env.RESEND_API_KEY;
  });

  it('succeeds with only required fields', async () => {
    delete process.env.RESEND_API_KEY;
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const res = await POST(makeRequest({ firstName: 'Test', email: 'a@b.com' }));
    expect(res.status).toBe(200);
    spy.mockRestore();
  });
});
