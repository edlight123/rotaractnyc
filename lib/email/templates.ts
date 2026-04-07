/**
 * Email HTML templates for Rotaract NYC.
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

const baseStyle = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 0;
`;

const headerHtml = `
  <div style="background-color: #9B1B30; padding: 32px 24px; text-align: center;">
    <img src="${SITE.url}/rotaract-logo.png" alt="${SITE.shortName}" width="200" height="50" style="height: 50px; width: auto; filter: brightness(0) invert(1);" />
    <p style="color: #EBC85B; font-size: 13px; margin: 12px 0 0; letter-spacing: 1px;">${SITE.motto}</p>
  </div>
`;

const footerHtml = `
  <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">${SITE.name}</p>
    <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0;">${SITE.address}</p>
    <p style="color: #9ca3af; font-size: 11px; margin: 4px 0 0;">
      <a href="${SITE.url}" style="color: #9B1B30; text-decoration: none;">rotaractnyc.org</a>
    </p>
  </div>
`;

function wrapTemplate(body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="${baseStyle}">
        ${headerHtml}
        <div style="background-color: #ffffff; padding: 32px 24px;">
          ${body}
        </div>
        ${footerHtml}
      </div>
    </body>
    </html>
  `;
}

// ── Templates ──

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
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">New Contact Form Submission</h2>
      <p style="color: #374151; margin: 0 0 8px;"><strong>From:</strong> ${name} (${email})</p>
      <p style="color: #374151; margin: 0 0 8px;"><strong>Subject:</strong> ${subject}</p>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px;">
        <p style="color: #374151; margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
    `),
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
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">New Membership Interest</h2>
      <p style="color: #374151; margin: 0 0 8px;"><strong>Name:</strong> ${name}</p>
      <p style="color: #374151; margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
      ${phone ? `<p style="color: #374151; margin: 0 0 8px;"><strong>Phone:</strong> ${phone}</p>` : ''}
      ${message ? `<div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px;"><p style="color: #374151; margin: 0;">${message}</p></div>` : ''}
    `),
    text: `New Membership Interest\n\nName: ${data.name}\nEmail: ${data.email}${data.phone ? `\nPhone: ${data.phone}` : ''}${data.message ? `\n\n${data.message}` : ''}\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function welcomeEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `Welcome to ${SITE.shortName}! 🎉`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Welcome, ${safeName}!</h2>
      <p style="color: #374151; margin: 0 0 12px;">You are now a member of the ${SITE.name}. We're thrilled to have you join our community!</p>
      <p style="color: #374151; margin: 0 0 12px;">Here's what you can do next:</p>
      <ul style="color: #374151; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Complete your <a href="${SITE.url}/portal/profile" style="color: #9B1B30;">member profile</a></li>
        <li style="margin-bottom: 8px;">Check out <a href="${SITE.url}/portal/events" style="color: #9B1B30;">upcoming events</a></li>
        <li style="margin-bottom: 8px;">Pay your <a href="${SITE.url}/portal/dues" style="color: #9B1B30;">annual dues</a></li>
        <li style="margin-bottom: 8px;">Connect with other members in the <a href="${SITE.url}/portal/directory" style="color: #9B1B30;">directory</a></li>
      </ul>
      <p style="color: #374151; margin: 16px 0 0;">We meet ${SITE.meetingSchedule} at ${SITE.address}. See you there!</p>
    `),
    text: `Welcome, ${name}!\n\nYou are now a member of the ${SITE.name}. We're thrilled to have you join our community!\n\nHere's what you can do next:\n- Complete your member profile: ${SITE.url}/portal/profile\n- Check out upcoming events: ${SITE.url}/portal/events\n- Pay your annual dues: ${SITE.url}/portal/dues\n- Connect with other members: ${SITE.url}/portal/directory\n\nWe meet ${SITE.meetingSchedule} at ${SITE.address}. See you there!\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function inviteEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `You're invited to join ${SITE.shortName}! 🎉`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">You're Invited, ${safeName}!</h2>
      <p style="color: #374151; margin: 0 0 12px;">You've been invited to join the ${SITE.name} member portal. Sign in to complete your profile and become an active member.</p>
      <p style="color: #374151; margin: 0 0 12px;">Here's what to expect:</p>
      <ol style="color: #374151; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Click the button below to sign in with your Google account</li>
        <li style="margin-bottom: 8px;">Complete a short profile setup (name, phone, photo, etc.)</li>
        <li style="margin-bottom: 8px;">Choose your membership type and pay your annual dues</li>
        <li style="margin-bottom: 8px;">Start exploring events, connecting with members, and more!</li>
      </ol>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/login" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Sign In & Get Started</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0;">Please sign in using the same email address this invitation was sent to (<strong>${safeName}</strong>'s email on file). This ensures your profile is linked correctly.</p>
    `),
    text: `You're Invited, ${name}!\n\nYou've been invited to join the ${SITE.name} member portal. Sign in to complete your profile and become an active member.\n\nHere's what to expect:\n1. Sign in with your Google account at ${SITE.url}/portal/login\n2. Complete a short profile setup (name, phone, photo, etc.)\n3. Choose your membership type and pay your annual dues\n4. Start exploring events, connecting with members, and more!\n\nPlease sign in using the same email address this invitation was sent to (${name}'s email on file).\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function duesReminderEmail(name: string, amount: string, cycleName: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeAmount = escapeHtml(amount);
  const safeCycle = escapeHtml(cycleName);

  return {
    subject: `Dues Reminder — ${cycleName}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Dues Reminder</h2>
      <p style="color: #374151; margin: 0 0 12px;">Hi ${safeName},</p>
      <p style="color: #374151; margin: 0 0 12px;">Your annual dues of <strong>${safeAmount}</strong> for the ${safeCycle} Rotary year are due. Please pay at your earliest convenience to maintain your active membership.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/dues" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Pay Dues Now</a>
      </div>
    `),
    text: `Dues Reminder\n\nHi ${name},\n\nYour annual dues of ${amount} for the ${cycleName} Rotary year are due. Please pay at your earliest convenience to maintain your active membership.\n\nPay now: ${SITE.url}/portal/dues\n\n--\n${SITE.name}\n${SITE.address}`,
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
  const safeDate = escapeHtml(event.date);
  const safeTime = escapeHtml(event.time);
  const safeLocation = escapeHtml(event.location);

  return {
    subject: `Reminder: ${event.title}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Event Reminder</h2>
      <p style="color: #374151; margin: 0 0 12px;">Hi ${safeName},</p>
      <p style="color: #374151; margin: 0 0 12px;">This is a reminder about an upcoming event:</p>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 4px solid #9B1B30;">
        <h3 style="color: #111827; margin: 0 0 8px;">${safeTitle}</h3>
        <p style="color: #6b7280; margin: 0 0 4px;">📅 ${safeDate} at ${safeTime}</p>
        <p style="color: #6b7280; margin: 0;">📍 ${safeLocation}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/events" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Event</a>
      </div>
    `),
    text: `Event Reminder\n\nHi ${name},\n\nThis is a reminder about an upcoming event:\n\n${event.title}\n📅 ${event.date} at ${event.time}\n📍 ${event.location}\n\nView event: ${SITE.url}/portal/events\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

// ── Onboarding Sequence Templates ──

export function profileReminderEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `Complete your profile — ${SITE.shortName}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Hey ${safeName}, your profile is waiting! 👋</h2>
      <p style="color: #374151; margin: 0 0 12px;">We noticed you haven't finished setting up your member profile yet. A complete profile helps other members get to know you and makes it easier to connect.</p>
      <p style="color: #374151; margin: 0 0 12px;">It only takes a couple of minutes — add a photo, a short bio, and your interests so the community can welcome you properly.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/profile" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Your Profile</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0;">If you've already completed your profile, feel free to ignore this email.</p>
    `),
    text: `Hey ${name}, your profile is waiting!\n\nWe noticed you haven't finished setting up your member profile yet. A complete profile helps other members get to know you and makes it easier to connect.\n\nIt only takes a couple of minutes — add a photo, a short bio, and your interests so the community can welcome you properly.\n\nComplete your profile: ${SITE.url}/portal/profile\n\nIf you've already completed your profile, feel free to ignore this email.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function duesNudgeEmail(name: string, amount: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const safeAmount = escapeHtml(amount);

  return {
    subject: `Don't forget your dues — ${SITE.shortName}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">A quick reminder about dues, ${safeName} 💳</h2>
      <p style="color: #374151; margin: 0 0 12px;">We wanted to remind you that your annual membership dues of <strong>${safeAmount}</strong> haven't been paid yet.</p>
      <p style="color: #374151; margin: 0 0 12px;">Your dues directly support our service projects, community events, and partnerships. Paying on time ensures you have full access to all member benefits — including event RSVPs, committee participation, and voting rights.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/dues" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Pay Dues Now</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0;">If you've already paid, it may take a moment to process — you can disregard this message.</p>
    `),
    text: `A quick reminder about dues, ${name}\n\nWe wanted to remind you that your annual membership dues of ${amount} haven't been paid yet.\n\nYour dues directly support our service projects, community events, and partnerships. Paying on time ensures you have full access to all member benefits — including event RSVPs, committee participation, and voting rights.\n\nPay dues now: ${SITE.url}/portal/dues\n\nIf you've already paid, it may take a moment to process — you can disregard this message.\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}

export function oneWeekCheckInEmail(name: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);

  return {
    subject: `How's your first week? — ${SITE.shortName}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">One week in — how's it going, ${safeName}? 🎉</h2>
      <p style="color: #374151; margin: 0 0 12px;">It's been a week since you joined ${SITE.name}, and we hope you're settling in!</p>
      <p style="color: #374151; margin: 0 0 12px;">Here are a couple of ways to make the most of your membership:</p>
      <ul style="color: #374151; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong>Attend an event</strong> — Check out what's coming up and RSVP. It's the best way to meet fellow members.</li>
        <li style="margin-bottom: 8px;"><strong>Browse the directory</strong> — Find members with similar interests, industries, or committees and say hello.</li>
      </ul>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/events" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin-right: 8px;">Browse Events</a>
        <a href="${SITE.url}/portal/directory" style="display: inline-block; background-color: #ffffff; color: #9B1B30; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; border: 2px solid #9B1B30;">Member Directory</a>
      </div>
      <p style="color: #374151; margin: 16px 0 0;">We meet ${SITE.meetingSchedule} — we'd love to see you there!</p>
    `),
    text: `One week in — how's it going, ${name}?\n\nIt's been a week since you joined ${SITE.name}, and we hope you're settling in!\n\nHere are a couple of ways to make the most of your membership:\n\n- Attend an event — Check out what's coming up and RSVP. It's the best way to meet fellow members.\n  ${SITE.url}/portal/events\n\n- Browse the directory — Find members with similar interests, industries, or committees and say hello.\n  ${SITE.url}/portal/directory\n\nWe meet ${SITE.meetingSchedule} — we'd love to see you there!\n\n--\n${SITE.name}\n${SITE.address}`,
  };
}
