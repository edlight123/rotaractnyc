/**
 * Tests for POST /api/portal/broadcasts — the newsletter-subscriber audiences
 * and event announcements.
 *
 * Firestore is replaced with a tiny in-memory fake that supports the query
 * shapes the route uses (==, in, __name__ in, batch updates).
 */

type Doc = Record<string, any>;
let db: Record<string, Record<string, Doc>>;

const mockSendEmail = jest.fn();
const mockSendBulkEmail = jest.fn();

function makeQuery(name: string, filters: Array<(id: string, d: Doc) => boolean> = []): any {
  const run = () =>
    Object.entries(db[name] || {})
      .filter(([id, d]) => filters.every((f) => f(id, d)))
      .map(([id, d]) => ({ id, ref: makeDocRef(name, id), data: () => d, exists: true }));
  return {
    where: (field: string, op: string, value: any) =>
      makeQuery(name, [
        ...filters,
        (id: string, d: Doc) => {
          const v = field === '__name__' ? id : d[field];
          return op === 'in' ? value.includes(v) : v === value;
        },
      ]),
    orderBy: () => makeQuery(name, filters),
    limit: () => makeQuery(name, filters),
    get: async () => {
      const docs = run();
      return { docs, empty: docs.length === 0 };
    },
    doc: (id: string) => makeDocRef(name, id),
    add: async (data: Doc) => {
      const id = `auto${Object.keys(db[name] || {}).length}`;
      db[name] = { ...(db[name] || {}), [id]: data };
      return makeDocRef(name, id);
    },
  };
}

function makeDocRef(name: string, id: string): any {
  return {
    id,
    get: async () => {
      const d = db[name]?.[id];
      return { id, exists: !!d, data: () => d };
    },
    update: async (data: Doc) => {
      db[name][id] = { ...db[name][id], ...data };
    },
    __path: [name, id],
  };
}

jest.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'session' }) }),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifySessionCookie: async () => ({ uid: 'boardUid' }) },
  adminDb: {
    collection: (name: string) => makeQuery(name),
    batch: () => {
      const ops: Array<() => void> = [];
      return {
        update: (ref: any, data: Doc) => ops.push(() => {
          const [c, id] = ref.__path;
          db[c][id] = { ...db[c][id], ...data };
        }),
        commit: async () => ops.forEach((op) => op()),
      };
    },
  },
  serializeDoc: (d: any) => d,
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ allowed: true, resetAt: Date.now() + 60_000 }),
  getRateLimitKey: jest.fn().mockReturnValue('test-key'),
  rateLimitResponse: () => new Response('{}', { status: 429 }),
}));

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  sendBulkEmail: (...args: any[]) => mockSendBulkEmail(...args),
}));

jest.mock('@/lib/notifications', () => ({ notifyBroadcast: jest.fn().mockResolvedValue(undefined) }));

import { POST } from '@/app/api/portal/broadcasts/route';

function post(body: Record<string, any>) {
  return POST(
    new Request('http://localhost/api/portal/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEmail.mockResolvedValue({ success: true, id: 'x' });
  mockSendBulkEmail.mockImplementation(async (r: string[]) => ({ sent: r.length, failed: 0, total: r.length }));
  db = {
    members: {
      boardUid: { role: 'president', status: 'active', email: 'board@club.org', firstName: 'Bo' },
      m1: { role: 'member', status: 'active', email: 'Member@club.org' },
    },
    notification_preferences: {},
    newsletter_subscribers: {
      s1: { email: 'fan@example.com', confirmed: true },
      s2: { email: 'member@club.org', confirmed: true, unsubscribeToken: 'tok-m' }, // also a member
      s3: { email: 'pending@example.com', confirmed: false },
    },
    events: {
      pub: {
        title: 'End Polio Now Happy Hour', slug: 'end-polio-now', date: '2026-11-05', time: '7:00 PM',
        location: '316 East 88th Street', type: 'free', isPublic: true, status: 'published',
      },
      priv: {
        title: 'Board Retreat', slug: 'retreat', date: '2026-11-06', time: '10:00 AM',
        location: 'Somewhere', type: 'free', isPublic: false, status: 'published',
      },
    },
    broadcasts: {},
  };
});

describe('POST /api/portal/broadcasts — subscribers', () => {
  it('emails only confirmed subscribers who are not members, each with an unsubscribe link', async () => {
    const res = await post({ subject: 'Hello', body: 'News', segment: 'subscribers' });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subscriberCount).toBe(1);
    expect(json.memberCount).toBe(0);

    expect(mockSendBulkEmail).not.toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const sent = mockSendEmail.mock.calls[0][0];
    expect(sent.to).toBe('fan@example.com');

    // A token was minted for the subscriber who didn't have one, and used.
    const token = db.newsletter_subscribers.s1.unsubscribeToken;
    expect(token).toBeTruthy();
    expect(sent.html).toContain(`/api/newsletter/unsubscribe?token=${token}`);
    expect(sent.headers['List-Unsubscribe']).toContain(token);
    expect(sent.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('"everyone" sends to members in bulk and to non-member subscribers individually', async () => {
    const res = await post({ subject: 'Hello', body: 'News', segment: 'everyone' });
    const json = await res.json();
    expect(json.memberCount).toBe(2);
    expect(json.subscriberCount).toBe(1);
    expect(json.recipientCount).toBe(3);
    expect(mockSendBulkEmail.mock.calls[0][0]).toEqual(['board@club.org', 'Member@club.org']);
    expect(mockSendEmail.mock.calls.map((c) => c[0].to)).toEqual(['fan@example.com']);
  });
});

describe('POST /api/portal/broadcasts — event announcements', () => {
  it('links members to the portal and shows them the venue', async () => {
    await post({ subject: 'Come!', body: 'Join us', segment: 'all', eventId: 'pub' });
    const html: string = mockSendBulkEmail.mock.calls[0][2];
    expect(html).toContain('/portal/events/pub');
    expect(html).toContain('316 East 88th Street');
  });

  it('links subscribers to the public page and hides a members-only venue', async () => {
    await post({ subject: 'Come!', body: 'Join us', segment: 'subscribers', eventId: 'pub' });
    const html: string = mockSendEmail.mock.calls[0][0].html;
    expect(html).toContain('/events/end-polio-now');
    expect(html).not.toContain('/portal/events/');
    expect(html).not.toContain('316 East 88th Street');
  });

  it('shows subscribers the venue when it is public', async () => {
    db.events.pub.venueVisibility = 'public';
    await post({ subject: 'Come!', body: 'Join us', segment: 'subscribers', eventId: 'pub' });
    expect(mockSendEmail.mock.calls[0][0].html).toContain('316 East 88th Street');
  });

  it('refuses to send a members-only event to subscribers', async () => {
    const res = await post({ subject: 'Retreat', body: 'x', segment: 'everyone', eventId: 'priv' });
    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockSendBulkEmail).not.toHaveBeenCalled();
  });

  it('refuses an unpublished event', async () => {
    db.events.pub.status = 'draft';
    const res = await post({ subject: 'x', body: 'x', segment: 'all', eventId: 'pub' });
    expect(res.status).toBe(400);
  });

  it('records the event on the broadcast', async () => {
    await post({ subject: 'Come!', body: 'Join us', segment: 'all', eventId: 'pub' });
    const record = Object.values(db.broadcasts)[0];
    expect(record.eventId).toBe('pub');
    expect(record.eventTitle).toBe('End Polio Now Happy Hour');
  });
});
