/**
 * Tests for GET /api/cron/dues-reminders
 */

const mockSendEmail = jest.fn();

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/email/templates', () => ({
  duesReminderEmail: jest.fn(() => ({
    subject: 'Dues Reminder',
    html: '<p>reminder</p>',
    text: 'reminder',
  })),
}));

jest.mock('@/lib/firebase/admin', () => {
  // Shared state so we can configure per-test
  const mockData: { users: any[]; dues: any[] } = { users: [], dues: [] };

  /** Minimal Firestore query builder that operates on mockData. */
  function makeQuery(collectionName: string) {
    let filters: Array<{ field: string; op: string; value: any }> = [];
    let limitCount: number | null = null;

    const query: any = {
      where(field: string, op: string, value: any) {
        filters.push({ field, op, value });
        return query;
      },
      limit(n: number) {
        limitCount = n;
        return query;
      },
      get: jest.fn(async () => {
        let items = (mockData as any)[collectionName] ?? [];
        for (const f of filters) {
          items = items.filter((item: any) => {
            const val = item._data?.[f.field] ?? item[f.field];
            if (f.op === '==') return val === f.value;
            if (f.op === 'in') return (f.value as any[]).includes(val);
            return true;
          });
        }
        if (limitCount !== null) items = items.slice(0, limitCount);
        return {
          docs: items.map((item: any) => ({
            id: item._id ?? item.id,
            data: () => item._data ?? item,
            ref: { update: jest.fn() },
          })),
          size: items.length,
        };
      }),
    };
    return query;
  }

  const adminDb: any = {
    collection: jest.fn((name: string) => ({
      ...makeQuery(name),
      doc: jest.fn(() => ({
        get: jest.fn(async () => ({ exists: false, data: () => undefined })),
        set: jest.fn(),
      })),
      add: jest.fn(),
    })),
    __mockData: mockData,
  };

  return { adminDb, adminAuth: {} };
});

jest.mock('@/lib/utils/rotaryYear', () => ({
  getCurrentRotaryYear: () => '2025-2026',
}));

import { GET } from '@/app/api/cron/dues-reminders/route';
import { adminDb } from '@/lib/firebase/admin';

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/dues-reminders', { headers });
}

describe('GET /api/cron/dues-reminders', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'cron-test-secret' };
    // Reset mock data
    const data = (adminDb as any).__mockData;
    data.users = [];
    data.dues = [];
    mockSendEmail.mockResolvedValue({ success: true, id: 'msg-1' });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns 401 without an Authorization header', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it('returns 401 with the wrong secret', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }));
    expect(res.status).toBe(401);
  });

  it('returns { sent: 0 } when there are no active members', async () => {
    const res = await GET(
      makeRequest({ authorization: 'Bearer cron-test-secret' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it('sends a reminder email for a member with unpaid dues', async () => {
    const data = (adminDb as any).__mockData;
    data.users = [
      {
        _id: 'user-1',
        _data: {
          status: 'active',
          email: 'alice@example.com',
          displayName: 'Alice Test',
          memberType: 'professional',
        },
      },
    ];
    data.dues = [
      {
        _id: 'dues-1',
        _data: {
          userId: 'user-1',
          cycleName: '2025-2026',
          status: 'UNPAID',
          amount: 8500,
        },
      },
    ];

    const res = await GET(
      makeRequest({ authorization: 'Bearer cron-test-secret' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@example.com',
        subject: 'Dues Reminder',
      }),
    );
  });

  it('skips members whose dues are already paid', async () => {
    const data = (adminDb as any).__mockData;
    data.users = [
      {
        _id: 'user-2',
        _data: {
          status: 'active',
          email: 'bob@example.com',
          displayName: 'Bob Paid',
          memberType: 'student',
        },
      },
    ];
    data.dues = [
      {
        _id: 'dues-2',
        _data: {
          userId: 'user-2',
          cycleName: '2025-2026',
          status: 'PAID',
          amount: 6500,
        },
      },
    ];

    const res = await GET(
      makeRequest({ authorization: 'Bearer cron-test-secret' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
