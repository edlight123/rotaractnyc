/**
 * Unit tests for lib/email/templates.ts
 *
 * Verifies:
 *  - HTML contains essential structural markers (DOCTYPE, preheader, header, footer)
 *  - User-supplied values are HTML-escaped
 *  - Plain-text fallback includes all key fields
 *  - Subject lines are correct
 *  - Member vs guest templates differ on the upsell/share CTA
 */

jest.mock('@/lib/constants', () => ({
  SITE: {
    name: 'Rotaract Club at the United Nations NYC',
    shortName: 'Rotaract NYC',
    domain: 'rotaractnyc.org',
    url: 'https://rotaractnyc.org',
    email: 'info@rotaractnyc.org',
    address: '216 East 45th Street, New York, NY 10017',
    meetingSchedule: 'Every 2nd & 4th Thursday, 7:00–8:00 PM',
    motto: 'Service Above Self',
    description: 'Test description',
    dues: { professional: 8500, student: 6500 },
    social: {
      instagram: 'https://instagram.com/rotaractnyc',
      linkedin: 'https://www.linkedin.com/company/rotaractnyc',
      facebook: 'https://facebook.com/RotaractNewYorkCity',
    },
  },
}));

import {
  wrapTemplate,
  contactFormEmail,
  membershipInterestEmail,
  welcomeEmail,
  inviteEmail,
  duesReminderEmail,
  eventReminderEmail,
  profileReminderEmail,
  duesNudgeEmail,
  oneWeekCheckInEmail,
  guestRsvpConfirmationEmail,
  guestTicketConfirmationEmail,
  memberTicketConfirmationEmail,
  memberRsvpConfirmationEmail,
  waitlistConfirmationEmail,
  donationThankYouEmail,
} from '@/lib/email/templates';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_EVENT = {
  title: 'Spring Gala',
  date: 'May 10, 2026',
  time: '7:00 PM',
  location: 'New York, NY',
  slug: 'spring-gala-2026',
};

function assertBaseStructure(html: string) {
  expect(html).toContain('<!DOCTYPE html>');
  expect(html).toContain('rotaract-logo-white.png'); // header logo (white variant)
  expect(html).toContain('Service Above Self');     // motto
  expect(html).toContain('rotaractnyc.org');        // footer domain
  expect(html).toContain('216 East 45th Street');   // footer address
  expect(html).toContain('Instagram');              // social links
  expect(html).toContain('LinkedIn');
}

function assertEscaped(html: string, raw: string, escaped: string) {
  expect(html).not.toContain(raw);
  expect(html).toContain(escaped);
}

// ── wrapTemplate ─────────────────────────────────────────────────────────────

describe('wrapTemplate', () => {
  it('produces valid base HTML with header and footer', () => {
    const html = wrapTemplate('<p>Hello</p>');
    assertBaseStructure(html);
    expect(html).toContain('<p>Hello</p>');
  });

  it('injects preheader text when provided', () => {
    const html = wrapTemplate('<p>Body</p>', 'Preview text here');
    expect(html).toContain('Preview text here');
    expect(html).toContain('display:none');
  });

  it('omits preheader div when preview is empty', () => {
    const html = wrapTemplate('<p>Body</p>');
    expect(html).not.toContain('display:none');
  });
});

// ── contactFormEmail ─────────────────────────────────────────────────────────

describe('contactFormEmail', () => {
  const data = { name: 'Alice', email: 'alice@example.com', subject: 'Hello', message: 'Hi there!' };

  it('has correct subject', () => {
    expect(contactFormEmail(data).subject).toBe('[Contact] Hello');
  });

  it('includes sender name, email, subject, and message in HTML', () => {
    const { html } = contactFormEmail(data);
    assertBaseStructure(html);
    expect(html).toContain('Alice');
    expect(html).toContain('alice@example.com');
    expect(html).toContain('Hello');
    expect(html).toContain('Hi there!');
  });

  it('HTML-escapes dangerous input', () => {
    const xssData = { name: '<script>bad()</script>', email: 'x@x.com', subject: 'S', message: '"quoted"' };
    const { html } = contactFormEmail(xssData);
    assertEscaped(html, '<script>', '&lt;script&gt;');
    assertEscaped(html, '"quoted"', '&quot;quoted&quot;');
  });

  it('includes all key fields in plain text', () => {
    const { text } = contactFormEmail(data);
    expect(text).toContain('Alice');
    expect(text).toContain('alice@example.com');
    expect(text).toContain('Hi there!');
  });
});

// ── membershipInterestEmail ──────────────────────────────────────────────────

