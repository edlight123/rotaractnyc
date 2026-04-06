/**
 * Tests for POST /api/portal/upload
 *
 * Verifies session auth, input validation, MIME whitelist, and upload metadata.
 */

const mockVerify = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifySessionCookie: (...args: any[]) => mockVerify(...args) },
  adminDb: {},
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { POST } from '@/app/api/portal/upload/route';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function makeRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/portal/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue({ uid: 'user-456' });
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === 'rotaract_portal_session'
          ? { name, value: 'valid-session' }
          : undefined,
    } as any);
  });

  it('returns 401 when session cookie is missing', async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    } as any);

    const res = await POST(makeRequest({ fileName: 'photo.jpg', fileType: 'image/jpeg' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('returns 400 when fileName is missing', async () => {
    const res = await POST(makeRequest({ fileType: 'image/png' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/fileName/i);
  });

  it('returns 400 for disallowed MIME type', async () => {
    const res = await POST(
      makeRequest({ fileName: 'script.sh', fileType: 'application/x-sh' }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/not allowed/i);
  });

  it('returns 200 with upload metadata for valid image', async () => {
    const res = await POST(
      makeRequest({ fileName: 'photo.jpg', fileType: 'image/jpeg' }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.storagePath).toContain('user-456');
    expect(data.uid).toBe('user-456');
    expect(data.maxSizeMB).toBe(10);
  });

  it('returns 200 with upload metadata for valid PDF', async () => {
    const res = await POST(
      makeRequest({ fileName: 'report.pdf', fileType: 'application/pdf' }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.storagePath).toContain('user-456');
    expect(data.storagePath).toContain('.pdf');
    expect(data.uid).toBe('user-456');
    expect(data.maxSizeMB).toBe(10);
  });
});
