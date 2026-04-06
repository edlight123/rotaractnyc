/**
 * Tests for GET and POST /api/portal/members
 *
 * Verifies session auth, role-based access, input validation, and Firestore queries.
 */

const mockGet = jest.fn();
const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet });
const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
const mockAdd = jest.fn().mockResolvedValue({ id: 'new-member-id' });
const mockMemberData = jest.fn().mockReturnValue({ role: 'member', displayName: 'Test User' });
const mockMemberGet = jest.fn().mockResolvedValue({ exists: true, data: mockMemberData });
const mockMemberDoc = jest.fn().mockReturnValue({ get: mockMemberGet });
const mockLimitGet = jest.fn().mockResolvedValue({ empty: true });
const mockLimit = jest.fn().mockReturnValue({ get: mockLimitGet });
const mockWhereEmail = jest.fn().mockReturnValue({ limit: mockLimit });
const mockCollection = jest.fn().mockImplementation((name: string) => {
  if (name === 'members') {
    return {
      where: (...args: any[]) => {
        // Distinguish between status filter (GET) and email filter (POST dup check)
        if (args[0] === 'email') return mockWhereEmail(...args);
        return mockWhere(...args);
      },
      doc: mockMemberDoc,
      add: mockAdd,
    };
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

// Mock the dynamic email imports used by POST
jest.mock('@/lib/email/send', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/email/templates', () => ({
  inviteEmail: () => ({ subject: 'Invite', html: '<p>Welcome</p>', text: 'Welcome' }),
}));

import { GET, POST } from '@/app/api/portal/members/route';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function makeGetRequest() {
  return new NextRequest('http://localhost/api/portal/members', { method: 'GET' });
}

function makePostRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/portal/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/portal/members', () => {
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

  // ─── GET tests ───
  describe('GET', () => {
    it('returns list of active members on success', async () => {
      mockGet.mockResolvedValue({
        docs: [
          { id: 'm1', data: () => ({ displayName: 'Alice', status: 'active' }) },
          { id: 'm2', data: () => ({ displayName: 'Bob', status: 'active' }) },
        ],
      });

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it('returns 500 when session verification fails', async () => {
      mockVerify.mockRejectedValue(new Error('Invalid token'));

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toMatch(/failed/i);
    });

    it('queries Firestore for active members ordered by displayName', async () => {
      mockGet.mockResolvedValue({ docs: [] });

      await GET(makeGetRequest());

      expect(mockCollection).toHaveBeenCalledWith('members');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
      expect(mockOrderBy).toHaveBeenCalledWith('displayName');
    });
  });

  // ─── POST tests ───
  describe('POST', () => {
    it('returns 403 when user role is not board/president/treasurer', async () => {
      mockMemberData.mockReturnValue({ role: 'member' });

      const res = await POST(
        makePostRequest({ firstName: 'New', lastName: 'User', email: 'new@test.com' }),
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/forbidden/i);
    });

    it('returns 400 when required fields are missing', async () => {
      mockMemberData.mockReturnValue({ role: 'president' });

      const res = await POST(makePostRequest({ firstName: 'Jane' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/required/i);
    });

    it('returns 201 when board user creates a member with valid data', async () => {
      mockMemberData.mockReturnValue({ role: 'board' });
      mockLimitGet.mockResolvedValue({ empty: true }); // no duplicate
      mockAdd.mockResolvedValue({ id: 'new-member-id' });

      const res = await POST(
        makePostRequest({ firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' }),
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe('new-member-id');
      expect(data.displayName).toBe('Jane Doe');
    });

    it('returns 401 when session cookie is missing', async () => {
      mockCookies.mockResolvedValue({
        get: () => undefined,
      } as any);

      const res = await POST(
        makePostRequest({ firstName: 'New', lastName: 'User', email: 'new@test.com' }),
      );
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/unauthorized/i);
    });
  });
});
