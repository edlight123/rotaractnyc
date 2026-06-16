// ── Rotaract Charter Board Titles ──────────────────────────────────────────
// Standard officer positions per the Rotary International Rotaract Club
// Constitution + NYC club bylaws (Director titles).
export const ROTARACT_BOARD_TITLES = [
  'President',
  'Vice President',
  'President-Elect',
  'Immediate Past President',
  'Secretary',
  'Treasurer',
  'Sergeant-at-Arms',
  'Director of Community Service',
  'Director of International Service',
  'Director of Professional Development',
  'Director of Fellowship',
  'Director of Membership',
  'Director of Fundraising',
  'Director of Public Relations',
  'Director of Youth Service',
  'Director of Social Media',
  'Director of Events',
] as const;

export type RotaractBoardTitle = (typeof ROTARACT_BOARD_TITLES)[number];

// Site-wide constants
export const SITE = {
  name: 'Rotaract Club at the United Nations NYC',
  shortName: 'Rotaract NYC',
  domain: 'rotaractnyc.org',
  url: 'https://rotaractnyc.org',
  email: 'rotaractnewyorkcity@gmail.com',
  address: '216 East 45th Street, New York, NY 10017',
  meetingSchedule: 'Every 2nd & 4th Thursday, 7:00–8:00 PM',
  ageRange: '18–35',
  sponsor: 'The Rotary Club of New York',
  motto: 'Service Above Self',
  description:
    'Rotaract Club at the United Nations NYC is a community of young professionals and emerging leaders dedicated to service, leadership development, and global fellowship in New York City.',
  dues: {
    professional: 8500, // cents
    student: 6500,
  },
  social: {
    instagram: 'https://instagram.com/rotaractnyc',
    linkedin: 'https://linkedin.com/company/rotaract-at-the-un-nyc',
    facebook: 'https://facebook.com/RotaractNewYorkCity',
  },
} as const;

// Impact statistics — fallback defaults when Firestore has no custom values.
// Admins can override these from Portal → Admin → Site Settings.
export const IMPACT_STATS = [
  { value: '5,000+', label: 'Service Hours' },
  { value: '100+', label: 'Community Members' },
  { value: '$50K+', label: 'Raised for Charity (All-Time)' },
  { value: '15+', label: 'Global Partners' },
];

// ── Reusable numeric constants ──────────────────────────────────────────────

/** Default service hours goal for the Rotary year. */
export const SERVICE_HOURS_GOAL = 40;

/** Session cookie max age in seconds (14 days). */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

/**
 * Name of the Firebase session cookie shared by the member portal (`/portal`)
 * and the public supporter hub (`/account`). Centralized here so a future
 * rename is a single-line change. Kept as `rotaract_portal_session` to avoid
 * forcing existing members to re-authenticate.
 */
export const SESSION_COOKIE_NAME = 'rotaract_portal_session';

/** Default page size for collection queries. */
export const DEFAULT_PAGE_SIZE = 30;

/** Larger page size for admin views. */
export const ADMIN_PAGE_SIZE = 50;

/** Firestore max query result size for aggregation. */
export const AGGREGATION_MAX_SIZE = 500;

// ── Stripe / Donation constants ─────────────────────────────────────────────

/** Rotaract NYC EIN — required for IRS-compliant tax receipts. */
export const ORG_EIN = 'XX-XXXXXXX'; // TODO: replace with actual EIN

/** Minimum donation amount in cents ($5). */
export const MIN_DONATION_CENTS = 500;

/** Maximum donation amount in cents ($10,000). */
export const MAX_DONATION_CENTS = 1_000_000;
