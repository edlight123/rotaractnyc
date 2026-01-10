import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { DEFAULT_SETTINGS } from '@/lib/content/settings'
import { isResendConfigured, sendContactEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string
        email?: string
        subject?: string
        message?: string
      }
    | null

  const name = (body?.name || '').trim()
  const email = (body?.email || '').trim()
  const subject = (body?.subject || '').trim()
  const message = (body?.message || '').trim()

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const ref = await db.collection('messages').add({
    name,
    email,
    subject,
    message,
    createdAt: FieldValue.serverTimestamp(),
  })

  let emailSent = false
  if (isResendConfigured()) {
    const from = process.env.RESEND_FROM as string
    const to = process.env.RESEND_CONTACT_TO || process.env.CONTACT_TO || DEFAULT_SETTINGS.contactEmail

    try {
      await sendContactEmail({
        from,
        to,
        replyTo: email,
        subject,
        name,
        email,
        message,
        messageId: ref.id,
      })
      emailSent = true
    } catch (err) {
      console.error('Resend contact email failed', err)
    }
  }

  return NextResponse.json({ ok: true, id: ref.id, emailSent })
}
