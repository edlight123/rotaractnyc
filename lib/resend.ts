import { Resend } from 'resend'

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return new Resend(apiKey)
}

function parseRecipientList(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export type SendContactEmailArgs = {
  to: string | string[]
  from: string
  replyTo?: string
  subject: string
  name: string
  email: string
  message: string
  messageId?: string
}

export type SendMembershipApplicationEmailArgs = {
  to: string | string[]
  from: string
  replyTo?: string
  applicant: {
    fullName: string
    email: string
    phone?: string
    membershipType?: string
    location?: string
    occupationOrSchool?: string
    interests?: string
    whyJoin?: string
    hearAboutUs?: string
  }
  applicationId?: string
}

export type SendMemberToMemberMessageArgs = {
  to: string
  from: string
  replyTo: string
  subject: string
  senderName: string
  message: string
}

export async function sendContactEmail(args: SendContactEmailArgs) {
  const resend = getResendClient()

  const to = Array.isArray(args.to) ? args.to : parseRecipientList(args.to)
  if (to.length === 0) {
    throw new Error('No recipient configured for contact email')
  }

  const safeSubject = args.subject.trim() || 'Website contact form'
  const idLine = args.messageId ? `<p><strong>Message ID:</strong> ${escapeHtml(args.messageId)}</p>` : ''

  const html = `
    <div>
      <h2>New website message</h2>
      ${idLine}
      <p><strong>From:</strong> ${escapeHtml(args.name)} (${escapeHtml(args.email)})</p>
      <p><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(args.message)}</pre>
    </div>
  `.trim()

  const text = [
    'New website message',
    args.messageId ? `Message ID: ${args.messageId}` : null,
    `From: ${args.name} (${args.email})`,
    `Subject: ${safeSubject}`,
    '',
    args.message,
  ]
    .filter(Boolean)
    .join('\n')

  return await resend.emails.send({
    from: args.from,
    to,
    subject: `Contact: ${safeSubject}`,
    html,
    text,
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  })
}

export async function sendMembershipApplicationEmail(args: SendMembershipApplicationEmailArgs) {
  const resend = getResendClient()

  const to = Array.isArray(args.to) ? args.to : parseRecipientList(args.to)
  if (to.length === 0) {
    throw new Error('No recipient configured for membership application email')
  }

  const safeName = args.applicant.fullName.trim() || 'Unknown'
  const safeEmail = args.applicant.email.trim() || 'Unknown'
  const idLine = args.applicationId
    ? `<p><strong>Application ID:</strong> ${escapeHtml(args.applicationId)}</p>`
    : ''

  const html = `
    <div>
      <h2>New membership application</h2>
      ${idLine}
      <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(args.applicant.phone || '')}</p>
      <p><strong>Membership type:</strong> ${escapeHtml(args.applicant.membershipType || '')}</p>
      <p><strong>Location:</strong> ${escapeHtml(args.applicant.location || '')}</p>
      <p><strong>Occupation / School:</strong> ${escapeHtml(args.applicant.occupationOrSchool || '')}</p>
      <p><strong>Interests:</strong></p>
      <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(
        args.applicant.interests || ''
      )}</pre>
      <p><strong>Why join:</strong></p>
      <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(
        args.applicant.whyJoin || ''
      )}</pre>
      <p><strong>How they heard about us:</strong></p>
      <pre style="white-space:pre-wrap;word-wrap:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(
        args.applicant.hearAboutUs || ''
      )}</pre>
    </div>
  `.trim()

  const text = [
    'New membership application',
    args.applicationId ? `Application ID: ${args.applicationId}` : null,
    `Name: ${safeName}`,
    `Email: ${safeEmail}`,
    args.applicant.phone ? `Phone: ${args.applicant.phone}` : null,
    args.applicant.membershipType ? `Membership type: ${args.applicant.membershipType}` : null,
    args.applicant.location ? `Location: ${args.applicant.location}` : null,
    args.applicant.occupationOrSchool ? `Occupation/School: ${args.applicant.occupationOrSchool}` : null,
    '',
    args.applicant.interests ? `Interests:\n${args.applicant.interests}` : null,
    '',
    args.applicant.whyJoin ? `Why join:\n${args.applicant.whyJoin}` : null,
    '',
    args.applicant.hearAboutUs ? `How heard about us:\n${args.applicant.hearAboutUs}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return await resend.emails.send({
    from: args.from,
    to,
    subject: `Membership Application: ${safeName}`,
    html,
    text,
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  })
}

export async function sendMemberToMemberMessage(args: SendMemberToMemberMessageArgs) {
  const resend = getResendClient()

  const safeSubject = args.subject.trim() || 'Message from a member'
  const safeSenderName = args.senderName.trim() || 'A member'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Rotaract NYC Portal</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937; margin-top: 0;">You have a new message from ${escapeHtml(safeSenderName)}</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;"><strong>Subject:</strong></p>
          <p style="color: #1f2937; margin: 0 0 20px 0; font-size: 16px;">${escapeHtml(safeSubject)}</p>
          
          <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;"><strong>Message:</strong></p>
          <div style="color: #1f2937; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">
${escapeHtml(args.message)}
          </div>
        </div>
        
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #1e40af; margin: 0; font-size: 14px;">
            <strong>💡 How to reply:</strong> Simply reply to this email to respond directly to ${escapeHtml(safeSenderName)}.
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          This message was sent through the Rotaract NYC member portal. Your email address is kept private and will only be shared with the sender if you reply.
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">Rotaract Club of New York at the United Nations</p>
        <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} All rights reserved</p>
      </div>
    </div>
  `.trim()

  const text = [
    'ROTARACT NYC PORTAL - NEW MESSAGE',
    '',
    `From: ${safeSenderName}`,
    `Subject: ${safeSubject}`,
    '',
    'MESSAGE:',
    '─────────────────────────────────',
    args.message,
    '─────────────────────────────────',
    '',
    `Reply to this email to respond directly to ${safeSenderName}.`,
    '',
    'This message was sent through the Rotaract NYC member portal.',
    'Your email address is kept private and will only be shared with the sender if you reply.',
  ].join('\n')

  return await resend.emails.send({
    from: args.from,
    to: args.to,
    subject: `Rotaract NYC: ${safeSubject}`,
    html,
    text,
    replyTo: args.replyTo,
  })
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
