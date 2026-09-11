/**
 * Tests for GET /api/cron/event-reminders
 *
 * This cron silently sent nothing: it read `rsvp.userId`, but an RSVP stores
 * its member as `memberId`. Every lookup resolved to undefined, threw into the
 * per-RSVP catch, and surfaced only as an incremented error count — so the job
 * reported 200 while no member ever received a reminder.
 */

const mockSendEmail = jest.fn();
const mockEventReminderEmail = jest.fn(() => ({
  subject: 'Event Reminder',
  html: '<p>reminder</p>',
  text: 'reminder',
}));

jest.mock('@/lib/email/send', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

jest.mock('@/lib/email/templates', () => ({
  eventReminderEmail: (...args: any[]) => (mockEventReminderEmail as jest.Mock)(...args),
}));

const state: {
  events: any[];
  rsvps: any[];
  members: Record<string, any>;
  dedupSent: Set<string>;
} = { events: [], rsvps: [], members: {}, dedupSent: new Set() };

const mockDedupSet = jest.fn();
const mockActivityAdd = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'events') {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => ({
                  size: state.events.length,
                  docs: state.events.map((e) => ({ id: e.id, data: () => e })),
                }),
              }),
            }),
          }),
        };
      }
      if (name === 'rsvps') {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({
                docs: state.rsvps.map((r) => ({ id: r.id, data: () => r })),
              }),
            }),
          }),
        };
      }
      if (name === 'event_reminders_sent') {
        return {
          doc: (id: string) => {
            // Firestore rejects an undefined document path — this is what the
            // old `${eventId}_${rsvp.userId}` produced in practice.
            if (id === undefined || id.includes('undefined')) {
              throw new Error(`invalid document path: ${id}`);
            }
            return {
              get: async () => ({ exists: state.dedupSent.has(id) }),
              set: (...args: any[]) => mockDedupSet(id, ...args),
            };
          },
        };
      }
      if (name === 'members') {
        return {
          doc: (id: string) => {
            if (id === undefined) throw new Error('invalid document path: undefined');
            return {
              get: async () => {
                const m = state.members[id];
                return { exists: !!m, data: () => m };
              },
            };
          },
        };
      }
      if (name === 'activity_logs') {
        return { add: (...args: any[]) => mockActivityAdd(...args) };
      }
      return { doc: () => ({}), where: () => ({}) };
    },
  },
}));

import { GET } from '@/app/api/cron/event-reminders/route';

const EVENT_ID = 'evt-1';
const MEMBER_ID = 'member-abc';

function makeRequest(secret = 'test-cron-secret') {
  return new Request('http://localhost/api/cron/event-reminders', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function inDays(n: number) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

describe('GET /api/cron/event-reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';

    state.events = [
      {
        id: EVENT_ID,
        title: 'Community Cleanup',
        date: inDays(2),
        time: '10:00 AM',
        location: 'Central Park',
        status: 'published',
      },
    ];
    // An RSVP as actually written by /api/portal/events/rsvp — memberId.
    state.rsvps = [{ id: `${MEMBER_ID}_${EVENT_ID}`, eventId: EVENT_ID, memberId: MEMBER_ID, status: 'going' }];
    state.members = {
      [MEMBER_ID]: { email: 'member@example.com', displayName: 'Jane Doe', status: 'active' },
    };
    state.dedupSent = new Set();
    mockSendEmail.mockResolvedValue({ success: true, id: 'sent-1' });
  });

  it('sends a reminder to a member who RSVPd', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.reminders.sent).toBe(1);
    expect(json.reminders.errors).toBe(0);

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'member@example.com' }),
    );
  });

  it('resolves the member via memberId, not userId', async () => {
    // Regression guard: with the old `rsvp.userId` read this RSVP resolves to
    // undefined, the members lookup throws, and nothing is sent.
    await GET(makeRequest());
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it('puts the event start time in the reminder', async () => {
    // Regression guard: the cron read `event.startTime`, which does not exist
    // on RotaractEvent, so the reminder said "undefined".
    await GET(makeRequest());
    expect(mockEventReminderEmail).toHaveBeenCalledWith(
      'Jane Doe',
      expect.objectContaining({ time: '10:00 AM' }),
    );
  });

  it('dedupes on event + member so a reminder is sent once', async () => {
    state.dedupSent = new Set([`${EVENT_ID}_${MEMBER_ID}`]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.reminders.sent).toBe(0);
    expect(json.reminders.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('records the dedup entry keyed by member', async () => {
    await GET(makeRequest());
    expect(mockDedupSet).toHaveBeenCalledWith(
      `${EVENT_ID}_${MEMBER_ID}`,
      expect.objectContaining({ eventId: EVENT_ID, memberId: MEMBER_ID }),
    );
  });

  it('skips an RSVP with no memberId instead of throwing', async () => {
    state.rsvps = [{ id: 'broken', eventId: EVENT_ID, status: 'going' }];

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.reminders.skipped).toBe(1);
    expect(json.reminders.errors).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('skips members who are no longer active', async () => {
    state.members[MEMBER_ID].status = 'alumni';

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.reminders.sent).toBe(0);
    expect(json.reminders.skipped).toBe(1);
  });

  it('counts a failed send as an error and writes no dedup record', async () => {
    mockSendEmail.mockResolvedValue({ success: false, error: 'Resend down' });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.reminders.errors).toBe(1);
    expect(json.reminders.sent).toBe(0);
    expect(mockDedupSet).not.toHaveBeenCalled();
  });

  it('returns 401 without the cron secret', async () => {
    const res = await GET(makeRequest('wrong-secret'));
    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
