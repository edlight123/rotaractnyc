// Email template utilities
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

const defaultFrom = 'Rotaract NYC <no-reply@rotaractnyc.org>'

export const emailTemplates = {
  // Welcome email for new members
  welcome: (memberName: string, loginUrl: string): EmailTemplate => ({
    to: '',
    subject: 'Welcome to Rotaract NYC!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome to Rotaract NYC</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0085c7, #003a70); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #0085c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Rotaract NYC!</h1>
            <p>Service Above Self</p>
          </div>
          <div class="content">
            <p>Hi ${memberName},</p>
            <p>Welcome to the Rotaract Club at the United Nations! We're excited to have you join our community of young professionals dedicated to service, leadership, and fellowship.</p>
            
            <h3>What's Next?</h3>
            <ul>
              <li><strong>Access Your Member Portal:</strong> Get exclusive access to events, announcements, and member resources</li>
              <li><strong>Join Our Events:</strong> Check out upcoming meetings, service projects, and social gatherings</li>
              <li><strong>Connect:</strong> Meet fellow members and start making a difference together</li>
            </ul>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Access Member Portal</a>
            </div>

            <p>If you have any questions, don't hesitate to reach out to our membership chair or visit our website.</p>
            
            <p>Welcome to the Rotaract family!</p>
            <p><strong>The Rotaract NYC Team</strong></p>
          </div>
          <div class="footer">
            <p>Rotaract Club at the United Nations<br>
            New York, NY | <a href="https://rotaractnyc.org">rotaractnyc.org</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    from: defaultFrom,
  }),

  // Event reminder
  eventReminder: (memberName: string, eventTitle: string, eventDate: string, eventLocation: string): EmailTemplate => ({
    to: '',
    subject: `Reminder: ${eventTitle} - Tomorrow!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0085c7; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; }
          .event-card { background: #f8f9fa; border-left: 4px solid #0085c7; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; background: #D9A440; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Event Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${memberName},</p>
            <p>Just a friendly reminder about our upcoming event tomorrow!</p>
            
            <div class="event-card">
              <h3>${eventTitle}</h3>
              <p><strong>📅 When:</strong> ${eventDate}</p>
              <p><strong>📍 Where:</strong> ${eventLocation}</p>
            </div>

            <p>We're looking forward to seeing you there! If you haven't RSVP'd yet, please do so in the member portal.</p>
            
            <div style="text-align: center;">
              <a href="https://rotaractnyc.org/portal/events" class="button">View Event Details</a>
            </div>

            <p>See you soon!</p>
            <p><strong>Rotaract NYC</strong></p>
          </div>
        </div>
      </body>
      </html>
    `,
    from: defaultFrom,
  }),

  // Monthly newsletter
  newsletter: (memberName: string, monthlyHighlights: string, upcomingEvents: string): EmailTemplate => ({
    to: '',
    subject: 'Rotaract NYC Monthly Newsletter',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0085c7, #D9A440); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; }
          .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 6px; }
          .button { display: inline-block; background: #0085c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 Monthly Newsletter</h1>
            <p>Your monthly dose of Rotaract NYC updates</p>
          </div>
          <div class="content">
            <p>Hi ${memberName},</p>
            
            <div class="section">
              <h3>🌟 This Month's Highlights</h3>
              ${monthlyHighlights}
            </div>

            <div class="section">
              <h3>📅 Upcoming Events</h3>
              ${upcomingEvents}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://rotaractnyc.org/events" class="button">View All Events</a>
              <a href="https://rotaractnyc.org/portal" class="button">Member Portal</a>
            </div>

            <p>Thank you for being part of our Rotaract community!</p>
            <p><strong>Rotaract NYC Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `,
    from: defaultFrom,
  }),
}

// Send email utility
export async function sendEmail(template: EmailTemplate) {
  try {
    const result = await resend.emails.send({
      from: template.from || defaultFrom,
      to: template.to,
      subject: template.subject,
      html: template.html,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

// Batch send emails
export async function sendBatchEmails(templates: EmailTemplate[]) {
  const results = await Promise.allSettled(
    templates.map(template => sendEmail(template))
  )
  return results
}