describe('membershipInterestEmail', () => {
  it('includes name and email', () => {
    const { html } = membershipInterestEmail({ name: 'Bob', email: 'bob@example.com' });
    expect(html).toContain('Bob');
    expect(html).toContain('bob@example.com');
  });

  it('includes optional phone and message when provided', () => {
    const { html } = membershipInterestEmail({ name: 'Bob', email: 'bob@example.com', phone: '555-1234', message: 'Interested!' });
    expect(html).toContain('555-1234');
    expect(html).toContain('Interested!');
  });

  it('omits phone row when not provided', () => {
    const { html } = membershipInterestEmail({ name: 'Bob', email: 'bob@example.com' });
    expect(html).not.toContain('Phone:');
  });
});

// ── welcomeEmail ─────────────────────────────────────────────────────────────

describe('welcomeEmail', () => {
  it('addresses the member by name', () => {
    const { html, text } = welcomeEmail('Carol');
    expect(html).toContain('Carol');
    expect(text).toContain('Carol');
  });

  it('contains portal deep-links', () => {
    const { html } = welcomeEmail('Carol');
    expect(html).toContain('/portal/profile');
    expect(html).toContain('/portal/dues');
    expect(html).toContain('/portal/events');
    expect(html).toContain('/portal/directory');
  });

  it('has correct subject', () => {
    expect(welcomeEmail('Carol').subject).toContain('Welcome');
  });
});

// ── inviteEmail ──────────────────────────────────────────────────────────────

describe('inviteEmail', () => {
  it('includes a sign-in CTA link', () => {
    const { html } = inviteEmail('Dana');
    expect(html).toContain('/portal/login');
    expect(html).toContain('Dana');
  });

  it('has a plain-text login URL', () => {
    expect(inviteEmail('Dana').text).toContain('/portal/login');
  });
});

// ── duesReminderEmail ────────────────────────────────────────────────────────

describe('duesReminderEmail', () => {
  it('includes name, amount, and cycle', () => {
    const { html, text } = duesReminderEmail('Eve', '$85.00', '2025–2026');
    expect(html).toContain('Eve');
    expect(html).toContain('$85.00');
    expect(html).toContain('2025–2026');
    expect(text).toContain('$85.00');
    expect(text).toContain('2025–2026');
  });

  it('has an actionable subject', () => {
    expect(duesReminderEmail('Eve', '$85.00', '2025–2026').subject).toContain('2025–2026');
  });
});

// ── eventReminderEmail ───────────────────────────────────────────────────────

describe('eventReminderEmail', () => {
  it('includes all event details', () => {
    const { html, text } = eventReminderEmail('Frank', SAMPLE_EVENT);
    expect(html).toContain('Spring Gala');
    expect(html).toContain('May 10, 2026');
    expect(html).toContain('New York, NY');
    expect(text).toContain('7:00 PM');
  });
});

// ── profileReminderEmail ─────────────────────────────────────────────────────

describe('profileReminderEmail', () => {
  it('includes member name and profile link', () => {
    const { html } = profileReminderEmail('Grace');
    expect(html).toContain('Grace');
    expect(html).toContain('/portal/profile');
  });
});

// ── duesNudgeEmail ───────────────────────────────────────────────────────────

describe('duesNudgeEmail', () => {
  it('includes name and amount', () => {
    const { html } = duesNudgeEmail('Hank', '$65.00');
    expect(html).toContain('Hank');
    expect(html).toContain('$65.00');
    expect(html).toContain('/portal/dues');
  });
});

// ── oneWeekCheckInEmail ──────────────────────────────────────────────────────

describe('oneWeekCheckInEmail', () => {
  it('includes events and directory links', () => {
    const { html } = oneWeekCheckInEmail('Iris');
    expect(html).toContain('Iris');
    expect(html).toContain('/portal/events');
    expect(html).toContain('/portal/directory');
  });
});

// ── guestRsvpConfirmationEmail ───────────────────────────────────────────────

describe('guestRsvpConfirmationEmail', () => {
  it('includes event details and membership upsell', () => {
    const { html, text } = guestRsvpConfirmationEmail('Jack', SAMPLE_EVENT);
    expect(html).toContain('Spring Gala');
    expect(html).toContain('May 10, 2026');
    expect(html).toContain('/membership');  // upsell for non-members
    expect(text).toContain('/membership');
  });

  it('subject contains event title', () => {
    expect(guestRsvpConfirmationEmail('Jack', SAMPLE_EVENT).subject).toContain('Spring Gala');
  });
});

// ── guestTicketConfirmationEmail ─────────────────────────────────────────────

