/**
 * Tests for GET / PATCH /api/portal/notifications
 */

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: jest.fn() },
  adminAuth: { verifySessionCookie: jest.fn() },
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: () => 'test-key',
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));

// Mock next/headers cookies()
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP') },
}));

import { GET, PATCH } from '@/app/api/portal/notifications/route';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const mockAdminAuth = adminAuth as jest.Mocked<typeof adminAuth>;
const mockAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

const DEFAULT_PREFERENCES = {
  duesReminders: true,
  eventReminders: true,
  welcomeSequence: true,
  announcements: true,
  weeklyDigest: false,
};

function makePatchRequest(body: Record<string, any>): NextRequest {
  return new NextRequest('http://localhost/api/portal/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Wire up the cookies + adminAuth mocks so authenticate() resolves to the given uid (or null). */
function setupAuth(uid: string | null) {
  if (uid) {
    mockCookies.mockResolvedValue({
      get: jest.fn((name: string) =>
        name === 'rotaract_portal_session' ? { name, value: 'valid-session' } : undefined,
      ),
    } as any);
    (mockAdminAuth.verifySessionCookie as jest.Mock).mockResolvedValue({ uid });
  } else {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as any);
  }
}

/** Create a mock Firestore doc reference for notification_preferences. */
function setupPreferencesDoc(data: Record<string, any> | null) {
  const mockGet = jest.fn(async () => ({
    exists: data !== null,
    data: () => data,
  }));
  const mockSet = jest.fn();
  const mockDoc = jest.fn(() => ({ get: mockGet, set: mockSet }));

  (mockAdminDb.collection as jest.Mock).mockReturnValue({ doc: mockDoc });

  return { mockGet, mockSet, mockDoc };
}

describe('GET /api/portal/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without a session cookie', async () => {
    setupAuth(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('returns default preferences when no Firestore doc exists', async () => {
    setupAuth('user-abc');
    setupPreferencesDoc(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('merges stored preferences with defaults', async () => {
    setupAuth('user-abc');
    setupPreferencesDoc({ weeklyDigest: true, duesReminders: false });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toEqual({
      ...DEFAULT_PREFERENCES,
      weeklyDigest: true,
      duesReminders: false,
    });
  });
});

describe('PATCH /api/portal/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without a session cookie', async () => {
    setupAuth(null);
    const res = await PATCH(makePatchRequest({ duesReminders: false }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('returns 400 for an invalid preference key', async () => {
    setupAuth('user-abc');
    setupPreferencesDoc(null);

    const res = await PATCH(makePatchRequest({ invalidKey: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('invalidKey');
  });

  it('returns 400 when a preference value is not boolean', async () => {
    setupAuth('user-abc');
    setupPreferencesDoc(null);

    const res = await PATCH(makePatchRequest({ duesReminders: 'yes' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/boolean/i);
  });

  it('updates preferences and returns the merged result', async () => {
    setupAuth('user-abc');

    // The PATCH handler calls .set() then .get() — mock the single .get()
    // to return the post-update document.
    const { mockSet } = setupPreferencesDoc({
      duesReminders: false,
      eventReminders: true,
      welcomeSequence: true,
      announcements: true,
      weeklyDigest: true,
      updatedAt: 'MOCK_TIMESTAMP',
    });

    const res = await PATCH(
      makePatchRequest({ duesReminders: false, weeklyDigest: true }),
    );
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ duesReminders: false, weeklyDigest: true }),
      { merge: true },
    );

    const body = await res.json();
    expect(body.preferences.duesReminders).toBe(false);
    expect(body.preferences.weeklyDigest).toBe(true);
  });

  it('returns 400 when no valid preferences are provided', async () => {
    setupAuth('user-abc');
    setupPreferencesDoc(null);

    const res = await PATCH(makePatchRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no valid/i);
  });
});
