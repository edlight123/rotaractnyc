/**
 * Tests for collapseRecurringSeries — the public-display collapse of recurring
 * event series into a single card (the next upcoming occurrence).
 */
import { collapseRecurringSeries } from '@/lib/firebase/queries';
import type { RotaractEvent } from '@/types';

function ev(partial: Partial<RotaractEvent> & { id: string; date: string }): RotaractEvent {
  return {
    title: partial.title || partial.id,
    slug: partial.slug || partial.id,
    description: '',
    time: '',
    location: '',
    type: 'service',
    isPublic: true,
    status: 'published',
    createdAt: '2020-01-01T00:00:00.000Z',
    ...partial,
  } as RotaractEvent;
}

const FUTURE_1 = '2099-07-18T16:00:00.000Z';
const FUTURE_2 = '2099-08-15T16:00:00.000Z';
const FUTURE_3 = '2099-09-19T16:00:00.000Z';
const PAST_1 = '2000-01-01T16:00:00.000Z';
const PAST_2 = '2000-02-01T16:00:00.000Z';

describe('collapseRecurringSeries', () => {
  it('passes non-recurring events through unchanged', () => {
    const events = [ev({ id: 'a', date: FUTURE_2 }), ev({ id: 'b', date: FUTURE_1 })];
    const out = collapseRecurringSeries(events);
    expect(out.map((e) => e.id)).toEqual(['b', 'a']); // sorted by date asc
  });

  it('collapses a recurring series to its next upcoming occurrence', () => {
    const events = [
      ev({ id: 'parent', date: FUTURE_1, isRecurring: true }),
      ev({ id: 'child2', date: FUTURE_2, recurrenceParentId: 'parent' }),
      ev({ id: 'child3', date: FUTURE_3, recurrenceParentId: 'parent' }),
    ];
    const out = collapseRecurringSeries(events);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('parent'); // earliest upcoming
  });

  it('keeps the most recent occurrence when the whole series is past', () => {
    const events = [
      ev({ id: 'p', date: PAST_1, isRecurring: true }),
      ev({ id: 'c', date: PAST_2, recurrenceParentId: 'p' }),
    ];
    const out = collapseRecurringSeries(events);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('c'); // latest past
  });

  it('mixes a collapsed series with standalone events, sorted by date', () => {
    const events = [
      ev({ id: 'solo-late', date: FUTURE_3 }),
      ev({ id: 'parent', date: FUTURE_1, isRecurring: true }),
      ev({ id: 'child', date: FUTURE_2, recurrenceParentId: 'parent' }),
      ev({ id: 'solo-early', date: PAST_1 }),
    ];
    const out = collapseRecurringSeries(events);
    // one card for the series (parent), plus the two solos
    expect(out.map((e) => e.id)).toEqual(['solo-early', 'parent', 'solo-late']);
  });
});