describe('guestTicketConfirmationEmail', () => {
  it('includes amount paid and event details', () => {
    const { html, text } = guestTicketConfirmationEmail('Kate', { ...SAMPLE_EVENT, tierLabel: 'General', quantity: 2 }, 4000);
    expect(html).toContain('$40.00');
    expect(html).toContain('Spring Gala');
    expect(html).toContain('General');
    expect(text).toContain('$40.00');
    expect(text).toContain('General');
  });

  it('shows quantity when > 1', () => {
    const { html } = guestTicketConfirmationEmail('Kate', { ...SAMPLE_EVENT, quantity: 3 }, 3000);
    expect(html).toContain('3');
  });

  it('renders one QR code card per ticket when multiple QR URLs are provided', () => {
    const qrUrls = [
      'https://example.com/api/events/qr?e=evt&m=k&t=1&sig=a&tk=1',
      'https://example.com/api/events/qr?e=evt&m=k&t=1&sig=a&tk=2',
      'https://example.com/api/events/qr?e=evt&m=k&t=1&sig=a&tk=3',
    ];
    const { html } = guestTicketConfirmationEmail(
      'Kate',
      { ...SAMPLE_EVENT, quantity: 3 },
      58500,
      qrUrls,
    );
    // Heading reflects the count.
    expect(html).toContain('Your 3 check-in QR codes');
    // Each ticket gets its own labelled card.
    expect(html).toContain('Ticket 1 of 3');
    expect(html).toContain('Ticket 2 of 3');
    expect(html).toContain('Ticket 3 of 3');
    // Each QR URL is embedded as an <img src>.
    for (const url of qrUrls) {
      expect(html).toContain(`src="${url}"`);
    }
  });

  it('includes membership upsell', () => {
    const { html } = guestTicketConfirmationEmail('Kate', SAMPLE_EVENT, 2500);
    expect(html).toContain('/membership');
  });

  it('omits membership upsell when isMember is true', () => {
    const { html, text } = guestTicketConfirmationEmail(
      'Kate',
      SAMPLE_EVENT,
      2500,
      undefined,
      { isMember: true },
    );
    expect(html).not.toContain('Consider joining Rotaract NYC');
    expect(html).not.toContain('Learn About Membership');
    expect(text).not.toContain('Consider joining Rotaract NYC');
  });

  it('formats ISO datetime dates as a friendly weekday/month/day string', () => {
    const { html, text } = guestTicketConfirmationEmail(
      'Kate',
      { ...SAMPLE_EVENT, date: '2026-06-06T21:00:00.000Z' },
      2500,
    );
    // Should NOT render the raw ISO timestamp in the body.
    expect(html).not.toContain('2026-06-06T21:00:00.000Z');
    expect(text).not.toContain('2026-06-06T21:00:00.000Z');
    // Should render a human-readable date.
    expect(html).toMatch(/June 6, 2026/);
    expect(text).toMatch(/June 6, 2026/);
  });

  it('formats date-only (YYYY-MM-DD) values without timezone shift', () => {
    const { html } = guestTicketConfirmationEmail(
      'Kate',
      { ...SAMPLE_EVENT, date: '2026-06-06' },
      2500,
    );
    expect(html).toMatch(/June 6, 2026/);
  });

  it('passes through pre-formatted date strings unchanged', () => {
    const { html } = guestTicketConfirmationEmail(
      'Kate',
      { ...SAMPLE_EVENT, date: 'May 10, 2026' },
      2500,
    );
    expect(html).toContain('May 10, 2026');
  });

  it('subject contains event title', () => {
    expect(guestTicketConfirmationEmail('Kate', SAMPLE_EVENT, 2500).subject).toContain('Spring Gala');
  });

  it('uses inline Lucide SVG icons (not emojis) for detail rows', () => {
    const { html } = guestTicketConfirmationEmail('Kate', { ...SAMPLE_EVENT, tierLabel: 'General', quantity: 2 }, 4000);
    // No emoji codepoints in body
    expect(html).not.toMatch(new RegExp('[\\u{1F4C5}\\u{1F4CD}\\u{1F522}\\u{1F4B3}\\u{1F39F}]', 'u'));
    // SVG markup with the lucide attributes is present
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('stroke-linecap="round"');
    // calendar rect path is unique enough to confirm the calendar icon rendered
    expect(html).toContain('<rect x="3" y="4" width="18" height="18"');
    // map-pin path
    expect(html).toContain('M20 10c0 6-8 12-8 12');
  });
});

// ── memberTicketConfirmationEmail ────────────────────────────────────────────

