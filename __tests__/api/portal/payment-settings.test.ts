/**
 * Tests for GET /api/portal/settings/payment — clients read zelleIdentifier /
 * venmoUsername and the *Enabled flags, so older saves (zellePhone,
 * venmoHandle, no flags) must be normalized or the payment options never show.
 */

let stored: Record<string, any> | undefined;

jest.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {},
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: !!stored, data: () => stored }),
      }),
    }),
  },
}));

import { GET } from '@/app/api/portal/settings/payment/route';

describe('GET /api/portal/settings/payment', () => {
  it('maps legacy field names and defaults methods to enabled', async () => {
    stored = { zellePhone: 'treasurer@example.com', venmoHandle: 'rotaract', instructions: '' };
    const body = await (await GET()).json();
    expect(body).toMatchObject({
      zelleIdentifier: 'treasurer@example.com',
      zelleEnabled: true,
      venmoUsername: 'rotaract',
      venmoEnabled: true,
      cashappUsername: '',
    });
  });

  it('prefers new field names and respects disabled flags', async () => {
    stored = { zelleIdentifier: 'new@example.com', zellePhone: 'old@example.com', zelleEnabled: false };
    const body = await (await GET()).json();
    expect(body.zelleIdentifier).toBe('new@example.com');
    expect(body.zelleEnabled).toBe(false);
  });

  it('returns empty, enabled defaults when nothing is saved', async () => {
    stored = undefined;
    const body = await (await GET()).json();
    expect(body).toMatchObject({ zelleIdentifier: '', zelleEnabled: true, venmoUsername: '' });
  });
});
