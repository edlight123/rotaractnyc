/**
 * Email HTML templates for Rotaract NYC.
 *
 * Design principles:
 *  - Table-based layout for broad email client compatibility (Outlook, Gmail, Apple Mail)
 *  - Preheader / preview text injected per template
 *  - Brand colours: crimson #9B1B30, gold #EBC85B, off-white #FAFAFA
 *  - Defensive HTML escaping on all user-supplied values
 */
import { SITE } from '@/lib/constants';

// ── HTML-escape helper (defense-in-depth against XSS in emails) ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a date string for display in emails.
 *
 * Accepts:
 *   - ISO 8601 datetime ("2026-06-06T21:00:00.000Z")
 *   - ISO 8601 date ("2026-06-06")
 *   - Already-formatted strings ("June 6, 2026") — passed through unchanged.
 *
 * Returns "Saturday, June 6, 2026" style. Pure-date inputs are formatted
 * in UTC to avoid off-by-one shifts caused by the server's timezone.
 */
function formatEmailDate(value: string): string {
  if (!value) return '';
  // Bare YYYY-MM-DD: parse as UTC to avoid TZ rollover.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = isDateOnly ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (isNaN(d.getTime())) return value; // not a date — leave as-is.
  try {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      ...(isDateOnly ? { timeZone: 'UTC' } : {}),
    });
  } catch {
    return value;
  }
}

// ── Shared building blocks ──────────────────────────────────────────────────

const CRIMSON = '#9B1B30';
const GOLD = '#EBC85B';
const GOLD_LIGHT = '#FEF9E7';
const GRAY_BG = '#F4F5F7';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_BODY = '#374151';
const TEXT_MUTED = '#6B7280';
const TEXT_SUBTLE = '#9CA3AF';

/** Hidden preheader shown as inbox preview text. */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#ffffff;line-height:1px;">${escapeHtml(text)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>`;
}