describe('memberTicketConfirmationEmail', () => {
  it('includes amount paid, event details, and tier when provided', () => {
    const { html, text } = memberTicketConfirmationEmail(
      'Leo',
      { ...SAMPLE_EVENT, tierLabel: 'Early Bird', quantity: 1 },
      3500,
    );
    expect(html).toContain('$35.00');
    expect(html).toContain('Spring Gala');
    expect(html).toContain('Early Bird');
    expect(text).toContain('$35.00');
    expect(text).toContain('Early Bird');
  });

  it('uses portal link, NOT membership upsell', () => {
    const { html } = memberTicketConfirmationEmail('Leo', SAMPLE_EVENT, 3500);
    expect(html).toContain('/portal/events');       // portal CTA
    expect(html).not.toContain('/membership');      // no upsell — already a member
  });

  it('includes a "share event" link for word-of-mouth', () => {
    const { html } = memberTicketConfirmationEmail('Leo', SAMPLE_EVENT, 3500);
    expect(html).toContain('/events/spring-gala-2026');
  });

  it('subject says "You\'re going"', () => {
    expect(memberTicketConfirmationEmail('Leo', SAMPLE_EVENT, 3500).subject).toContain("You're going");
  });

  it('shows ticket count in attendee names table', () => {
    const single = memberTicketConfirmationEmail('Leo', { ...SAMPLE_EVENT, quantity: 1 }, 3500);
    const multi  = memberTicketConfirmationEmail('Leo', { ...SAMPLE_EVENT, quantity: 4 }, 3500);
    // ticket count shown in attendee table header for multi
    expect(multi.html).toContain('Tickets (4)');
    // single ticket also shown
    expect(single.html).toContain('Ticket (1)');
  });
});

// ── memberRsvpConfirmationEmail ──────────────────────────────────────────────

describe('memberRsvpConfirmationEmail', () => {
  it('includes event title, date, time, and location', () => {
    const { html, text } = memberRsvpConfirmationEmail('Mia', SAMPLE_EVENT);
    expect(html).toContain('Spring Gala');
    expect(html).toContain('May 10, 2026');
    expect(html).toContain('7:00 PM');
    expect(html).toContain('New York, NY');
    expect(text).toContain('Spring Gala');
  });

  it('uses portal link, NOT membership upsell', () => {
    const { html } = memberRsvpConfirmationEmail('Mia', SAMPLE_EVENT);
    expect(html).toContain('/portal/events');
    expect(html).not.toContain('/membership');
  });

  it('includes "bring a friend" share link', () => {
    const { html, text } = memberRsvpConfirmationEmail('Mia', SAMPLE_EVENT);
    expect(html).toContain('/events/spring-gala-2026');
    expect(text).toContain('/events/spring-gala-2026');
  });

  it('includes update-RSVP prompt', () => {
    const { html, text } = memberRsvpConfirmationEmail('Mia', SAMPLE_EVENT);
    expect(html).toContain('change your RSVP');
    expect(text).toContain('change your RSVP');
  });

  it('subject says "RSVP confirmed"', () => {
    expect(memberRsvpConfirmationEmail('Mia', SAMPLE_EVENT).subject).toContain('RSVP confirmed');
  });
});

// ── waitlistConfirmationEmail ────────────────────────────────────────────────

describe('waitlistConfirmationEmail', () => {
  it('includes email, event title, and event link', () => {
    const { html, text } = waitlistConfirmationEmail('nina@example.com', 'Spring Gala', 'spring-gala-2026');
    expect(html).toContain('nina@example.com');
    expect(html).toContain('Spring Gala');
    expect(html).toContain('/events/spring-gala-2026');
    expect(text).toContain('Spring Gala');
  });
});

// ── donationThankYouEmail ────────────────────────────────────────────────────

describe('donationThankYouEmail', () => {
  it('includes donor name and formatted amount', () => {
    const { html, text } = donationThankYouEmail('Owen', 5000);
    expect(html).toContain('Owen');
    expect(html).toContain('$50.00');
    expect(text).toContain('$50.00');
  });

  it('lists impact areas', () => {
    const { html } = donationThankYouEmail('Owen', 5000);
    expect(html).toContain('Food drives');
    expect(html).toContain('Educational programs');
  });

  it('has correct subject', () => {
    expect(donationThankYouEmail('Owen', 5000).subject).toContain('Rotaract NYC');
  });

  it('mentions the event when an event title is provided', () => {
    const { html, text, subject } = donationThankYouEmail('Owen', 5000, 'Spring Gala');
    expect(subject).toContain('Spring Gala');
    expect(html).toContain('Spring Gala');
    expect(text).toContain('Spring Gala');
  });
});

// ── XSS escape coverage across member templates ──────────────────────────────

describe('XSS escaping', () => {
  const xssName = '<img src=x onerror=alert(1)>';

  it('memberTicketConfirmationEmail escapes name', () => {
    const { html } = memberTicketConfirmationEmail(xssName, SAMPLE_EVENT, 1000);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('memberRsvpConfirmationEmail escapes name', () => {
    const { html } = memberRsvpConfirmationEmail(xssName, SAMPLE_EVENT);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});
