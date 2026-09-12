/**
 * Tests for POST /api/portal/events/rsvp
 *
 * Verifies session-cookie auth, input validation, Firestore upsert,
 * and RSVP confirmation email dispatch.
 */

/**
 * An event date safely in the future. These fixtures previously hardcoded a
 * date; once it passed, the route short-circuited with 410 "registration is
 * closed" and the suite went red for reasons unrelated to what it tests.
 */
function futureDate(daysAhead = 30): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn().mockResolvedValue({ exists: false, data: () => null });
const mockEventGet = jest.fn().mockResolvedValue({
  exists: true,
  data: () => ({ title: 'Spring Gala', date: futureDate(), time: '7:00 PM', location: 'New York, NY', slug: 'spring-gala-2026' }),
});
const mockDoc = jest.fn().mockReturnValue({ set: mockSet, get: mockGet, id: 'test-rsvp-id' });
const mockEventDoc = jest.fn().mockReturnValue({ get: mockEventGet });
const mockCollection = jest.fn().mockImplementation((name: string) => {
  if (name === 'events') return { doc: mockEventDoc };
  return { doc: mockDoc };
});
const mockVerify = jest.fn();
const mockGetUser = jest.fn();
const mockSendEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: any[]) => mockVerify(...args),
    getUser: (...args: any[]) => mockGetUser(...args),
  },
  adminDb: { collection: (...args: any[]) => mockCollection(...args) },
}));

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/email/templates', () => ({
  memberRsvpConfirmationEmail: jest.fn().mockReturnValue({
    subject: 'RSVP confirmed: Spring Gala',
    html: '<p>confirmed</p>',
    text: 'confirmed',
  }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

import { POST } from '@/app/api/portal/events/rsvp/route';
import { cookies } from 'next/headers';
import { memberRsvpConfirmationEmail } from '@/lib/email/templates';

const mockCookies = cookies as unknown as jest.Mock;
const mockMemberRsvpConfirmationEmail = memberRsvpConfirmationEmail as jest.Mock;

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
    mockGetUser.mockResolvedValue({ uid: 'user-123', email: 'member@example.com', displayName: 'Test Member' });
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === 'rotaract_portal_session'
          ? { name, value: 'valid-session' }
          : undefined,
    } as any);
    // Default: no existing RSVP (first-time going)
    mockGet.mockResolvedValue({ exists: false, data: () => null });
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

  it('sends RSVP confirmation email when RSVPing "going" for the first time', async () => {
    // mockGet returns exists: false → prevStatus is null → !wasGoing && nowGoing
    mockGet.mockResolvedValue({ exists: false, data: () => null });

    const res = await POST(makeRequest({ eventId: 'evt-1', status: 'going' }) as any);
    expect(res.status).toBe(200);

    // Allow the non-blocking email promise to settle
    await new Promise(r => setImmediate(r));

    expect(mockGetUser).toHaveBeenCalledWith('user-123');
    expect(mockMemberRsvpConfirmationEmail).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'member@example.com',
        subject: 'RSVP confirmed: Spring Gala',
      }),
    );
  });

  it('does NOT send email when changing from "going" to "maybe"', async () => {
    // Already going → wasGoing = true, nowGoing = false
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'going', tierId: null }) });

    const res = await POST(makeRequest({ eventId: 'evt-1', status: 'maybe' }) as any);
    expect(res.status).toBe(200);

    await new Promise(r => setImmediate(r));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('does NOT send email when already going and re-confirming going', async () => {
    // Already going → wasGoing = true, nowGoing = true → no transition
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'going', tierId: null }) });

    const res = await POST(makeRequest({ eventId: 'evt-1', status: 'going' }) as any);
    expect(res.status).toBe(200);

    await new Promise(r => setImmediate(r));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('still returns 200 even if email send throws', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth unavailable'));
    mockGet.mockResolvedValue({ exists: false, data: () => null });

    const res = await POST(makeRequest({ eventId: 'evt-1', status: 'going' }) as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
