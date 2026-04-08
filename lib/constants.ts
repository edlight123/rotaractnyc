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
  name: 'Rotaract Club of New York at the United Nations',
  shortName: 'Rotaract NYC',
  domain: 'rotaractnyc.org',
  url: 'https://rotaractnyc.org',
  email: 'rotaractnewyorkcity@gmail.com',
  address: '216 East 45th Street, New York, NY 10017',
  meetingSchedule: 'Every 2nd & 4th Thursday, 7:00–8:00 PM',
  ageRange: '18–30',
  sponsor: 'The Rotary Club of New York',
  motto: 'Service Above Self',
  description:
    'Rotaract NYC is a community of young professionals and students aged 18–30 dedicated to service, leadership development, and global fellowship in New York City.',
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
  { value: '120+', label: 'Active Members' },
  { value: '$50K+', label: 'Raised for Charity' },
  { value: '15+', label: 'Global Partners' },
];
