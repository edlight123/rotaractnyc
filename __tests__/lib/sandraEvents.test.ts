/**
 * Sandra's calendar grounding.
 *
 * Asked "what events are coming up?", Sandra used to describe a typical month
 * — general meetings, socials, a food pantry on the third Saturday — and send
 * the person to the portal to find the actual dates. The club had thirteen
 * public events on the calendar at the time. She could not see any of them,
 * because her only grounding was a static paragraph and a set of Drive
 * documents. She also named a partner organisation as the venue, which the
 * live calendar contradicted.
 *
 * These tests cover the two ways that fix can go wrong: not enough
 * information (no real dates), or too much (a members-only venue read out to
 * a stranger).
 */

const mockGet = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => ({ get: mockGet }),
        }),
      }),
    }),
  },
}));

import { upcomingEventsBlock } from '@/lib/sandra-events';

const FUTURE = new Date(Date.now() + 7 * 864e5).toISOString();
const PAST = new Date(Date.now() - 7 * 864e5).toISOString();

function doc(over: Record<string, unknown>) {
  return {
    id: over.id ?? 'e1',
    data: () => ({
      title: 'Event',
      slug: 'event',
      date: FUTURE,
      time: '3:30 PM',
      type: 'service',
      status: 'published',
      audience: 'public',
      host: 'rotaract',
      isPublic: true,
      description: 'A description.',
      ...over,
    }),
  };
}
const snapshot = (docs: unknown[]) => mockGet.mockResolvedValue({ docs });

beforeEach(() => mockGet.mockReset());

describe('upcomingEventsBlock', () => {
  it('gives Sandra real titles, dates and links instead of a typical month', async () => {
    snapshot([doc({ title: 'Neighborhood Supper', slug: 'supper', location: 'Holy Trinity Neighborhood Center' })]);
    const block = await upcomingEventsBlock('public');

    expect(block).toContain('Neighborhood Supper');
    expect(block).toContain('Holy Trinity Neighborhood Center');
    expect(block).toContain('https://rotaractnyc.org/events/supper');
    expect(block).toContain('3:30 PM');
    // And it tells the model not to answer generically when it has this.
    expect(block).toMatch(/do not|Do not/);
  });

  it('hides a members-only venue from a public visitor', async () => {
    // A social: venue defaults to members-only under the gating rules.
    snapshot([doc({ type: 'free', title: 'Rooftop Social', location: '316 East 88th Street' })]);
    const block = await upcomingEventsBlock('public');

    expect(block).toContain('Rooftop Social');
    expect(block).not.toContain('316 East 88th Street');
    expect(block).toContain('venue shared with members');
  });

  it('shows that same venue to a signed-in member', async () => {
    snapshot([doc({ type: 'free', title: 'Rooftop Social', location: '316 East 88th Street' })]);
    expect(await upcomingEventsBlock('member')).toContain('316 East 88th Street');
  });

  it('never shows a members-only event to the public', async () => {
    snapshot([
      doc({ id: 'a', title: 'Public Thing', audience: 'public' }),
      doc({ id: 'b', title: 'Members Thing', audience: 'members', isPublic: false }),
      doc({ id: 'c', title: 'Board Thing', audience: 'board', isPublic: false }),
    ]);

    const pub = await upcomingEventsBlock('public');
    expect(pub).toContain('Public Thing');
    expect(pub).not.toContain('Members Thing');
    expect(pub).not.toContain('Board Thing');

    const member = await upcomingEventsBlock('member');
    expect(member).toContain('Members Thing');
    expect(member).not.toContain('Board Thing');

    expect(await upcomingEventsBlock('board')).toContain('Board Thing');
  });

  it('treats a partner-hosted event with no audience as members-only', async () => {
    // Fails closed, matching resolveAudience and firestore.rules.
    snapshot([doc({ title: 'Partner Mixer', host: 'community', audience: undefined })]);
    expect(await upcomingEventsBlock('public')).not.toContain('Partner Mixer');
    expect(await upcomingEventsBlock('member')).toContain('Partner Mixer');
  });

  it('drops events that have already happened', async () => {
    snapshot([doc({ id: 'old', title: 'Last Month Thing', date: PAST })]);
    const block = await upcomingEventsBlock('public');
    expect(block).not.toContain('Last Month Thing');
    expect(block).toMatch(/nothing is currently on the calendar/i);
  });

  it('says the calendar is empty rather than letting Sandra improvise', async () => {
    snapshot([]);
    const block = await upcomingEventsBlock('public');
    expect(block).toMatch(/nothing is currently on the calendar/i);
    expect(block).toContain('https://rotaractnyc.org/events');
  });

  it('returns nothing at all when the read fails, so Sandra still answers', async () => {
    mockGet.mockRejectedValue(new Error('firestore down'));
    await expect(upcomingEventsBlock('public')).resolves.toBe('');
  });
});

/**
 * The club documents are a record of what the club has done, not a schedule.
 * The Neighborhood Supper's former venue lives in one of them; the calendar
 * has since moved to a different one. Sandra read the document as current
 * and named the old address, which is how someone ends up at the wrong
 * building. The prompt now has to say, in terms, which source wins.
 */
import { buildSystemPrompt } from '@/lib/sandra-knowledge';

describe('the calendar outranks the documents', () => {
  const prompts = [
    ['public', buildSystemPrompt({ tier: 'public' })],
    ['member', buildSystemPrompt({ tier: 'member' })],
    ['board', buildSystemPrompt({ tier: 'board' })],
  ] as const;

  it.each(prompts)('tells a %s viewer that dates and venues come only from the calendar', (_tier, prompt) => {
    expect(prompt).toMatch(/never state a date, time or venue that does not appear in the UPCOMING EVENTS block/i);
  });

  it.each(prompts)('stops a %s viewer being told the typical year is a schedule', (_tier, prompt) => {
    expect(prompt).toMatch(/not a schedule/i);
  });

  it.each(prompts)('tells a %s viewer to admit an event is not on the calendar', (_tier, prompt) => {
    expect(prompt).toMatch(/not on the calendar/i);
  });

  it('no longer asserts a specific recurring date in the static knowledge', () => {
    // "a food pantry on the 3rd Saturday" was a standing claim that the
    // calendar, not this file, should be making.
    expect(buildSystemPrompt({ tier: 'public' })).not.toMatch(/3rd Saturday|third Saturday/i);
  });

  it('marks the calendar block as beating any document', async () => {
    snapshot([doc({ title: 'Neighborhood Supper', location: 'Holy Trinity Neighborhood Center' })]);
    const block = await upcomingEventsBlock('public');
    expect(block).toMatch(/authoritative|more current than any document/i);
    expect(block).toMatch(/never state a venue that is not written here/i);
  });
});
