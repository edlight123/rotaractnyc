/**
 * One definition of "complete", used by every surface that asks.
 *
 * Measured before this existed: 38 active members, 35 of whom had completed
 * onboarding, and 0 with a bio. Step 2 of the wizard had no validation, so
 * everyone clicked through. These tests pin down what we now require and,
 * just as importantly, what we do NOT — the full street address is not part
 * of it.
 */
import {
  missingProfileFields,
  isProfileComplete,
  needsOnboarding,
  PROFILE_FIELD_LABELS,
  RSVP_GATE_FIELDS,
  rsvpGateSatisfied,
} from '@/lib/utils/profileCompleteness';

/** Everything the member has to write. */
const written = {
  bio: 'Grew up in Queens, work in public health, moved to Astoria in 2024.',
  whyJoin: 'I want to do regular service work with people my own age.',
  occupation: 'Public health analyst',
};

/** A profile with nothing outstanding. */
const complete = { ...written, photoURL: 'https://storage.example/avatars/abc.jpg' };

describe('missingProfileFields', () => {
  it('finds nothing missing on a filled-in profile', () => {
    expect(missingProfileFields(complete)).toEqual([]);
  });

  it('names each field that is absent', () => {
    expect(missingProfileFields({ ...complete, bio: undefined })).toEqual(['bio']);
    expect(missingProfileFields({ ...complete, whyJoin: undefined })).toEqual(['whyJoin']);
    expect(missingProfileFields({ ...complete, occupation: undefined })).toEqual(['occupation']);
  });

  it('treats whitespace as absent', () => {
    expect(missingProfileFields({ ...complete, bio: '   \n  ' })).toEqual(['bio']);
  });

  it('lists everything for a member who has filled in nothing', () => {
    expect(missingProfileFields({})).toEqual(['bio', 'whyJoin', 'occupation', 'photoURL']);
  });

  it('survives a missing member record rather than throwing', () => {
    expect(missingProfileFields(null)).toEqual(['bio', 'whyJoin', 'occupation', 'photoURL']);
    expect(missingProfileFields(undefined)).toEqual(['bio', 'whyJoin', 'occupation', 'photoURL']);
  });

  it('flags whyJoin on every member who predates the field', () => {
    // The existing 38 have bio and occupation empty too, but whyJoin has
    // never existed, so no record anywhere can already satisfy it.
    expect(missingProfileFields({ bio: 'x', occupation: 'y' })).toEqual(['whyJoin', 'photoURL']);
  });

  it('does not require a home address', () => {
    // `address` holds a full street address and is displayed nowhere.
    // Requiring it to satisfy an introduction would be disproportionate.
    const memberWithNoAddress = { ...complete, address: undefined };
    expect(missingProfileFields(memberWithNoAddress)).toEqual([]);
  });
});

describe('isProfileComplete', () => {
  it('is true only when nothing is missing', () => {
    expect(isProfileComplete(complete)).toBe(true);
    expect(isProfileComplete({ ...complete, bio: '' })).toBe(false);
    expect(isProfileComplete(null)).toBe(false);
  });
});

describe('needsOnboarding', () => {
  it('sends a member who has never onboarded', () => {
    expect(needsOnboarding({ onboardingComplete: false })).toBe(true);
  });

  it('sends a member whose flag was never set at all', () => {
    // The old check was `=== false`, and unset is not false — so migrated
    // members slipped past onboarding entirely and were never asked.
    expect(needsOnboarding({})).toBe(true);
    expect(needsOnboarding(null)).toBe(true);
  });

  it('leaves alone a member who has finished', () => {
    expect(needsOnboarding({ onboardingComplete: true })).toBe(false);
  });
});

describe('PROFILE_FIELD_LABELS', () => {
  it('can name every required field for the chase-list', () => {
    for (const field of missingProfileFields({})) {
      expect(PROFILE_FIELD_LABELS[field]).toBeTruthy();
    }
  });
});

/**
 * A photo is required of new members too — the club wants to recognise
 * people at their first meeting. It is part of a complete profile, but it is
 * deliberately NOT part of what blocks an RSVP: the RSVP modal collects text
 * inline in about thirty seconds, and demanding a file upload at that moment
 * turns a speed bump into a reason not to come.
 */
describe('photo', () => {
  it('counts as missing from an otherwise complete profile', () => {
    expect(missingProfileFields(written)).toEqual(['photoURL']);
    expect(isProfileComplete(written)).toBe(false);
  });

  it('completes the profile once present', () => {
    expect(missingProfileFields(complete)).toEqual([]);
    expect(isProfileComplete(complete)).toBe(true);
  });

  it('is asked for last, after the writing', () => {
    expect(missingProfileFields({})).toEqual(['bio', 'whyJoin', 'occupation', 'photoURL']);
  });

  it('is not one of the fields an RSVP waits on', () => {
    expect(RSVP_GATE_FIELDS).not.toContain('photoURL');
    // Text done, no photo yet — the RSVP goes through.
    expect(rsvpGateSatisfied(written)).toBe(true);
    expect(rsvpGateSatisfied({ ...written, bio: '' })).toBe(false);
  });

  it('still names the photo for the board chase-list', () => {
    expect(PROFILE_FIELD_LABELS.photoURL).toBeTruthy();
  });
});