/** Primary CTA button — table-based for Outlook compatibility. */
function ctaButton(label: string, href: string, secondary = false): string {
  const bg = secondary ? '#ffffff' : CRIMSON;
  const color = secondary ? CRIMSON : '#ffffff';
  const border = secondary ? `border: 2px solid ${CRIMSON};` : '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="border-radius: 8px; ${border} background-color: ${bg};">
          <a href="${href}" target="_blank"
             style="display: inline-block; padding: 14px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; font-weight: 700; color: ${color}; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

/** Info card with a left-side crimson accent bar. */
function infoCard(lines: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border-radius: 8px; overflow: hidden; border: 1px solid ${GRAY_BORDER};">
      <tr>
        <td width="4" style="background-color: ${CRIMSON};"></td>
        <td style="background-color: #FAFAFA; padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          ${lines}
        </td>
      </tr>
    </table>`;
}

/** Gold highlight box (used for membership upsell / important notices). */
function goldBox(content: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; border-radius: 8px; overflow: hidden; border: 1px solid ${GOLD};">
      <tr>
        <td style="background-color: ${GOLD_LIGHT}; padding: 20px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          ${content}
        </td>
      </tr>
    </table>`;
}

const headerHtml = `
  <!-- Header -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="background-color: ${CRIMSON}; padding: 32px 40px; text-align: center;">
        <img src="${SITE.url}/rotaract-logo-white.png" alt="${SITE.shortName}" width="180" style="height: auto; display: block; margin: 0 auto;" />
        <p style="color: ${GOLD}; font-size: 11px; font-weight: 600; margin: 12px 0 0; letter-spacing: 2px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${SITE.motto}</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: ${GOLD}; height: 3px; line-height: 3px; font-size: 0;">&nbsp;</td>
    </tr>
  </table>`;

const footerHtml = `
  <!-- Footer -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="background-color: ${GRAY_BG}; border-top: 1px solid ${GRAY_BORDER}; padding: 28px 40px; text-align: center;">
        <!-- Social links -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
          <tr>
            <td style="padding: 0 8px;">
              <a href="${SITE.social.instagram}" target="_blank" style="color: ${CRIMSON}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; text-decoration: none;">Instagram</a>
            </td>
            <td style="color: ${TEXT_SUBTLE}; font-size: 12px;">&bull;</td>
            <td style="padding: 0 8px;">
              <a href="${SITE.social.linkedin}" target="_blank" style="color: ${CRIMSON}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; text-decoration: none;">LinkedIn</a>
            </td>
            <td style="color: ${TEXT_SUBTLE}; font-size: 12px;">&bull;</td>
            <td style="padding: 0 8px;">
              <a href="${SITE.social.facebook}" target="_blank" style="color: ${CRIMSON}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; text-decoration: none;">Facebook</a>
            </td>
          </tr>
        </table>
        <p style="color: ${TEXT_BODY}; font-size: 12px; font-weight: 600; margin: 0 0 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${SITE.name}</p>
        <p style="color: ${TEXT_MUTED}; font-size: 11px; margin: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${SITE.address}</p>
        <p style="color: ${TEXT_SUBTLE}; font-size: 11px; margin: 8px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <a href="${SITE.url}" style="color: ${CRIMSON}; text-decoration: none;">${SITE.domain}</a>
          &nbsp;&bull;&nbsp;
          <a href="mailto:${SITE.email}" style="color: ${TEXT_SUBTLE}; text-decoration: none;">${SITE.email}</a>
        </p>
      </td>
    </tr>
  </table>`;

export function wrapTemplate(body: string, preview = ''): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${SITE.shortName}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${GRAY_BG}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${preview ? preheader(preview) : ''}
  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${GRAY_BG};">
    <tr>
      <td style="padding: 32px 16px;">
        <!-- Email card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr><td>${headerHtml}</td></tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 36px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: ${TEXT_BODY}; font-size: 15px; line-height: 1.6;">
              ${body}
            </td>
          </tr>
          <tr><td>${footerHtml}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Reusable inline style helpers ──────────────────────────────────────────

function h1(text: string): string {
  return `<h1 style="color: ${TEXT_DARK}; font-size: 24px; font-weight: 700; margin: 0 0 8px; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${text}</h1>`;
}

function p(text: string, style = ''): string {
  return `<p style="color: ${TEXT_BODY}; font-size: 15px; line-height: 1.7; margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; ${style}">${text}</p>`;
}

function muted(text: string): string {
  return `<p style="color: ${TEXT_MUTED}; font-size: 13px; line-height: 1.6; margin: 20px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${text}</p>`;
}

function divider(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding: 8px 0;"><div style="border-top: 1px solid ${GRAY_BORDER};"></div></td></tr></table>`;
}

/**
 * Lucide icon paths (MIT-licensed, https://lucide.dev) inlined as SVG.
 *
 * Why inline SVG instead of emoji?
 *   - Consistent visual weight across operating systems (emoji renderings
 *     differ wildly between Apple, Google, Microsoft, Samsung).
 *   - Brand-tinted strokes match the crimson palette.
 *   - SVG renders crisply on retina displays at any size.
 *
 * Compatibility: inline SVG renders in Apple Mail, iOS Mail, Gmail (web +
 * mobile apps), Outlook.com, Outlook 365 web, Yahoo. Outlook for Windows
 * desktop strips SVG — those users will simply see no icon (the label text
 * still reads correctly), which we deemed an acceptable graceful degradation.
 */
const LUCIDE_ICON_PATHS: Record<string, string> = {
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  'map-pin':
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  hash:
    '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  'credit-card':
    '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  ticket:
    '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  user:
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  pin:
    '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
};

export type LucideIconName = keyof typeof LUCIDE_ICON_PATHS;

/**
 * Render a Lucide icon as inline SVG sized to align with body copy.
 * Defaults: 16px, current text color, 2px stroke (matches lucide default).
 */
function icon(name: LucideIconName, color: string = CRIMSON, size = 16): string {
  const paths = LUCIDE_ICON_PATHS[name];
  if (!paths) return '';
  return `<span style="display: inline-block; vertical-align: -3px; line-height: 0; margin-right: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-hidden="true">${paths}</svg></span>`;
}

function listItem(iconName: LucideIconName, title: string, detail: string): string {
  return `
    <tr>
      <td style="padding: 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        ${icon(iconName)}<strong style="color: ${TEXT_DARK}; font-size: 14px;">${title}</strong>
        <span style="color: ${TEXT_BODY}; font-size: 14px;">&nbsp;${detail}</span>
      </td>
    </tr>`;
}

/**
 * Render check-in QR code(s) for a ticket email.
 *
 * Accepts either a single data URL (legacy) or an array of data URLs (one
 * per ticket). When multiple are provided, each is shown in its own framed
 * card with a "Ticket N of M" label so groups can hand them out individually.
 */
function qrCodeBlock(qr: string | string[] | undefined): string {
  if (!qr) return '';
  const codes = Array.isArray(qr) ? qr.filter(Boolean) : [qr];
  if (codes.length === 0) return '';
  const total = codes.length;
  const heading = total === 1 ? 'Your check-in QR code' : `Your ${total} check-in QR codes`;
  const subline = total === 1
    ? 'Show this on your phone or print it for fast entry.'
    : 'Each guest scans their own code at the door — forward or print as needed.';

  const cards = codes.map((dataUrl, i) => `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 8px 16px; display: inline-block; vertical-align: top;">
      <tr>
        <td style="padding: 14px; background: #ffffff; border-radius: 12px; border: 2px solid ${GRAY_BORDER}; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center;">
          <p style="color: ${CRIMSON}; font-size: 11px; font-weight: 700; margin: 0 0 8px; letter-spacing: 1.2px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Ticket ${i + 1}${total > 1 ? ` of ${total}` : ''}</p>
          <img src="${dataUrl}" alt="Check-in QR code (ticket ${i + 1} of ${total})" width="170" height="170" style="display: block; border-radius: 4px; margin: 0 auto;" />
        </td>
      </tr>
    </table>`).join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 8px;">
      <tr>
        <td style="text-align: center;">
          <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 700; margin: 0 0 4px; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Present at entry</p>
          <p style="color: ${TEXT_DARK}; font-size: 16px; font-weight: 700; margin: 0 0 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${heading}</p>
          <p style="color: ${TEXT_MUTED}; font-size: 13px; margin: 0 0 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${subline}</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="text-align: center;">
          ${cards}
        </td>
      </tr>
    </table>`;
}

// ── Templates ──────────────────────────────────────────────────────────────

export function contactFormEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const subject = escapeHtml(data.subject);
  const message = escapeHtml(data.message);

  return {
    subject: `[Contact] ${data.subject}`,
    html: wrapTemplate(`
      ${h1('New Contact Form Submission')}
      ${divider()}
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('user', 'From:', `${name} &lt;${email}&gt;`)}
          ${listItem('pin', 'Subject:', subject)}
        </table>
      `)}
      <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 20px 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Message</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 8px; overflow: hidden; background-color: #FAFAFA; border: 1px solid ${GRAY_BORDER};">
        <tr><td style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: ${TEXT_BODY}; line-height: 1.7; white-space: pre-wrap;">${message}</td></tr>
      </table>
    `, `New message from ${data.name}: ${data.subject}`),
    text: `New Contact Form Submission\n\nFrom: ${data.name} (${data.email})\nSubject: ${data.subject}\n\n${data.message}\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function membershipInterestEmail(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const phone = data.phone ? escapeHtml(data.phone) : '';
  const message = data.message ? escapeHtml(data.message) : '';

  return {
    subject: `[Membership Interest] ${data.name}`,
    html: wrapTemplate(`
      ${h1('New Membership Interest')}
      ${p('Someone has expressed interest in joining Rotaract NYC via the website.')}
      ${divider()}
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('user', 'Name:', name)}
          ${listItem('✉️', 'Email:', email)}
          ${phone ? listItem('phone', 'Phone:', phone) : ''}
        </table>
      `)}
      ${message ? `
        <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 20px 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Note from applicant</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 8px; background-color: #FAFAFA; border: 1px solid ${GRAY_BORDER};">
          <tr><td style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: ${TEXT_BODY}; line-height: 1.7;">${message}</td></tr>
        </table>` : ''}
    `, `${data.name} is interested in joining Rotaract NYC`),
    text: `New Membership Interest\n\nName: ${data.name}\nEmail: ${data.email}${data.phone ? `\nPhone: ${data.phone}` : ''}${data.message ? `\n\n${data.message}` : ''}\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function welcomeEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `Welcome to ${SITE.shortName}! 🎉`,
    html: wrapTemplate(`
      ${h1(`Welcome to the club, ${safeName}!`)}
      ${p(`We're thrilled to have you as a member of the <strong>${SITE.name}</strong>. You're joining a community of young professionals and emerging leaders committed to service, leadership, and fellowship in New York City.`)}
      <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Get started</p>
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <a href="${SITE.url}/portal/profile" style="color: ${CRIMSON}; font-size: 14px; font-weight: 600; text-decoration: none;">Complete your member profile</a>
              <p style="color: ${TEXT_MUTED}; font-size: 13px; margin: 2px 0 0;">Add a photo, bio, and interests so fellow members can find and connect with you.</p>
            </td>
          </tr>
          <tr><td style="padding: 4px 0;"><div style="border-top: 1px solid ${GRAY_BORDER};"></div></td></tr>
          <tr>
            <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <a href="${SITE.url}/portal/dues" style="color: ${CRIMSON}; font-size: 14px; font-weight: 600; text-decoration: none;">Pay your annual dues</a>
              <p style="color: ${TEXT_MUTED}; font-size: 13px; margin: 2px 0 0;">Unlock full member benefits including event RSVPs, committees, and voting rights.</p>
            </td>
          </tr>
          <tr><td style="padding: 4px 0;"><div style="border-top: 1px solid ${GRAY_BORDER};"></div></td></tr>
          <tr>
            <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <a href="${SITE.url}/portal/events" style="color: ${CRIMSON}; font-size: 14px; font-weight: 600; text-decoration: none;">Browse upcoming events</a>
              <p style="color: ${TEXT_MUTED}; font-size: 13px; margin: 2px 0 0;">RSVP to your first meeting or service event and start meeting people.</p>
            </td>
          </tr>
          <tr><td style="padding: 4px 0;"><div style="border-top: 1px solid ${GRAY_BORDER};"></div></td></tr>
          <tr>
            <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <a href="${SITE.url}/portal/directory" style="color: ${CRIMSON}; font-size: 14px; font-weight: 600; text-decoration: none;">Explore the member directory</a>
              <p style="color: ${TEXT_MUTED}; font-size: 13px; margin: 2px 0 0;">Connect with members across committees, industries, and interests.</p>
            </td>
          </tr>
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Go to Your Member Portal', `${SITE.url}/portal`)}
          </td>
        </tr>
      </table>
      ${muted(`We meet <strong>${SITE.meetingSchedule}</strong> at ${SITE.address}. We hope to see you soon!`)}
    `, `You're now a member of ${SITE.name}!`),
    text: `Welcome to the club, ${name}!\n\nWe're thrilled to have you as a member of the ${SITE.name}.\n\nGet started:\n- Complete your member profile: ${SITE.url}/portal/profile\n- Pay your annual dues: ${SITE.url}/portal/dues\n- Browse upcoming events: ${SITE.url}/portal/events\n- Explore the member directory: ${SITE.url}/portal/directory\n\nWe meet ${SITE.meetingSchedule} at ${SITE.address}. We hope to see you soon!\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function inviteEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `You're invited to join ${SITE.shortName}`,
    html: wrapTemplate(`
      ${h1(`You've been invited, ${safeName}!`)}
      ${p(`You've been added to the <strong>${SITE.name}</strong> member portal. Sign in to complete your profile and officially become an active member of our community.`)}
      <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">What to expect</p>
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('1.', 'Sign in', 'with your Google account using this email address.')}
          ${listItem('2.', 'Set up your profile', '— add a photo, bio, and contact info.')}
          ${listItem('3.', 'Choose your membership tier', 'and pay your annual dues.')}
          ${listItem('4.', 'Start exploring', '— events, committees, directory, and more.')}
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Sign In & Get Started', `${SITE.url}/portal/login`)}
          </td>
        </tr>
      </table>
      ${muted(`Please sign in using the same email address this invitation was sent to. This ensures your profile is linked correctly.`)}
    `, `You've been invited to join ${SITE.name}`),
    text: `You've been invited, ${name}!\n\nYou've been added to the ${SITE.name} member portal. Sign in to complete your profile and become an active member.\n\nWhat to expect:\n1. Sign in with your Google account at ${SITE.url}/portal/login\n2. Set up your profile — add a photo, bio, and contact info.\n3. Choose your membership tier and pay your annual dues.\n4. Start exploring — events, committees, directory, and more.\n\nPlease sign in using the same email address this invitation was sent to.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function boardInviteEmail(
  name: string,
  title: string,
  invitedBy?: string,
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(title);
  const safeInviter = invitedBy ? escapeHtml(invitedBy) : '';
  const inviterLine = safeInviter
    ? `<strong>${safeInviter}</strong> has added you to the board`
    : `You've been added to the board`;

  return {
    subject: `You're on the board — ${safeTitle} of ${SITE.shortName} 🎉`,
    html: wrapTemplate(`
      ${h1(`Congratulations, ${safeName}!`)}
      ${p(`${inviterLine} of <strong>${SITE.name}</strong> as <strong>${safeTitle}</strong>. Thank you for stepping up to lead.`)}
      <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">What changes for you</p>
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('1.', 'Admin access', '— you can now manage members, events, dues, posts, and more from the portal.')}
          ${listItem('2.', 'Public Leadership page', `— your name and title (${safeTitle}) now appear at ${SITE.url}/leadership.`)}
          ${listItem('3.', 'Board responsibilities', '— review pending members, approve service hours, and help shape the club.')}
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Open Board Tools', `${SITE.url}/portal`)}
          </td>
        </tr>
      </table>
      ${muted(`If you weren't expecting this, please reach out to the President or reply to this email.`)}
    `, `You're now on the board of ${SITE.name}`),
    text: `Congratulations, ${name}!\n\n${invitedBy ? `${invitedBy} has added you` : `You've been added`} to the board of ${SITE.name} as ${title}.\n\nWhat changes:\n1. Admin access — you can now manage members, events, dues, posts, and more from the portal.\n2. Your name and title (${title}) now appear on the public Leadership page: ${SITE.url}/leadership\n3. Board responsibilities — review pending members, approve service hours, and help shape the club.\n\nOpen the portal: ${SITE.url}/portal\n\nIf you weren't expecting this, please reach out to the President.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function duesReminderEmail(name: string, amount: string, cycleName: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeAmount = escapeHtml(amount);
  const safeCycle = escapeHtml(cycleName);

  return {
    subject: `Action needed: Your ${cycleName} dues are due`,
    html: wrapTemplate(`
      ${h1('Your annual dues are due')}
      ${p(`Hi ${safeName},`)}
      ${p(`Your membership dues of <strong>${safeAmount}</strong> for the <strong>${safeCycle}</strong> Rotary year are now due. Paying on time ensures you retain full access to all member benefits.`)}
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('credit-card', 'Amount due:', safeAmount)}
          ${listItem('calendar', 'Rotary year:', safeCycle)}
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Pay Dues Now', `${SITE.url}/portal/dues`)}
          </td>
        </tr>
      </table>
      ${muted('Questions? Reply to this email or reach us at <a href="mailto:' + SITE.email + '" style="color: ' + CRIMSON + ';">' + SITE.email + '</a>.')}
    `, `Your ${cycleName} dues of ${amount} are due — pay now to keep your membership active`),
    text: `Your annual dues are due\n\nHi ${name},\n\nYour membership dues of ${amount} for the ${cycleName} Rotary year are now due.\n\nPay now: ${SITE.url}/portal/dues\n\nQuestions? Email us at ${SITE.email}.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function eventReminderEmail(name: string, event: {
  title: string;
  date: string;
  time: string;
  location: string;
}): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(event.title);
  const safeDate = escapeHtml(formatEmailDate(event.date));
  const safeTime = escapeHtml(event.time);
  const safeLocation = escapeHtml(event.location);

  return {
    subject: `Reminder: ${event.title}`,
    html: wrapTemplate(`
      ${h1('Event Reminder')}
      ${p(`Hi ${safeName}, just a heads-up — you have an upcoming event:`)}
      ${infoCard(`
        <p style="color: ${CRIMSON}; font-size: 17px; font-weight: 700; margin: 0 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${safeTitle}</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('calendar', 'Date:', `${safeDate} at ${safeTime}`)}
          ${listItem('map-pin', 'Location:', safeLocation)}
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('View Event', `${SITE.url}/portal/events`)}
          </td>
        </tr>
      </table>
      ${muted('We look forward to seeing you there!')}
    `, `Reminder: ${event.title} — ${formatEmailDate(event.date)} at ${event.time}`),
    text: `Event Reminder\n\nHi ${name}, just a heads-up — you have an upcoming event:\n\n${event.title}\n${formatEmailDate(event.date)} at ${event.time}\n${event.location}\n\nView event: ${SITE.url}/portal/events\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

// ── Onboarding Sequence Templates ──────────────────────────────────────────

export function profileReminderEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `Your profile is almost complete — ${SITE.shortName}`,
    html: wrapTemplate(`
      ${h1(`${safeName}, finish setting up your profile`)}
      ${p(`You're one step away from being fully set up as a member. A complete profile helps fellow members find you, learn about your background, and connect with you more easily.`)}
      ${p(`It only takes a few minutes — add a photo, write a short bio, and select your interests.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Complete Your Profile', `${SITE.url}/portal/profile`)}
          </td>
        </tr>
      </table>
      ${muted('Already finished your profile? You can safely ignore this email.')}
    `, 'A few minutes is all it takes — finish setting up your Rotaract NYC profile'),
    text: `${name}, finish setting up your profile\n\nYou're one step away from being fully set up as a member. Add a photo, bio, and interests.\n\nComplete your profile: ${SITE.url}/portal/profile\n\nAlready finished? You can safely ignore this email.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function duesNudgeEmail(name: string, amount: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeAmount = escapeHtml(amount);

  return {
    subject: `Your dues are still outstanding — ${SITE.shortName}`,
    html: wrapTemplate(`
      ${h1(`A gentle reminder, ${safeName}`)}
      ${p(`Your annual membership dues of <strong>${safeAmount}</strong> haven't been paid yet.`)}
      ${p(`Your dues go directly toward service projects, community events, and the partnerships that make Rotaract NYC possible. Staying current also ensures you have full access to member benefits — event RSVPs, committee participation, and voting rights.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Pay Dues Now', `${SITE.url}/portal/dues`)}
          </td>
        </tr>
      </table>
      ${muted("If you've already paid, it may take a moment to reflect — feel free to disregard this message.")}
    `, `Your dues of ${amount} are outstanding — pay now to keep your membership active`),
    text: `A gentle reminder, ${name}\n\nYour annual membership dues of ${amount} haven't been paid yet.\n\nPay dues now: ${SITE.url}/portal/dues\n\nIf you've already paid, it may take a moment to reflect — feel free to disregard this message.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function oneWeekCheckInEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `One week in — how's it going, ${name}?`,
    html: wrapTemplate(`
      ${h1(`How are you settling in, ${safeName}?`)}
      ${p(`It's been a week since you joined ${SITE.name} — we hope you're getting comfortable!`)}
      ${p(`Here are two easy ways to get more out of your membership right now:`)}
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <a href="${SITE.url}/portal/events" style="color: ${CRIMSON}; font-size: 14px; font-weight: 700; text-decoration: none;">Attend an upcoming event →</a>
              <p style="color: ${TEXT_MUTED}; font-size: 13px; margin: 3px 0 0;">RSVP to your first meeting or service event. It's hands-down the best way to meet fellow members.</p>
            </td>
          </tr>
          <tr><td style="padding: 4px 0;"><div style="border-top: 1px solid ${GRAY_BORDER};"></div></td></tr>
          <tr>
            <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <a href="${SITE.url}/portal/directory" style="color: ${CRIMSON}; font-size: 14px; font-weight: 700; text-decoration: none;">Browse the member directory →</a>
              <p style="color: ${TEXT_MUTED}; font-size: 13px; margin: 3px 0 0;">Find members with shared interests, industries, or committees — and say hello.</p>
            </td>
          </tr>
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto 0;">
        <tr>
          <td style="padding-right: 8px;">${ctaButton('Browse Events', `${SITE.url}/portal/events`)}</td>
          <td style="padding-left: 8px;">${ctaButton('Member Directory', `${SITE.url}/portal/directory`, true)}</td>
        </tr>
      </table>
      ${muted(`We meet <strong>${SITE.meetingSchedule}</strong> — we'd love to see you there!`)}
    `, `Tips for making the most of your first week with Rotaract NYC`),
    text: `How are you settling in, ${name}?\n\nIt's been a week since you joined ${SITE.name}!\n\n- Attend an upcoming event: ${SITE.url}/portal/events\n- Browse the member directory: ${SITE.url}/portal/directory\n\nWe meet ${SITE.meetingSchedule} — we'd love to see you there!\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function guestRsvpConfirmationEmail(
  name: string,
  event: { title: string; date: string; time: string; location: string; slug: string },
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(event.title);
  const safeDate = escapeHtml(formatEmailDate(event.date));
  const safeTime = escapeHtml(event.time);
  const safeLocation = escapeHtml(event.location);

  return {
    subject: `You're registered: ${event.title}`,
    html: wrapTemplate(`
      ${h1(`You're all set, ${safeName}!`)}
      ${p(`Your registration has been confirmed for the following event:`)}
      ${infoCard(`
        <p style="color: ${CRIMSON}; font-size: 17px; font-weight: 700; margin: 0 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${safeTitle}</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('calendar', 'Date:', `${safeDate} at ${safeTime}`)}
          ${listItem('map-pin', 'Location:', safeLocation)}
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('View Event Details', `${SITE.url}/events/${event.slug}`)}
          </td>
        </tr>
      </table>
      ${divider()}
      ${goldBox(`
        <p style="color: ${TEXT_DARK}; font-size: 15px; font-weight: 700; margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Enjoying the event? Consider joining Rotaract NYC.</p>
        <p style="color: ${TEXT_BODY}; font-size: 14px; margin: 0 0 16px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Members get access to exclusive events, service opportunities, professional development, and a community of driven young professionals making a real difference in NYC.</p>
        ${ctaButton('Learn About Membership', `${SITE.url}/membership`, true)}
      `)}
    `, `Registration confirmed — see you at ${event.title}!`),
    text: `You're all set, ${name}!\n\nYour registration has been confirmed:\n\n${event.title}\n${formatEmailDate(event.date)} at ${event.time}\n${event.location}\n\nView event details: ${SITE.url}/events/${event.slug}\n\n---\n\nEnjoying the event? Consider joining Rotaract NYC.\nMembers get access to exclusive events, service opportunities, and a network of young professionals.\n${SITE.url}/membership\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function guestTicketConfirmationEmail(
  name: string,
  event: { title: string; date: string; time: string; location: string; slug: string; tierLabel?: string; quantity?: number; attendeeNames?: string[] },
  amountCents: number,
  qrCodes?: string | string[],
  options?: { isMember?: boolean },
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(event.title);
  const safeDate = escapeHtml(formatEmailDate(event.date));
  const safeTime = escapeHtml(event.time);
  const safeLocation = escapeHtml(event.location);
  const tierLabel = event.tierLabel ? escapeHtml(event.tierLabel) : '';
  const quantity = event.quantity ?? 1;
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
  const attendeeNames = event.attendeeNames ?? [name];
  const isMember = options?.isMember ?? false;

  const attendeeNamesHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border-radius: 8px; border: 1px solid ${GRAY_BORDER}; overflow: hidden;">
      <tr>
        <td style="background-color: ${CRIMSON}; padding: 10px 20px;">
          <p style="color: #ffffff; font-size: 11px; font-weight: 700; margin: 0; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${icon('ticket', '#ffffff', 14)}Ticket${quantity > 1 ? 's' : ''} (${quantity})</p>
        </td>
      </tr>
      ${attendeeNames.map((n, i) => `
      <tr>
        <td style="background-color: ${i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'}; padding: 12px 20px; border-top: 1px solid ${GRAY_BORDER}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <p style="color: ${TEXT_DARK}; font-size: 14px; font-weight: 600; margin: 0;"><span style="color: ${TEXT_MUTED}; font-weight: 400; margin-right: 8px;">#${i + 1}</span>${escapeHtml(n)}</p>
        </td>
      </tr>`).join('')}
    </table>`;

  const headline = quantity > 1
    ? `Your ${quantity} tickets are confirmed, ${safeName}!`
    : `Your ticket is confirmed, ${safeName}!`;
  const intro = quantity > 1
    ? `Payment received — you've got <strong>${quantity} tickets</strong> waiting for you. We've included a separate QR code for each guest below.`
    : `Payment received — your spot is locked in. We can't wait to see you there.`;

  return {
    subject: quantity > 1
      ? `Your ${quantity} tickets are confirmed: ${event.title}`
      : `Your ticket is confirmed: ${event.title}`,
    html: wrapTemplate(`
      ${h1(headline)}
      ${p(intro)}
      ${infoCard(`
        <p style="color: ${CRIMSON}; font-size: 17px; font-weight: 700; margin: 0 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${safeTitle}</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('calendar', 'Date:', `${safeDate} at ${safeTime}`)}
          ${listItem('map-pin', 'Location:', safeLocation)}
          ${tierLabel ? listItem('ticket', 'Ticket type:', tierLabel) : ''}
          ${listItem('hash', 'Quantity:', String(quantity))}
          ${listItem('credit-card', 'Amount paid:', amountFormatted)}
        </table>
      `)}
      ${attendeeNamesHtml}
      ${qrCodeBlock(qrCodes)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('View Event Details', `${SITE.url}/events/${event.slug}`)}
          </td>
        </tr>
      </table>
      ${muted(`Need to make a change or can't make it? Reply to this email or reach us at <a href="mailto:${SITE.email}" style="color: ${CRIMSON};">${SITE.email}</a> and we'll take care of it.`)}
      ${isMember ? '' : `
        ${divider()}
        ${goldBox(`
          <p style="color: ${TEXT_DARK}; font-size: 15px; font-weight: 700; margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Enjoying the event? Consider joining Rotaract NYC.</p>
          <p style="color: ${TEXT_BODY}; font-size: 14px; margin: 0 0 16px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Members get access to exclusive events, service opportunities, professional development, and a community of driven young professionals making a real difference in NYC.</p>
          ${ctaButton('Learn About Membership', `${SITE.url}/membership`, true)}
        `)}
      `}
    `, `Ticket confirmed — you're going to ${event.title}!`),
    text: `Your ticket is confirmed, ${name}!\n\n${event.title}\n${formatEmailDate(event.date)} at ${event.time}\n${event.location}${tierLabel ? `\nTicket type: ${event.tierLabel}` : ''}\nTickets (${quantity}): ${attendeeNames.join(', ')}\nAmount paid: ${amountFormatted}\n\nView event details: ${SITE.url}/events/${event.slug}\n\nNeed to make a change? Email ${SITE.email}.${isMember ? '' : `\n\n---\n\nEnjoying the event? Consider joining Rotaract NYC.\n${SITE.url}/membership`}\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

// ── Member-specific event email templates ──────────────────────────────────
// These differ from guest templates in two ways:
//  1. No membership upsell — the recipient is already a member
//  2. A "bring a friend" / community prompt instead
//  3. Richer member-facing detail (portal deep-link, tier/seat info)

export function memberTicketConfirmationEmail(
  name: string,
  event: { title: string; date: string; time: string; location: string; slug: string; tierLabel?: string; quantity?: number; attendeeNames?: string[] },
  amountCents: number,
  qrCodes?: string | string[],
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(event.title);
  const safeDate = escapeHtml(formatEmailDate(event.date));
  const safeTime = escapeHtml(event.time);
  const safeLocation = escapeHtml(event.location);
  const tierLabel = event.tierLabel ? escapeHtml(event.tierLabel) : '';
  const quantity = event.quantity ?? 1;
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
  const attendeeNames = event.attendeeNames ?? [name];

  const attendeeNamesHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border-radius: 8px; border: 1px solid ${GRAY_BORDER}; overflow: hidden;">
      <tr>
        <td style="background-color: ${CRIMSON}; padding: 10px 20px;">
          <p style="color: #ffffff; font-size: 11px; font-weight: 700; margin: 0; letter-spacing: 1.5px; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${icon('ticket', '#ffffff', 14)}Ticket${quantity > 1 ? 's' : ''} (${quantity})</p>
        </td>
      </tr>
      ${attendeeNames.map((n, i) => `
      <tr>
        <td style="background-color: ${i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'}; padding: 12px 20px; border-top: 1px solid ${GRAY_BORDER}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <p style="color: ${TEXT_DARK}; font-size: 14px; font-weight: 600; margin: 0;"><span style="color: ${TEXT_MUTED}; font-weight: 400; margin-right: 8px;">#${i + 1}</span>${escapeHtml(n)}</p>
        </td>
      </tr>`).join('')}
    </table>`;

  const headline = quantity > 1
    ? `You're in, ${safeName} — ${quantity} tickets confirmed!`
    : `You're in, ${safeName}!`;
  const intro = quantity > 1
    ? `Your <strong>${quantity} tickets</strong> are locked in. Each guest gets their own QR code below — forward this email or print as needed.`
    : `Your ticket is locked in. We can't wait to see you there.`;

  return {
    subject: quantity > 1
      ? `You're going (${quantity} tickets): ${event.title}`
      : `You're going: ${event.title}`,
    html: wrapTemplate(`
      ${h1(headline)}
      ${p(intro)}
      ${infoCard(`
        <p style="color: ${CRIMSON}; font-size: 17px; font-weight: 700; margin: 0 0 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${safeTitle}</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('calendar', 'Date:', `${safeDate} at ${safeTime}`)}
          ${listItem('map-pin', 'Location:', safeLocation)}
          ${tierLabel ? listItem('ticket', 'Ticket type:', tierLabel) : ''}
          ${listItem('hash', 'Quantity:', String(quantity))}
          ${listItem('credit-card', 'Amount paid:', amountFormatted)}
        </table>
      `)}
      ${attendeeNamesHtml}
      ${qrCodeBlock(qrCodes)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('View Event in Portal', `${SITE.url}/portal/events`)}
          </td>
        </tr>
      </table>
      ${divider()}
      ${goldBox(`
        <p style="color: ${TEXT_DARK}; font-size: 15px; font-weight: 700; margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Know someone who'd love this event?</p>
        <p style="color: ${TEXT_BODY}; font-size: 14px; margin: 0 0 16px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Share the event page with friends, colleagues, or anyone who might want to join. The more the merrier — and it's a great way to grow our community.</p>
        ${ctaButton('Share Event Page', `${SITE.url}/events/${event.slug}`, true)}
      `)}
      ${muted(`Need to cancel or change your ticket? Email us at <a href="mailto:${SITE.email}?subject=Ticket%20cancellation%20-%20${encodeURIComponent(event.title)}" style="color: ${CRIMSON};">${SITE.email}</a> and we'll handle the refund. Refund requests must be received at least 7 days before the event.`)}
    `, `Ticket confirmed — see you at ${event.title}!`),
    text: `You're in, ${name}!\n\nYour ticket${quantity > 1 ? 's are' : ' is'} confirmed:\n\n${event.title}\n${formatEmailDate(event.date)} at ${event.time}\n${event.location}${tierLabel ? `\nTicket type: ${event.tierLabel}` : ''}\nTickets (${quantity}): ${attendeeNames.join(', ')}\nAmount paid: ${amountFormatted}\n\nView in portal: ${SITE.url}/portal/events\n\nNeed to cancel? Email ${SITE.email} at least 7 days before the event for a full refund.\n\nKnow someone who'd love this? Share: ${SITE.url}/events/${event.slug}\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function memberRsvpConfirmationEmail(
  name: string,
  event: { title: string; date: string; time: string; location: string; slug: string },
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(event.title);
  const safeDate = escapeHtml(formatEmailDate(event.date));
  const safeTime = escapeHtml(event.time);
  const safeLocation = escapeHtml(event.location);

  return {
    subject: `RSVP confirmed: ${event.title}`,
    html: wrapTemplate(`
      ${h1(`See you there, ${safeName}!`)}
      ${p(`Your RSVP has been confirmed. We're looking forward to seeing you at:`)}
      ${infoCard(`
        <p style="color: ${CRIMSON}; font-size: 17px; font-weight: 700; margin: 0 0 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${safeTitle}</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('calendar', 'Date:', `${safeDate} at ${safeTime}`)}
          ${listItem('map-pin', 'Location:', safeLocation)}
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('View Event in Portal', `${SITE.url}/portal/events`)}
          </td>
        </tr>
      </table>
      ${divider()}
      ${goldBox(`
        <p style="color: ${TEXT_DARK}; font-size: 15px; font-weight: 700; margin: 0 0 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Bring a friend!</p>
        <p style="color: ${TEXT_BODY}; font-size: 14px; margin: 0 0 16px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Know someone who would enjoy this event? Send them the public event page — guests are always welcome at Rotaract NYC.</p>
        ${ctaButton('Share Event Page', `${SITE.url}/events/${event.slug}`, true)}
      `)}
      ${muted('Need to change your RSVP? You can update it anytime from your <a href="' + SITE.url + '/portal/events" style="color: ' + CRIMSON + ';">events dashboard</a>.')}
    `, `RSVP confirmed — we'll see you at ${event.title}!`),
    text: `See you there, ${name}!\n\nYour RSVP has been confirmed:\n\n${event.title}\n${formatEmailDate(event.date)} at ${event.time}\n${event.location}\n\nView in portal: ${SITE.url}/portal/events\n\nBring a friend! Share: ${SITE.url}/events/${event.slug}\n\nNeed to change your RSVP? Update it anytime at ${SITE.url}/portal/events\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function waitlistConfirmationEmail(
  email: string,
  eventTitle: string,
  eventSlug: string,
): { subject: string; html: string; text: string } {
  const safeEmail = escapeHtml(email);
  const safeTitle = escapeHtml(eventTitle);

  return {
    subject: `You're on the waitlist: ${eventTitle}`,
    html: wrapTemplate(`
      ${h1(`You're on the waitlist`)}
      ${p(`Hi ${safeEmail},`)}
      ${p(`We've added you to the waitlist for <strong>${safeTitle}</strong>. If a spot opens up, we'll notify you right away — so keep an eye on your inbox.`)}
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('pin', 'Event:', safeTitle)}
          ${listItem('✉️', 'Waitlist email:', safeEmail)}
        </table>
      `)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('View Event Details', `${SITE.url}/events/${eventSlug}`)}
          </td>
        </tr>
      </table>
      ${muted("You'll only receive one notification if a spot becomes available. If you no longer wish to be on the waitlist, you can ignore this email.")}
    `, `You're on the waitlist for ${eventTitle} — we'll notify you if a spot opens`),
    text: `You're on the waitlist\n\nHi ${email},\n\nWe've added you to the waitlist for ${eventTitle}. If a spot opens up, we'll notify you right away.\n\nView event: ${SITE.url}/events/${eventSlug}\n\nYou'll only receive one notification if a spot becomes available.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function donationThankYouEmail(
  donorName: string,
  amountCents: number,
  eventTitle?: string,
  donorMessage?: string,
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(donorName);
  const safeEventTitle = eventTitle ? escapeHtml(eventTitle) : '';
  const safeMessage = donorMessage ? escapeHtml(donorMessage.slice(0, 500)) : '';
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
  const subject = safeEventTitle
    ? `Thank you for supporting ${eventTitle} — ${SITE.shortName}`
    : `Thank you for your donation to ${SITE.shortName}`;
  const intro = safeEventTitle
    ? `Your generous donation of <strong>${amountFormatted}</strong> in support of <strong>${safeEventTitle}</strong> has been received.`
    : `Your generous donation of <strong>${amountFormatted}</strong> to the ${SITE.name} has been received.`;
  const goldBoxBody = safeEventTitle
    ? `Your gift goes directly toward making <strong>${safeEventTitle}</strong> a success and amplifying the service projects this event supports — thank you for being part of it.`
    : `Your gift goes directly toward the service projects, community events, and partnerships that define Rotaract NYC. Every dollar amplifies our impact — locally and around the world.`;

  // Optional "your note" block — quoted card so the donor sees what they sent.
  const noteBlock = safeMessage
    ? `
      <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Your note</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-left: 3px solid ${CRIMSON}; background: ${GRAY_BG}; border-radius: 6px;">
        <tr>
          <td style="padding: 14px 18px; color: ${TEXT_BODY}; font-size: 14px; line-height: 1.7; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            &ldquo;${safeMessage.replace(/\n/g, '<br/>')}&rdquo;
          </td>
        </tr>
      </table>`
    : '';

  return {
    subject,
    html: wrapTemplate(`
      ${h1(`Thank you, ${safeName}.`)}
      ${p(intro)}
      ${goldBox(`
        <p style="color: ${TEXT_BODY}; font-size: 14px; line-height: 1.7; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${goldBoxBody}</p>
      `)}
      ${noteBlock}
      <p style="color: ${TEXT_MUTED}; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Your donation supports</p>
      ${infoCard(`
        <table role="presentation" cellpadding="0" cellspacing="0">
          ${listItem('•', 'Food drives', '& meal distribution programs')}
          ${listItem('•', 'Park cleanups', '& neighborhood beautification')}
          ${listItem('•', 'Educational programs', 'for underserved youth')}
          ${listItem('•', 'International service', 'initiatives & global partnerships')}
        </table>
      `)}
      ${p(`Thank you for being part of our mission to create positive change in New York City and beyond.`)}
      ${muted(`Questions about your donation? Contact us at <a href="mailto:${SITE.email}" style="color: ${CRIMSON};">${SITE.email}</a>.`)}
    `, `Your ${amountFormatted} donation${eventTitle ? ` toward ${eventTitle}` : ''} to ${SITE.name} has been received — thank you!`),
    text: `Thank you, ${donorName}.\n\nYour generous donation of ${amountFormatted}${eventTitle ? ` in support of ${eventTitle}` : ` to the ${SITE.name}`} has been received.\n${donorMessage ? `\nYour note: "${donorMessage.slice(0, 500)}"\n` : ''}\nYour gift supports:\n- Food drives & meal distribution programs\n- Park cleanups & neighborhood beautification\n- Educational programs for underserved youth\n- International service initiatives & global partnerships\n\nThank you for being part of our mission.\n\nQuestions? Email us at ${SITE.email}.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

// ── Weekly Event Digest (board only) ───────────────────────────────────────

export interface DigestEventRow {
  id: string;
  title: string;
  slug: string;
  /** Pre-formatted human date, e.g. "Saturday, June 6, 2026". */
  dateLabel: string;
  /** ISO date string for sorting. */
  isoDate: string;
  /** Days from now (negative for past, 0 for today). */
  daysFromNow: number;
  location?: string;
  totals: {
    members: number;
    guests: number;
    tickets: number;
    revenueCents: number;
    checkedIn: number;
    totalAttendees: number;
    /** Aggregate donations attributed to this event (Stripe webhook). */
    donationsTotalCents: number;
    donationsCount: number;
  };
  /** Delta vs. last digest. Zero when first observed. */
  delta: {
    rsvps: number;
    tickets: number;
    revenueCents: number;
    donationsTotalCents: number;
    donationsCount: number;
  };
  /** True if a PDF roster is attached for this event. */
  pdfAttached: boolean;
  /** True if the event has already ended (post-event recap). */
  isPastRecap: boolean;
}

function fmtDelta(n: number): string {
  if (n > 0) return `<span style="color:#065f46;font-weight:700;">▲ +${n}</span>`;
  if (n < 0) return `<span style="color:#991b1b;font-weight:700;">▼ ${n}</span>`;
  return `<span style="color:${TEXT_SUBTLE};">—</span>`;
}

function fmtMoneyDelta(cents: number): string {
  const sign = cents >= 0 ? '+' : '−';
  const abs = Math.abs(cents);
  const display = `${sign}$${(abs / 100).toFixed(2)}`;
  if (cents > 0) return `<span style="color:#065f46;font-weight:700;">▲ ${display}</span>`;
  if (cents < 0) return `<span style="color:#991b1b;font-weight:700;">▼ ${display}</span>`;
  return `<span style="color:${TEXT_SUBTLE};">—</span>`;
}

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function digestEventCard(row: DigestEventRow): string {
  const tagBg = row.isPastRecap ? '#374151' : CRIMSON;
  const tagLabel = row.isPastRecap
    ? 'Post-event recap'
    : row.daysFromNow <= 0
      ? 'Today'
      : row.daysFromNow === 1
        ? 'Tomorrow'
        : `In ${row.daysFromNow} days`;
  const safeTitle = escapeHtml(row.title);
  const safeLoc = row.location ? escapeHtml(row.location) : '';
  const portalLink = `${SITE.url}/portal/events/${row.id}/attendees`;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 18px; border: 1px solid ${GRAY_BORDER}; border-radius: 10px; overflow: hidden;">
      <tr>
        <td style="background:${tagBg}; color:#fff; padding: 6px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;">
          ${tagLabel}${row.pdfAttached ? ' &nbsp;·&nbsp; PDF attached' : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 18px; background:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <p style="margin:0 0 4px; font-size: 16px; font-weight: 700; color:${TEXT_DARK};">
            <a href="${portalLink}" style="color:${TEXT_DARK}; text-decoration:none;">${safeTitle}</a>
          </p>
          <p style="margin:0 0 12px; font-size: 13px; color:${TEXT_MUTED};">
            ${escapeHtml(row.dateLabel)}${safeLoc ? ` · ${safeLoc}` : ''}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0; font-size:13px; color:${TEXT_BODY};">
                <strong style="color:${TEXT_DARK};">${row.totals.totalAttendees}</strong> RSVPs
                (${row.totals.members} members · ${row.totals.guests} guests)
                &nbsp; ${fmtDelta(row.delta.rsvps)}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:${TEXT_BODY};">
                <strong style="color:${TEXT_DARK};">${row.totals.tickets}</strong> tickets
                &nbsp; ${fmtDelta(row.delta.tickets)}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0; font-size:13px; color:${TEXT_BODY};">
                <strong style="color:${TEXT_DARK};">${fmtMoney(row.totals.revenueCents)}</strong> ticket revenue
                &nbsp; ${fmtMoneyDelta(row.delta.revenueCents)}
              </td>
            </tr>
            ${row.totals.donationsCount > 0 || row.delta.donationsTotalCents !== 0 ? `
            <tr>
              <td style="padding:6px 0; font-size:13px; color:${TEXT_BODY};">
                <strong style="color:${TEXT_DARK};">${fmtMoney(row.totals.donationsTotalCents)}</strong> donations
                (${row.totals.donationsCount} ${row.totals.donationsCount === 1 ? 'gift' : 'gifts'})
                &nbsp; ${fmtMoneyDelta(row.delta.donationsTotalCents)}
              </td>
            </tr>` : ''}
            ${row.isPastRecap ? `
            <tr>
              <td style="padding:6px 0; font-size:13px; color:${TEXT_BODY};">
                <strong style="color:${TEXT_DARK};">${row.totals.checkedIn}</strong> checked in
                ${row.totals.totalAttendees > 0
                  ? `(${Math.round((row.totals.checkedIn / row.totals.totalAttendees) * 100)}%)`
                  : ''}
              </td>
            </tr>` : ''}
          </table>
          <p style="margin:12px 0 0; font-size:12px;">
            <a href="${portalLink}" style="color:${CRIMSON}; font-weight:600; text-decoration:none;">Open roster →</a>
          </p>
        </td>
      </tr>
    </table>`;
}

export function weeklyEventDigestEmail(params: {
  recipientName: string;
  weekLabel: string;          // e.g. "Week of May 4, 2026"
  upcoming: DigestEventRow[];
  past: DigestEventRow[];     // post-event recaps
  attachmentCount: number;
}): { subject: string; html: string; text: string } {
  const { recipientName, weekLabel, upcoming, past, attachmentCount } = params;
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName.split(' ')[0])},` : 'Hi board,';

  const upcomingHtml = upcoming.length > 0
    ? upcoming.map(digestEventCard).join('')
    : `<p style="color:${TEXT_MUTED}; font-size:14px; margin: 8px 0 24px;">No upcoming events in the next 30 days.</p>`;

  const pastHtml = past.length > 0
    ? `
      <p style="color:${TEXT_MUTED}; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin:24px 0 8px;">Last 7 days</p>
      ${past.map(digestEventCard).join('')}` : '';

  const totalAttendees = upcoming.reduce((s, e) => s + e.totals.totalAttendees, 0);
  const totalRevenue = upcoming.reduce((s, e) => s + e.totals.revenueCents, 0);
  const totalDonations = [...upcoming, ...past].reduce((s, e) => s + e.totals.donationsTotalCents, 0);
  const totalDonationCount = [...upcoming, ...past].reduce((s, e) => s + e.totals.donationsCount, 0);

  return {
    subject: `${SITE.shortName} — Weekly Event Digest (${weekLabel})`,
    html: wrapTemplate(`
      ${h1('Weekly Event Digest')}
      ${p(`${greeting} here's your Monday rundown of club events. ${attachmentCount > 0 ? `<strong>${attachmentCount}</strong> attendee roster${attachmentCount === 1 ? '' : 's'} attached.` : ''}`)}
      ${infoCard(`
        <p style="margin:0 0 4px; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:${TEXT_MUTED};">${escapeHtml(weekLabel)}</p>
        <p style="margin:0; font-size:15px; color:${TEXT_DARK};">
          <strong>${upcoming.length}</strong> upcoming event${upcoming.length === 1 ? '' : 's'}
          &nbsp;·&nbsp; <strong>${totalAttendees}</strong> RSVPs
          &nbsp;·&nbsp; <strong>${fmtMoney(totalRevenue)}</strong> projected ticket revenue
          ${totalDonationCount > 0
            ? `&nbsp;·&nbsp; <strong>${fmtMoney(totalDonations)}</strong> in donations (${totalDonationCount})`
            : ''}
        </p>
      `)}

      <p style="color:${TEXT_MUTED}; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin:24px 0 8px;">Upcoming</p>
      ${upcomingHtml}
      ${pastHtml}

      ${muted(`Deltas (▲ / ▼) compare to last Monday's digest. Manage which emails you receive in <a href="${SITE.url}/portal/settings" style="color:${CRIMSON};">portal settings</a>.`)}
    `, `Weekly event digest — ${upcoming.length} upcoming event${upcoming.length === 1 ? '' : 's'}, ${totalAttendees} RSVPs.`),
    text:
      `Weekly Event Digest — ${weekLabel}\n\n` +
      `${upcoming.length} upcoming event(s), ${totalAttendees} RSVPs, ${fmtMoney(totalRevenue)} projected ticket revenue` +
      `${totalDonationCount > 0 ? `, ${fmtMoney(totalDonations)} in donations (${totalDonationCount})` : ''}.\n\n` +
      upcoming.map((e) => (
        `• ${e.title} — ${e.dateLabel}\n` +
        `  ${e.totals.totalAttendees} RSVPs (Δ ${e.delta.rsvps >= 0 ? '+' : ''}${e.delta.rsvps}) · ` +
        `${e.totals.tickets} tickets · ${fmtMoney(e.totals.revenueCents)} revenue` +
        `${e.totals.donationsCount > 0 ? ` · ${fmtMoney(e.totals.donationsTotalCents)} donations (${e.totals.donationsCount})` : ''}` +
        (e.pdfAttached ? '  [PDF attached]' : '')
      )).join('\n\n') +
      (past.length > 0
        ? `\n\nPost-event recaps:\n` + past.map((e) =>
            `• ${e.title} — ${e.dateLabel}: ${e.totals.checkedIn}/${e.totals.totalAttendees} checked in, ${fmtMoney(e.totals.revenueCents)} revenue` +
            `${e.totals.donationsCount > 0 ? `, ${fmtMoney(e.totals.donationsTotalCents)} donations (${e.totals.donationsCount})` : ''}`
          ).join('\n')
        : '') +
      `\n\nManage notifications: ${SITE.url}/portal/settings\n\n--\n${SITE.name}`,
  };
}

// ── Gala 2026 invite templates ─────────────────────────────────────────────
//
// Two flavors of the same outreach, sent ahead of the 2026 Fundraiser Gala
// (30th-year celebration):
//
//   1. galaInvitePastAttendeeEmail — for the curated list of 2023 + 2025
//      gala attendees ("welcome back" angle).
//   2. galaInviteMemberEmail — for current members & alumni who did NOT
//      attend in 2025 ("this is your club's night" angle).
//
// Both render a hero poster image (hosted publicly so most clients inline
// it) and a primary "Reserve your seat" CTA. The send script
// (scripts/send-gala-invites.ts) also attaches the poster as a .jpg so
// recipients can save / forward it.

interface GalaInviteParams {
  /** Recipient first name. Used in the greeting. */
  firstName: string;
  /** Public URL to the ticketing page (event page on rotaractnyc.org). */
  ticketUrl: string;
  /** Optional donation URL for the "can't make it" line. */
  donateUrl?: string;
  /**
   * Display-ready event details. All optional — sane defaults are used
   * if omitted so the script can fire off without wiring everything up.
   */
  eventDate?: string;   // e.g. "Saturday, June 6, 2026"
  eventTime?: string;   // e.g. "7:00 PM – 11:00 PM"
  eventVenue?: string;  // e.g. "Rooftop @ The Press Lounge, NYC"
  /**
   * Public URL of the poster image to render inline at the top of the
   * email. Defaults to /rotaract-gala-2026-poster.jpg on the marketing
   * site. The same file is also attached to the message.
   */
  posterUrl?: string;
}

const GALA_DEFAULTS = {
  eventDate: 'Saturday, June 6, 2026',
  eventTime: '7:00 PM – 11:00 PM',
  eventVenue: 'New York City — venue details on the event page',
  posterPath: '/rotaract-gala-2026-poster.jpg',
} as const;

/** Hero poster block — full-width, framed, with a subtle gold rule below. */
function galaPosterBlock(posterUrl: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
      <tr>
        <td style="text-align: center;">
          <img src="${posterUrl}" alt="Rotaract NYC Gala 2026 — 30th Year Celebration"
               width="520"
               style="display: block; width: 100%; max-width: 520px; height: auto; border-radius: 12px; border: 1px solid ${GRAY_BORDER};" />
        </td>
      </tr>
      <tr>
        <td style="padding-top: 12px;">
          <div style="height: 2px; background: linear-gradient(90deg, transparent, ${GOLD}, transparent);"></div>
        </td>
      </tr>
    </table>`;
}

/** Event details card shared by both gala invite templates. Uses bold
 *  labels rather than inline SVG icons because Gmail (the majority
 *  client among recipients) strips <svg> from emails. */
function galaDetailsCard(date: string, time: string, venue: string): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <span style="display: inline-block; min-width: 72px; color: ${CRIMSON}; font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;">${label}</span>
        <span style="color: ${TEXT_DARK}; font-size: 14px;">${value}</span>
      </td>
    </tr>`;
  return infoCard(`
    <p style="margin: 0 0 12px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${CRIMSON};">
      The 2026 Rotaract NYC Gala
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${row('When', `${escapeHtml(date)} · ${escapeHtml(time)}`)}
      ${row('Where', escapeHtml(venue))}
      ${row('Tickets', 'Early-bird pricing open now — limited seats')}
    </table>
  `);
}

/**
 * "Welcome back" invite for prior gala attendees (2023 & 2025).
 *
 * Pre-suppression of 2026 ticket buyers must happen BEFORE this is sent
 * (handled by scripts/send-gala-invites.ts).
 */
export function galaInvitePastAttendeeEmail(
  params: GalaInviteParams,
): { subject: string; html: string; text: string } {
  const firstName = params.firstName?.trim() || 'there';
  const safeName = escapeHtml(firstName.split(' ')[0]);
  const date = params.eventDate ?? GALA_DEFAULTS.eventDate;
  const time = params.eventTime ?? GALA_DEFAULTS.eventTime;
  const venue = params.eventVenue ?? GALA_DEFAULTS.eventVenue;
  const posterUrl = params.posterUrl ?? `${SITE.url}${GALA_DEFAULTS.posterPath}`;
  const ticketUrl = params.ticketUrl;
  const donateUrl = params.donateUrl ?? `${SITE.url}/donate`;

  const subject = `You made last year's gala unforgettable — let's do it again`;
  const preview =
    `Thank you for joining us in 2025. The 2026 Rotaract NYC Gala is on — reserve your seat.`;

  return {
    subject,
    html: wrapTemplate(`
      ${h1(`Hi ${safeName} — we're back.`)}
      ${p(`Thank you again for joining us at a previous <strong>Rotaract NYC Gala</strong>. Your support helped fund our service projects across the city this past year — from community meals to ShelterBox disaster relief.`)}
      ${p(`We'd love to have you with us again as we celebrate <strong>30 years</strong> of the Rotaract Club at the United Nations.`)}
      ${galaDetailsCard(date, time, venue)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 24px;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Reserve Your Seat', ticketUrl)}
          </td>
        </tr>
      </table>
      ${p(`Each ticket includes entry, appetizers, and a complimentary drink. Dress code is semi-formal. Bringing a guest? They're more than welcome — please grab them their own ticket at the same link above.`)}
      ${goldBox(`
        <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: ${TEXT_DARK};">Can't make it this year?</p>
        <p style="margin: 0; font-size: 13px; color: ${TEXT_BODY};">
          You can still <a href="${donateUrl}" style="color: ${CRIMSON}; font-weight: 600; text-decoration: none;">support the cause with a donation</a> — every dollar goes directly to our community programs.
        </p>
      `)}
      ${muted(`Already grabbed your ticket? Please ignore this — and thank you.<br/>Questions? Just reply to this email or DM <a href="${SITE.social.instagram}" style="color: ${CRIMSON};">@rotaractnyc</a>.`)}
    `, preview),
    text:
      `Hi ${firstName} — we're back.\n\n` +
      `Thank you again for joining us at a previous Rotaract NYC Gala. Your support helped fund our service projects across the city this past year.\n\n` +
      `We'd love to have you with us again as we celebrate 30 years of the Rotaract Club at the United Nations.\n\n` +
      `THE 2026 ROTARACT NYC GALA\n` +
      `When:   ${date} · ${time}\n` +
      `Where:  ${venue}\n` +
      `Tickets: Early-bird pricing open now — limited seats\n\n` +
      `Reserve your seat: ${ticketUrl}\n\n` +
      `Each ticket includes entry, appetizers, and a complimentary drink. Dress code is semi-formal. Bringing a guest? They're welcome — please grab them their own ticket at the link above.\n\n` +
      `Can't make it? You can still support the cause with a donation: ${donateUrl}\n\n` +
      `Already grabbed your ticket? Please ignore this — and thank you.\n\n` +
      `Questions? Reply to this email or DM @rotaractnyc on Instagram.\n\n` +
      `--\n${SITE.name}\n${SITE.address}`,
  };
}

/**
 * Members & alumni invite — same event, different framing
 * (community / "your club's night" angle rather than nostalgia).
 */
export function galaInviteMemberEmail(
  params: GalaInviteParams & {
    /** If true, opens with the "alumni" framing instead of "member". */
    alumni?: boolean;
  },
): { subject: string; html: string; text: string } {
  const firstName = params.firstName?.trim() || 'there';
  const safeName = escapeHtml(firstName.split(' ')[0]);
  const date = params.eventDate ?? GALA_DEFAULTS.eventDate;
  const time = params.eventTime ?? GALA_DEFAULTS.eventTime;
  const venue = params.eventVenue ?? GALA_DEFAULTS.eventVenue;
  const posterUrl = params.posterUrl ?? `${SITE.url}${GALA_DEFAULTS.posterPath}`;
  const ticketUrl = params.ticketUrl;
  const donateUrl = params.donateUrl ?? `${SITE.url}/donate`;
  const isAlumni = !!params.alumni;

  const subject = isAlumni
    ? `${safeName}, come back for one night — the 2026 Rotaract NYC Gala`
    : `Your invitation: the 2026 Rotaract NYC Gala`;
  const preview = isAlumni
    ? `30 years of Rotaract NYC. One night to celebrate. We'd love to see you there.`
    : `One night a year, the whole Rotaract NYC family comes together. This is it.`;

  const opener = isAlumni
    ? `${p(`It's been a minute — and that's exactly why we're writing. <strong>${SITE.name}</strong> is turning <strong>30</strong>, and we want the alumni who built this club in the room with us.`)}`
    : `${p(`One night a year, the entire <strong>Rotaract NYC</strong> family — current members, alumni, partners, and friends — comes together to celebrate what we've built and raise the funds that make next year possible.`)}` +
      `${p(`This is that night, and as a member, this is <strong>your</strong> night.`)}`;

  return {
    subject,
    html: wrapTemplate(`
      ${h1(`Hi ${safeName},`)}
      ${opener}
      ${galaDetailsCard(date, time, venue)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 24px;">
        <tr>
          <td style="text-align: center;">
            ${ctaButton('Get Your Ticket', ticketUrl)}
          </td>
        </tr>
      </table>
      ${p(isAlumni
        ? `Whether you've been gone a year or a decade, you'll recognize the room. Rally your friends or invite a guest — they're welcome to grab a ticket at the same link above — and help us mark 30 years the right way.`
        : `Rally your friends, invite a guest (they'll need their own ticket), or just come catch up with the crew — every seat filled is another dollar toward our service work in NYC.`
      )}
      ${goldBox(`
        <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: ${TEXT_DARK};">Can't make it?</p>
        <p style="margin: 0; font-size: 13px; color: ${TEXT_BODY};">
          You can still <a href="${donateUrl}" style="color: ${CRIMSON}; font-weight: 600; text-decoration: none;">donate or sponsor a guest's ticket</a> — every contribution funds our community programs.
        </p>
      `)}
      ${muted(`Already grabbed your ticket? Please ignore this — and thank you.<br/>Questions? Just reply to this email.`)}
    `, preview),
    text:
      `Hi ${firstName},\n\n` +
      (isAlumni
        ? `It's been a minute — and that's exactly why we're writing. ${SITE.name} is turning 30, and we want the alumni who built this club in the room with us.\n\n`
        : `One night a year, the entire Rotaract NYC family — current members, alumni, partners, and friends — comes together to celebrate what we've built and raise the funds that make next year possible.\n\nThis is that night, and as a member, this is your night.\n\n`) +
      `THE 2026 ROTARACT NYC GALA\n` +
      `When:   ${date} · ${time}\n` +
      `Where:  ${venue}\n` +
      `Tickets: Early-bird pricing open now — limited seats\n\n` +
      `Get your ticket: ${ticketUrl}\n\n` +
      `Can't make it? You can still donate or sponsor a guest: ${donateUrl}\n\n` +
      `Already grabbed your ticket? Please ignore this — and thank you.\n\n` +
      `--\n${SITE.name}\n${SITE.address}`,
  };
}
