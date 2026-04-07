/**
 * Tests for GET /api/portal/exports
 *
 * Verifies session auth, role-based access, query param validation,
 * and CSV response for valid requests.
 */

const mockVerify = jest.fn();
const mockGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockGet,
      })),
      orderBy: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      })),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
  },
  adminAuth: { verifySessionCookie: (...args: any[]) => mockVerify(...args) },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  getRateLimitKey: jest.fn().mockReturnValue('test-key'),
  rateLimitResponse: jest.fn(),
}));

import { GET } from '@/app/api/portal/exports/route';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function makeRequest(type?: string) {
  const url = type
    ? `http://localhost/api/portal/exports?type=${type}`
    : 'http://localhost/api/portal/exports';
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/portal/exports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValue({ data: () => ({ role: 'board' }) });
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === 'rotaract_portal_session'
          ? { name, value: 'valid-session' }
          : undefined,
    } as any);
  });

  it('returns 401 without session cookie', async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    } as any);

    const res = await GET(makeRequest('members'));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('returns 401 for non-board member', async () => {
    mockGet.mockResolvedValue({ data: () => ({ role: 'member' }) });

    const res = await GET(makeRequest('members'));
    // The route returns 403 for authenticated but unauthorized roles
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/forbidden/i);
  });

  it('returns 400 for invalid type query param', async () => {
    const res = await GET(makeRequest('invalid-type'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid export type/i);
  });

  it('returns 400 when type query param is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid export type/i);
  });

  it('returns CSV content-type for valid request', async () => {
    const res = await GET(makeRequest('members'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toContain('members-export-');
    expect(res.headers.get('Content-Disposition')).toContain('.csv');
  });
});
