/**
 * Tests for POST /api/newsletter/subscribe
 *
 * Mocks sendEmail, rateLimit, and the Firestore admin doc read/write so tests
 * are fast and deterministic.
 */

const mockSendEmail = jest.fn();
const mockDocGet = jest.fn();
const mockDocSet = jest.fn();

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: jest.fn().mockReturnValue('test-key'),
  rateLimitResponse: (resetAt: number) =>
    new Response(JSON.stringify({ error: 'Too many requests', resetAt }), { status: 429 }),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({ get: mockDocGet, set: mockDocSet }),
    }),
  },
}));

import { POST } from '@/app/api/newsletter/subscribe/route';

function makeRequest(body: Record<string, any>) {
  return new Request('http://localhost/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true, id: 'test-id' });
    mockDocGet.mockResolvedValue({ exists: false });
    mockDocSet.mockResolvedValue(undefined);
  });

  it('returns 400 for an invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('creates an unconfirmed subscriber and sends a confirmation email', async () => {
    const res = await POST(makeRequest({ email: 'New@Example.com', source: 'footer' }));
    expect(res.status).toBe(200);

    // Stored lowercased and unconfirmed, with a token.
    expect(mockDocSet).toHaveBeenCalledTimes(1);
    const written = mockDocSet.mock.calls[0][0];
    expect(written.email).toBe('new@example.com');
    expect(written.confirmed).toBe(false);
    expect(typeof written.token).toBe('string');

    // Confirmation email sent to the subscriber.
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe('new@example.com');
  });

  it('is idempotent for an already-confirmed subscriber (no email resent)', async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ confirmed: true }) });
    const res = await POST(makeRequest({ email: 'existing@example.com' }));
    expect(res.status).toBe(200);
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('defaults an unknown source to "footer"', async () => {
    await POST(makeRequest({ email: 'a@b.com', source: 'hacker' }));
    expect(mockDocSet.mock.calls[0][0].source).toBe('footer');
  });
});
