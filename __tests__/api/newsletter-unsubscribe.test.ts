/**
 * Tests for /api/newsletter/unsubscribe (footer link + RFC 8058 one-click).
 */

const mockQueryGet = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      where: () => ({ limit: () => ({ get: mockQueryGet }) }),
    }),
  },
}));

import { GET, POST } from '@/app/api/newsletter/unsubscribe/route';

function subscriber(data: Record<string, any>) {
  return { empty: false, docs: [{ data: () => data, ref: { update: mockUpdate } }] };
}

describe('/api/newsletter/unsubscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue(undefined);
  });

  it('GET unsubscribes and redirects to the confirmation banner', async () => {
    mockQueryGet.mockResolvedValue(subscriber({ confirmed: true }));
    const res = await GET(new Request('http://localhost/api/newsletter/unsubscribe?token=abc'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('?subscribed=unsubscribed');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ confirmed: false }));
  });

  it('GET with an unknown token redirects as invalid without writing', async () => {
    mockQueryGet.mockResolvedValue({ empty: true, docs: [] });
    const res = await GET(new Request('http://localhost/api/newsletter/unsubscribe?token=nope'));
    expect(res.headers.get('location')).toContain('?subscribed=invalid');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('GET without a token is invalid', async () => {
    const res = await GET(new Request('http://localhost/api/newsletter/unsubscribe'));
    expect(res.headers.get('location')).toContain('?subscribed=invalid');
    expect(mockQueryGet).not.toHaveBeenCalled();
  });

  it('POST (one-click) unsubscribes and returns 200', async () => {
    mockQueryGet.mockResolvedValue(subscriber({ confirmed: true }));
    const res = await POST(new Request('http://localhost/api/newsletter/unsubscribe?token=abc', { method: 'POST' }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('is idempotent for an already-unsubscribed subscriber', async () => {
    mockQueryGet.mockResolvedValue(subscriber({ confirmed: false, unsubscribedAt: '2026-01-01' }));
    const res = await GET(new Request('http://localhost/api/newsletter/unsubscribe?token=abc'));
    expect(res.headers.get('location')).toContain('?subscribed=unsubscribed');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
