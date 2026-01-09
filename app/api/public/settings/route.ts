import { NextResponse } from 'next/server'
import { DEFAULT_SETTINGS } from '@/lib/content/settings'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

const DOC_ID = 'site'

export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }

  try {
    const doc = await getFirebaseAdminDb().collection('settings').doc(DOC_ID).get()
    if (!doc.exists) return NextResponse.json({ settings: DEFAULT_SETTINGS })

    const data: unknown = doc.data()
    const obj = typeof data === 'object' && data ? (data as Record<string, unknown>) : {}

    const addressLinesRaw = obj.addressLines
    const addressLines = Array.isArray(addressLinesRaw)
      ? addressLinesRaw.map((x) => String(x)).filter(Boolean)
      : DEFAULT_SETTINGS.addressLines

    return NextResponse.json({
      settings: {
        contactEmail: String(obj.contactEmail ?? DEFAULT_SETTINGS.contactEmail),
        addressLines,
        facebookUrl: String(obj.facebookUrl ?? DEFAULT_SETTINGS.facebookUrl),
        instagramUrl: String(obj.instagramUrl ?? DEFAULT_SETTINGS.instagramUrl),
        linkedinUrl: String(obj.linkedinUrl ?? DEFAULT_SETTINGS.linkedinUrl),
        meetingLabel: String(obj.meetingLabel ?? DEFAULT_SETTINGS.meetingLabel),
        meetingTime: String(obj.meetingTime ?? DEFAULT_SETTINGS.meetingTime),
      },
    })
  } catch {
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }
}
