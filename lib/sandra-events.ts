/**
 * Live calendar grounding for Sandra.
 *
 * Sandra used to answer "what events are coming up?" from a static paragraph
 * in her knowledge base, because that was the only thing she had. The club
 * had thirteen public events on the calendar at the time and she could not
 * see a single one, so she described the shape of a typical month and sent
 * the person elsewhere to find out what was actually happening. The answer
 * was not wrong, exactly; it just wasn't an answer.
 *
 * This reads the real calendar instead. Two things it must get right:
 *
 *  1. Audience. A public visitor is shown only `audience: 'public'` events —
 *     the same rule the public site and firestore.rules apply.
 *  2. Redaction. Public-tier events go through redactEventForPublic, so a
 *     members-only venue stays members-only. Without that, Sandra would
 *     happily read out the address that the event page deliberately hides.
 */
import { adminDb } from '@/lib/firebase/admin';
import { redactEventForPublic } from '@/lib/utils/eventGating';
import { formatDate } from '@/lib/utils/format';
import type { RotaractEvent, EventAudience } from '@/types';

const MAX_EVENTS = 12;

const AUDIENCES_FOR: Record<'public' | 'member' | 'board', EventAudience[]> = {
  public: ['public'],
  member: ['public', 'members'],
  board: ['public', 'members', 'board'],
};

function line(event: RotaractEvent, tier: 'public' | 'member' | 'board'): string {
  // The stored `time` string is the club's own display value; deriving a
  // time from `date` instead would repeat the Add-to-Calendar bug, where a
  // 16:00Z document was announced as noon.
  const when = (() => {
    try {
      const day = formatDate(event.date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
      return event.time ? `${day}, ${event.time}` : day;
    } catch {
      return String(event.date).slice(0, 10);
    }
  })();

  const bits = [`${when} — ${event.title}`];
  if (event.location) bits.push(`at ${event.location}`);
  else if ((event as { venueHidden?: boolean }).venueHidden) {
    bits.push('(venue shared with members)');
  }
  if (event.slug) bits.push(`https://rotaractnyc.org/events/${event.slug}`);
  if (tier !== 'public' && event.audience === 'members') bits.push('[members only]');
  if (tier === 'board' && event.audience === 'board') bits.push('[board only]');
  return `- ${bits.join(' · ')}`;
}

/**
 * The upcoming calendar as a prompt block, or '' when there is nothing to say.
 * Never throws: Sandra answering without the calendar is a worse answer, but
 * Sandra returning a 500 is no answer at all.
 */
export async function upcomingEventsBlock(
  tier: 'public' | 'member' | 'board',
): Promise<string> {
  try {
    const snap = await adminDb
      .collection('events')
      .where('status', '==', 'published')
      .orderBy('date', 'asc')
      .limit(200)
      .get();

    const allowed = AUDIENCES_FOR[tier];
    const now = Date.now();

    const events = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as RotaractEvent)
      .filter((e) => {
        const audience = e.audience ?? ((e.host ?? 'rotaract') === 'rotaract' ? 'public' : 'members');
        return allowed.includes(audience) && new Date(e.date).getTime() >= now;
      })
      .slice(0, MAX_EVENTS)
      .map((e) => (tier === 'public' ? redactEventForPublic(e) : e));

    if (events.length === 0) {
      return (
        '\n\nUPCOMING EVENTS (live club calendar): nothing is currently on the ' +
        'calendar. Say so plainly and point to https://rotaractnyc.org/events ' +
        'rather than describing what a typical month looks like.\n'
      );
    }

    return (
      '\n\nUPCOMING EVENTS — the live club calendar, read just now. This is ' +
      'authoritative and more current than any document. When asked what is ' +
      'coming up, answer from THIS list with real dates and titles; do not ' +
      'describe recurring events in general terms instead. Mention two or ' +
      'three of the soonest, then link https://rotaractnyc.org/events for the ' +
      'rest. Never state a venue that is not written here.\n' +
      events.map((e) => line(e, tier)).join('\n') +
      '\n'
    );
  } catch (err) {
    console.error('[sandra] calendar grounding failed:', err);
    return '';
  }
}
