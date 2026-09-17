/**
 * What the club needs from every member, in one place.
 *
 * Four surfaces ask for this — the onboarding wizard, the dashboard prompt,
 * the RSVP modal and the board's chase-list. They must agree. Four separate
 * definitions would mean the dashboard nagging someone the RSVP modal
 * already considers finished, which trains people to ignore both.
 *
 * What is required is deliberately small. `address` is NOT here: it holds a
 * full street address, nothing in the product displays it, and demanding a
 * member's home address to satisfy an introduction is disproportionate.
 * "Astoria, Queens" written inside the bio does the same job.
 *
 * See docs/superpowers/specs/2026-09-17-member-profile-completeness-design.md
 */

/** Order matters: it is the order the fields are asked for and listed. */
export const REQUIRED_PROFILE_FIELDS = ['bio', 'whyJoin', 'occupation', 'photoURL'] as const;

export type ProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<ProfileField, string> = {
  bio: 'About you',
  whyJoin: 'Why you want to join',
  occupation: 'Occupation',
  photoURL: 'Profile photo',
};

/** The prompt each field is asked with, so all four surfaces ask alike. */
export const PROFILE_FIELD_PROMPTS: Record<ProfileField, string> = {
  bio: 'Who you are, your background, and where in the city you live.',
  whyJoin: 'What brought you to Rotaract, and what you hope to get out of it.',
  occupation: 'What you do — your role, or what you are studying.',
  photoURL: 'A photo, so people can recognise you at your first meeting.',
};

/**
 * The subset an RSVP waits on — everything except the photo.
 *
 * The RSVP modal collects text inline in about thirty seconds, which is what
 * justifies it blocking at all. A file upload at that same moment is a
 * different proposition: it turns a speed bump into a reason not to come,
 * and the club would rather have the attendance. The photo is still required
 * of a complete profile, chased by the dashboard prompt and the board's
 * list — just not at the door.
 */
export const RSVP_GATE_FIELDS: readonly ProfileField[] = ['bio', 'whyJoin', 'occupation'];

export function rsvpGateSatisfied(member: ProfileShape): boolean {
  return RSVP_GATE_FIELDS.every((field) => filledIn(member?.[field]));
}

// Callers pass whole member records, partial form state, and (during auth
// loading) nothing at all — so every field is optional and null is allowed.
type ProfileShape = Partial<Record<ProfileField, unknown>> | null | undefined;

function filledIn(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Which required fields this member has not filled in, in asking order.
 * A missing record counts as missing everything rather than throwing —
 * callers render this during auth loading, when `member` is legitimately
 * undefined for a tick.
 */
export function missingProfileFields(member: ProfileShape): ProfileField[] {
  return REQUIRED_PROFILE_FIELDS.filter((field) => !filledIn(member?.[field]));
}

export function isProfileComplete(member: ProfileShape): boolean {
  return missingProfileFields(member).length === 0;
}

/**
 * Whether this member still owes us the onboarding wizard.
 *
 * Tests `!== true` rather than `=== false` on purpose. The original check
 * was `onboardingComplete === false`, and unset is not false, so members
 * migrated in from the old email-based process were never sent through
 * onboarding at all — they simply never matched.
 */
export function needsOnboarding(
  member: { onboardingComplete?: boolean } | null | undefined,
): boolean {
  return member?.onboardingComplete !== true;
}
