/**
 * Tests for POST /api/portal/auth/org-signin
 *
 * This route mints a custom token for a DIFFERENT uid than the one that
 * authenticated, so the gates below are a security boundary, not validation
 * niceties. Each one gets a test that proves it refuses.
 */

const mockVerifyIdToken = jest.fn();
const mockCreateCustomToken = jest.fn();
const mockMemberDocGet = jest.fn();
const mockOrgEmailQueryGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
    createCustomToken: (...args: any[]) => mockCreateCustomToken(...args),
  },
  adminDb: {
    collection: () => ({
      doc: () => ({ get: () => mockMemberDocGet() }),
      where: () => ({ limit: () => ({ get: () => mockOrgEmailQueryGet() }) }),
    }),
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 5, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: () => 'test-key',
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));

import { POST } from '@/app/api/portal/auth/org-signin/route';

const ORG_DOMAIN = 'rotaractnyc.org';
const CALLER_UID = 'workspace-uid';
const MEMBER_UID = 'canonical-member-uid';

function makeRequest(body: Record<string, any> = { idToken: 'tok' }) {
  return new Request('http://localhost/api/portal/auth/org-signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** A member doc as returned by a Firestore query snapshot. */
function memberDoc(id: string, data: Record<string, any>) {
  return { id, data: () => data };
}

describe('POST /api/portal/auth/org-signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_WORKSPACE_DOMAIN = ORG_DOMAIN;

    // Happy path: verified workspace address, caller has no membership of its
    // own, exactly one active member claims the address.
    mockVerifyIdToken.mockResolvedValue({
      uid: CALLER_UID,
      email: `amado.suarez@${ORG_DOMAIN}`,
      email_verified: true,
    });
    mockMemberDocGet.mockResolvedValue({ exists: false });
    mockOrgEmailQueryGet.mockResolvedValue({
      docs: [
        memberDoc(MEMBER_UID, {
          status: 'active',
          email: 'amado.suarez07@gmail.com',
          orgEmail: `amado.suarez@${ORG_DOMAIN}`,
        }),
      ],
    });
    mockCreateCustomToken.mockResolvedValue('minted-custom-token');
  });

  it('mints a custom token for the member uid, not the caller uid', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.customToken).toBe('minted-custom-token');
    expect(data.registeredEmail).toBe('amado.suarez07@gmail.com');
    expect(mockCreateCustomToken).toHaveBeenCalledWith(MEMBER_UID);
    expect(mockCreateCustomToken).not.toHaveBeenCalledWith(CALLER_UID);
  });

  it('checks for revoked tokens when verifying', async () => {
    await POST(makeRequest());
    expect(mockVerifyIdToken).toHaveBeenCalledWith('tok', true);
  });

  it('returns 400 when no token is supplied', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('returns 503 when the workspace domain is not configured', async () => {
    delete process.env.GOOGLE_WORKSPACE_DOMAIN;
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  // ── Gate 1: verified address on the club's own Workspace domain ──

  it('refuses an address outside the workspace domain', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: CALLER_UID,
      email: 'attacker@gmail.com',
      email_verified: true,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('refuses a lookalike domain that merely ends with the org name', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: CALLER_UID,
      email: `amado@evil-${ORG_DOMAIN}`,
      email_verified: true,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('refuses an unverified email', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: CALLER_UID,
      email: `amado.suarez@${ORG_DOMAIN}`,
      email_verified: false,
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  // ── Gate 2: caller must not already hold a membership ──

  it('refuses when the calling account already has its own membership', async () => {
    mockMemberDocGet.mockResolvedValue({ exists: true });
    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  // ── Gate 3: exactly one active member claims the address ──

  it('returns 404 when no member claims the address', async () => {
    mockOrgEmailQueryGet.mockResolvedValue({ docs: [] });
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('refuses rather than guesses when two members claim the address', async () => {
    mockOrgEmailQueryGet.mockResolvedValue({
      docs: [
        memberDoc('member-a', { status: 'active', email: 'a@gmail.com' }),
        memberDoc('member-b', { status: 'active', email: 'b@gmail.com' }),
      ],
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(409);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('refuses when the claiming membership is not active', async () => {
    mockOrgEmailQueryGet.mockResolvedValue({
      docs: [memberDoc(MEMBER_UID, { status: 'alumni', email: 'x@gmail.com' })],
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('ignores a doc keyed by the caller uid itself when resolving the owner', async () => {
    mockOrgEmailQueryGet.mockResolvedValue({
      docs: [memberDoc(CALLER_UID, { status: 'active', email: 'self@gmail.com' })],
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('token expired'));
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(mockCreateCustomToken).not.toHaveBeenCalled();
  });
});
