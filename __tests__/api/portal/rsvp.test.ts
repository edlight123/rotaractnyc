/**
 * Tests for POST /api/portal/events/rsvp
 *
 * Verifies session-cookie auth, input validation, and Firestore upsert.
 */

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
const mockVerify = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifySessionCookie: (...args: any[]) => mockVerify(...args) },
  adminDb: { collection: (...args: any[]) => mockCollection(...args) },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

import { POST } from '@/app/api/portal/events/rsvp/route';
import { cookies } from 'next/headers';

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function makeRequest(body: Record<string, any>) {
  return new Request('http://localhost/api/portal/events/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portal/events/rsvp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue({ uid: 'user-123' });
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

    const res = await POST(makeRequest({ eventId: 'evt-1', status: 'going' }) as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('returns 400 when eventId is missing', async () => {
    const res = await POST(makeRequest({ status: 'going' }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required/i);
  });

  it('returns 400 when status is missing', async () => {
    const res = await POST(makeRequest({ eventId: 'evt-1' }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required/i);
  });

  it('returns 400 for invalid RSVP status', async () => {
    const res = await POST(makeRequest({ eventId: 'evt-1', status: 'attending' }) as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid/i);
  });

  it('creates RSVP with status "going" and returns 200', async () => {
    const res = await POST(makeRequest({ eventId: 'evt-1', status: 'going' }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockCollection).toHaveBeenCalledWith('rsvps');
    expect(mockDoc).toHaveBeenCalledWith('user-123_evt-1');
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'user-123',
        eventId: 'evt-1',
        status: 'going',
      }),
      { merge: true },
    );
  });

  it('creates RSVP with status "maybe" and returns 200', async () => {
    const res = await POST(makeRequest({ eventId: 'evt-2', status: 'maybe' }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockDoc).toHaveBeenCalledWith('user-123_evt-2');
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'user-123',
        eventId: 'evt-2',
        status: 'maybe',
      }),
      { merge: true },
    );
  });
});
