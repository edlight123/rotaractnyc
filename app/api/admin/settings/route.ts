import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { DEFAULT_SETTINGS, type SiteSettings } from '@/lib/content/settings'

const DOC_ID = 'site'

function coerceSettings(input: unknown): SiteSettings {
  const obj = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}

  const addressLinesRaw = obj.addressLines
  const addressLines = Array.isArray(addressLinesRaw)
    ? addressLinesRaw.map((x) => String(x)).filter(Boolean)
    : DEFAULT_SETTINGS.addressLines

  return {
    contactEmail: String(obj.contactEmail ?? DEFAULT_SETTINGS.contactEmail),
    addressLines,
    facebookUrl: String(obj.facebookUrl ?? DEFAULT_SETTINGS.facebookUrl),
    instagramUrl: String(obj.instagramUrl ?? DEFAULT_SETTINGS.instagramUrl),
    linkedinUrl: String(obj.linkedinUrl ?? DEFAULT_SETTINGS.linkedinUrl),
    meetingLabel: String(obj.meetingLabel ?? DEFAULT_SETTINGS.meetingLabel),
    meetingTime: String(obj.meetingTime ?? DEFAULT_SETTINGS.meetingTime),
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const db = getFirebaseAdminDb()
  const doc = await db.collection('settings').doc(DOC_ID).get()
  const settings = doc.exists ? coerceSettings(doc.data()) : DEFAULT_SETTINGS

  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body: unknown = await req.json().catch(() => null)
  const settings = coerceSettings(body)

  const db = getFirebaseAdminDb()
  await db
    .collection('settings')
    .doc(DOC_ID)
    .set(
      {
        ...settings,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.email,
      },
      { merge: true }
    )

  return NextResponse.json({ ok: true, settings })
}
