/**
 * Tests for POST /api/portal/members/[id]/reset-workspace-password
 *
 * Issues a fresh Workspace temporary password for a member. Board-only, and
 * it must not quietly reactivate a suspended (offboarded) account.
 */

const mockVerifySessionCookie = jest.fn();
const mockMemberGet = jest.fn();
const mockMemberUpdate = jest.fn();
const mockResetWorkspacePassword = jest.fn();
const mockIsDirectoryConfigured = jest.fn();
const mockSendEmail = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: any[]) => mockVerifySessionCookie(...args),
  },
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: () => mockMemberGet(),
        update: (...args: any[]) => mockMemberUpdate(...args),
      }),
    }),
  },
}));

jest.mock('@/lib/google/directory', () => ({
  resetWorkspacePassword: (...args: any[]) => mockResetWorkspacePassword(...args),
  isDirectoryConfigured: () => mockIsDirectoryConfigured(),
}));

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/email/templates', () => ({
  memberWorkspaceWelcomeEmail: () => ({
    subject: 'Your account',
    html: '<p>pw</p>',
    text: 'pw',
  }),
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: () => 'test-key',
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));

jest.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'session-cookie' }) }),
}));

import { POST } from '@/app/api/portal/members/[id]/reset-workspace-password/route';

const MEMBER_ID = 'member-123';
const ORG_EMAIL = 'amado.suarez@rotaractnyc.org';

function makeRequest() {
  return new Request(
    `http://localhost/api/portal/members/${MEMBER_ID}/reset-workspace-password`,
    { method: 'POST' },
  ) as any;
}

const params = Promise.resolve({ id: MEMBER_ID });

describe('POST /api/portal/members/[id]/reset-workspace-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifySessionCookie.mockResolvedValue({ uid: 'admin-uid' });
    // First get() is the caller's role lookup, second is the target member.
    mockMemberGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'board' }) })
      .mockResolvedValue({
        exists: true,
        data: () => ({
          orgEmail: ORG_EMAIL,
          personalEmail: 'amado.suarez07@gmail.com',
          firstName: 'Amado',
        }),
      });
    mockMemberUpdate.mockResolvedValue(undefined);
    mockIsDirectoryConfigured.mockReturnValue(true);
    mockResetWorkspacePassword.mockResolvedValue({
      orgEmail: ORG_EMAIL,
      temporaryPassword: 'Fresh-Temp-99',
      suspended: false,
    });
    mockSendEmail.mockResolvedValue({ success: true, id: 'sent' });
  });

  it('resets the password and returns it for manual hand-off', async () => {
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.temporaryPassword).toBe('Fresh-Temp-99');
    expect(json.orgEmail).toBe(ORG_EMAIL);
    expect(mockResetWorkspacePassword).toHaveBeenCalledWith(ORG_EMAIL);
  });

  it('emails the new credentials to the personal address, bypassing the pause switch', async () => {
    const res = await POST(makeRequest(), { params });
    const json = await res.json();

    expect(json.emailed).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'amado.suarez07@gmail.com',
        // Credential delivery is admin-initiated and transactional — the
        // member cannot use the account without it.
        ignorePause: true,
      }),
    );
  });

  it('still returns the password when the email fails', async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: 'Resend down' });

    const res = await POST(makeRequest(), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.temporaryPassword).toBe('Fresh-Temp-99');
    expect(json.emailed).toBe(false);
    expect(json.emailError).toBe('Resend down');
  });

  it('reports a suspended account rather than silently reactivating it', async () => {
    mockResetWorkspacePassword.mockResolvedValue({
      orgEmail: ORG_EMAIL,
      temporaryPassword: 'Fresh-Temp-99',
      suspended: true,
    });

    const res = await POST(makeRequest(), { params });
    const json = await res.json();

    expect(json.suspended).toBe(true);
  });

  it('records who reset the password and when', async () => {
    await POST(makeRequest(), { params });
    expect(mockMemberUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'provisioning.passwordResetBy': 'admin-uid',
        'provisioning.passwordResetAt': expect.any(String),
      }),
    );
  });

  // ── Authorization ──

  it('returns 403 for a plain member', async () => {
    mockMemberGet.mockReset();
    mockMemberGet.mockResolvedValue({ exists: true, data: () => ({ role: 'member' }) });

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(403);
    expect(mockResetWorkspacePassword).not.toHaveBeenCalled();
  });

  it('returns 401 without a valid session', async () => {
    mockVerifySessionCookie.mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(401);
    expect(mockResetWorkspacePassword).not.toHaveBeenCalled();
  });

  // ── Preconditions ──

  it('returns 404 when the member does not exist', async () => {
    mockMemberGet.mockReset();
    mockMemberGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'board' }) })
      .mockResolvedValue({ exists: false });

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(404);
    expect(mockResetWorkspacePassword).not.toHaveBeenCalled();
  });

  it('returns 400 when the member has no Workspace account', async () => {
    mockMemberGet.mockReset();
    mockMemberGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ role: 'board' }) })
      .mockResolvedValue({ exists: true, data: () => ({ email: 'x@gmail.com' }) });

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(400);
    expect(mockResetWorkspacePassword).not.toHaveBeenCalled();
  });

  it('returns 503 when Workspace provisioning is not configured', async () => {
    mockIsDirectoryConfigured.mockReturnValue(false);

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(503);
    expect(mockResetWorkspacePassword).not.toHaveBeenCalled();
  });

  it('returns 404 when the Workspace account no longer exists', async () => {
    mockResetWorkspacePassword.mockRejectedValue(
      Object.assign(new Error('Not Found'), { code: 404 }),
    );

    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/re-provision/i);
  });
});
