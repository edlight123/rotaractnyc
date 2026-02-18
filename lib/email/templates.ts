/**
 * Email HTML templates for Rotaract NYC.
 */
import { SITE } from '@/lib/constants';

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
}): { subject: string; html: string } {
  return {
    subject: `[Contact] ${data.subject}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">New Contact Form Submission</h2>
      <p style="color: #374151; margin: 0 0 8px;"><strong>From:</strong> ${data.name} (${data.email})</p>
      <p style="color: #374151; margin: 0 0 8px;"><strong>Subject:</strong> ${data.subject}</p>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px;">
        <p style="color: #374151; margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>
    `),
  };
}

export function membershipInterestEmail(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}): { subject: string; html: string } {
  return {
    subject: `[Membership Interest] ${data.name}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">New Membership Interest</h2>
      <p style="color: #374151; margin: 0 0 8px;"><strong>Name:</strong> ${data.name}</p>
      <p style="color: #374151; margin: 0 0 8px;"><strong>Email:</strong> ${data.email}</p>
      ${data.phone ? `<p style="color: #374151; margin: 0 0 8px;"><strong>Phone:</strong> ${data.phone}</p>` : ''}
      ${data.message ? `<div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px;"><p style="color: #374151; margin: 0;">${data.message}</p></div>` : ''}
    `),
  };
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: `Welcome to ${SITE.shortName}! 🎉`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Welcome, ${name}!</h2>
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
  };
}

export function inviteEmail(name: string): { subject: string; html: string } {
  return {
    subject: `You're invited to join ${SITE.shortName}! 🎉`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">You're Invited, ${name}!</h2>
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
      <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0;">Please sign in using the same email address this invitation was sent to (<strong>${name}</strong>'s email on file). This ensures your profile is linked correctly.</p>
    `),
  };
}

export function duesReminderEmail(name: string, amount: string, cycleName: string): { subject: string; html: string } {
  return {
    subject: `Dues Reminder — ${cycleName}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Dues Reminder</h2>
      <p style="color: #374151; margin: 0 0 12px;">Hi ${name},</p>
      <p style="color: #374151; margin: 0 0 12px;">Your annual dues of <strong>${amount}</strong> for the ${cycleName} Rotary year are due. Please pay at your earliest convenience to maintain your active membership.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/dues" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Pay Dues Now</a>
      </div>
    `),
  };
}

export function eventReminderEmail(name: string, event: {
  title: string;
  date: string;
  time: string;
  location: string;
}): { subject: string; html: string } {
  return {
    subject: `Reminder: ${event.title}`,
    html: wrapTemplate(`
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Event Reminder</h2>
      <p style="color: #374151; margin: 0 0 12px;">Hi ${name},</p>
      <p style="color: #374151; margin: 0 0 12px;">This is a reminder about an upcoming event:</p>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 16px 0; border-left: 4px solid #9B1B30;">
        <h3 style="color: #111827; margin: 0 0 8px;">${event.title}</h3>
        <p style="color: #6b7280; margin: 0 0 4px;">📅 ${event.date} at ${event.time}</p>
        <p style="color: #6b7280; margin: 0;">📍 ${event.location}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SITE.url}/portal/events" style="display: inline-block; background-color: #9B1B30; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Event</a>
      </div>
    `),
  };
}
