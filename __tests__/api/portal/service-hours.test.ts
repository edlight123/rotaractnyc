/**
 * Tests for GET, POST, PATCH /api/portal/service-hours
 *
 * Verifies session auth, role checks, hour clamping, and Firestore writes.
 */

const mockSnapshotDocs = jest.fn().mockReturnValue([]);
const mockOrderByGet = jest.fn().mockResolvedValue({ docs: mockSnapshotDocs() });
const mockLimit = jest.fn().mockReturnValue({ get: mockOrderByGet });
const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
const mockWhereChain = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockAdd = jest.fn().mockResolvedValue({ id: 'sh-new-id' });
const mockEntryUpdate = jest.fn().mockResolvedValue(undefined);
const mockEntryGet = jest.fn().mockResolvedValue({ exists: true, data: () => ({}) });
const mockEntryDoc = jest.fn().mockReturnValue({ get: mockEntryGet, update: mockEntryUpdate });
const mockMemberData = jest.fn().mockReturnValue({ role: 'member', displayName: 'Test User' });
const mockMemberGet = jest.fn().mockResolvedValue({ exists: true, data: mockMemberData });
const mockMemberDoc = jest.fn().mockReturnValue({ get: mockMemberGet });
const mockCollection = jest.fn().mockImplementation((name: string) => {
  if (name === 'serviceHours') {
    return {
      where: mockWhereChain,
      orderBy: mockOrderBy,
      add: mockAdd,
      doc: mockEntryDoc,
    };
  }
  if (name === 'members') {
    return { doc: mockMemberDoc };
  }
  return {};
});
const mockVerify = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifySessionCookie: (...args: any[]) => mockVerify(...args) },
  adminDb: { collection: (...args: any[]) => mockCollection(...args) },
  serializeDoc: (doc: any) => doc,
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

import { GET, POST, PATCH } from '@/app/api/portal/service-hours/route';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function makeGetRequest(params = '') {
  return new NextRequest(`http://localhost/api/portal/service-hours${params}`, { method: 'GET' });
}

function makePostRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/portal/service-hours', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/portal/service-hours', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/portal/service-hours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerify.mockResolvedValue({ uid: 'user-123' });
    mockMemberData.mockReturnValue({ role: 'member', displayName: 'Test User' });
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === 'rotaract_portal_session'
          ? { name, value: 'valid-session' }
          : undefined,
    } as any);
    // Default: empty results for queries
    mockOrderByGet.mockResolvedValue({ docs: [] });
  });

  // ─── GET tests ───
  describe('GET', () => {
    it('returns 401 when session cookie is missing', async () => {
      mockCookies.mockResolvedValue({
        get: () => undefined,
      } as any);

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/unauthorized/i);
    });

    it('filters by memberId for regular members', async () => {
      mockMemberData.mockReturnValue({ role: 'member' });
      mockOrderByGet.mockResolvedValue({ docs: [] });

      await GET(makeGetRequest());

      expect(mockWhereChain).toHaveBeenCalledWith('memberId', '==', 'user-123');
    });

    it('returns all entries for board users without memberId filter', async () => {
      mockMemberData.mockReturnValue({ role: 'board' });
      mockOrderByGet.mockResolvedValue({ docs: [] });

      await GET(makeGetRequest());

      // Board should NOT filter by memberId — the collection's orderBy is called directly
      // (no where('memberId', ...) call for board)
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  // ─── POST tests ───
  describe('POST', () => {
    it('returns 401 without session', async () => {
      mockCookies.mockResolvedValue({
        get: () => undefined,
      } as any);

      const res = await POST(makePostRequest({ hours: 2 }));
      expect(res.status).toBe(401);
    });

    it('clamps hours to minimum 0.25 and returns 201', async () => {
      mockAdd.mockResolvedValue({ id: 'sh-1' });

      const res = await POST(makePostRequest({ hours: 0.1, eventTitle: 'Cleanup' }));
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe('sh-1');

      // Verify the hours were clamped
      const addCallArg = mockAdd.mock.calls[0][0];
      expect(addCallArg.hours).toBe(0.25);
    });

    it('clamps hours to maximum 24 and returns 201', async () => {
      mockAdd.mockResolvedValue({ id: 'sh-2' });

      const res = await POST(makePostRequest({ hours: 100, eventTitle: 'Marathon' }));
      expect(res.status).toBe(201);

      const addCallArg = mockAdd.mock.calls[0][0];
      expect(addCallArg.hours).toBe(24);
    });

    it('sets status to pending on new entry', async () => {
      mockAdd.mockResolvedValue({ id: 'sh-3' });

      await POST(makePostRequest({ hours: 3, eventTitle: 'Park Cleanup' }));

      const addCallArg = mockAdd.mock.calls[0][0];
      expect(addCallArg.status).toBe('pending');
      expect(addCallArg.memberId).toBe('user-123');
    });
  });

  // ─── PATCH tests ───
  describe('PATCH', () => {
    it('returns 403 for regular members', async () => {
      mockMemberData.mockReturnValue({ role: 'member' });

      const res = await PATCH(
        makePatchRequest({ entryId: 'sh-1', status: 'approved' }),
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/forbidden/i);
    });

    it('returns 400 when entryId or status is invalid', async () => {
      mockMemberData.mockReturnValue({ role: 'board' });

      const res = await PATCH(makePatchRequest({ entryId: 'sh-1', status: 'invalid' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/required/i);
    });

    it('approves entry when called by board user', async () => {
      mockMemberData.mockReturnValue({ role: 'president' });
      mockEntryGet.mockResolvedValue({ exists: true, data: () => ({}) });

      const res = await PATCH(
        makePatchRequest({ entryId: 'sh-1', status: 'approved' }),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('approved');

      expect(mockEntryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          reviewedBy: 'user-123',
        }),
      );
    });
  });
});
