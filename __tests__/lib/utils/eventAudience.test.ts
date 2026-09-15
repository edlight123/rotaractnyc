import {
  resolveHost,
  resolveAudience,
  resolveCountsForServiceHours,
  canSeeEvent,
  isExternallyRegistered,
  visibleAudiences,
  HOST_LABELS,
} from '@/lib/utils/eventAudience';

describe('resolveHost', () => {
  it('defaults to rotaract when absent', () => {
    expect(resolveHost({})).toBe('rotaract');
  });
  it('returns the explicit host', () => {
    expect(resolveHost({ host: 'community' })).toBe('community');
  });
});

describe('resolveAudience', () => {
  // The fail-closed guarantee. A partner event written by any path that
  // forgot to set `audience` must NOT read as public.
  it('is public for an event with no host (the 34 existing documents)', () => {
    expect(resolveAudience({})).toBe('public');
  });
  it('is public for an explicit rotaract event', () => {
    expect(resolveAudience({ host: 'rotaract' })).toBe('public');
  });
  it('is members for a rotary event with no explicit audience', () => {
    expect(resolveAudience({ host: 'rotary' })).toBe('members');
  });
  it('is members for a community event with no explicit audience', () => {
    expect(resolveAudience({ host: 'community' })).toBe('members');
  });
  it('honours an explicit audience over the host default', () => {
    expect(resolveAudience({ host: 'community', audience: 'public' })).toBe('public');
    expect(resolveAudience({ host: 'rotaract', audience: 'board' })).toBe('board');
  });
});

describe('resolveCountsForServiceHours', () => {
  it('defaults true for our own events', () => {
    expect(resolveCountsForServiceHours({})).toBe(true);
    expect(resolveCountsForServiceHours({ host: 'rotaract' })).toBe(true);
  });
  it('defaults false for partner events', () => {
    expect(resolveCountsForServiceHours({ host: 'community' })).toBe(false);
    expect(resolveCountsForServiceHours({ host: 'rotary' })).toBe(false);
  });
  it('honours an explicit false on our own event', () => {
    expect(resolveCountsForServiceHours({ host: 'rotaract', countsForServiceHours: false })).toBe(false);
  });
  it('honours an explicit true on a sponsored partner event', () => {
    expect(resolveCountsForServiceHours({ host: 'community', countsForServiceHours: true })).toBe(true);
  });
});

describe('canSeeEvent', () => {
  const anon = { signedIn: false };
  const member = { signedIn: true, role: 'member' as const };
  const board = { signedIn: true, role: 'board' as const };
  const president = { signedIn: true, role: 'president' as const };
  const treasurer = { signedIn: true, role: 'treasurer' as const };

  it('lets anyone see a public event', () => {
    expect(canSeeEvent({ audience: 'public' }, anon)).toBe(true);
  });
  it('hides members-only events from anonymous visitors', () => {
    expect(canSeeEvent({ audience: 'members' }, anon)).toBe(false);
  });
  it('hides board-only events from anonymous visitors', () => {
    expect(canSeeEvent({ audience: 'board' }, anon)).toBe(false);
  });
  it('lets a member see members-only events', () => {
    expect(canSeeEvent({ audience: 'members' }, member)).toBe(true);
  });
  it('hides board-only events from an ordinary member', () => {
    expect(canSeeEvent({ audience: 'board' }, member)).toBe(false);
  });
  it.each([
    ['board', board],
    ['president', president],
    ['treasurer', treasurer],
  ])('lets %s see board-only events', (_label, viewer) => {
    expect(canSeeEvent({ audience: 'board' }, viewer as { signedIn: boolean; role: 'board' })).toBe(true);
  });
  it('applies the fail-closed default: a community event hides from anon', () => {
    expect(canSeeEvent({ host: 'community' }, anon)).toBe(false);
  });
});

describe('isExternallyRegistered', () => {
  it('is false when externalUrl is absent or blank', () => {
    expect(isExternallyRegistered({})).toBe(false);
    expect(isExternallyRegistered({ externalUrl: '   ' })).toBe(false);
  });
  it('is true when externalUrl is set', () => {
    expect(isExternallyRegistered({ externalUrl: 'https://thp.org/events/fall-event/' })).toBe(true);
  });
});

describe('visibleAudiences — must mirror firestore.rules exactly', () => {
  it('anonymous sees public only', () => {
    expect(visibleAudiences({ signedIn: false })).toEqual(['public']);
  });
  it('a member sees public and members', () => {
    expect(visibleAudiences({ signedIn: true, role: 'member' })).toEqual(['public', 'members']);
  });
  it.each(['board', 'president', 'treasurer'] as const)('%s sees all three', (role) => {
    expect(visibleAudiences({ signedIn: true, role })).toEqual(['public', 'members', 'board']);
  });
  it('a signed-in user with no role is treated as a member, not board', () => {
    expect(visibleAudiences({ signedIn: true })).toEqual(['public', 'members']);
  });
});

describe('HOST_LABELS', () => {
  it('uses the agreed bucket labels', () => {
    expect(HOST_LABELS).toEqual({
      rotaract: 'Rotaract NYC',
      rotary: 'Rotary & District',
      community: 'Community & Partner',
    });
  });
});
