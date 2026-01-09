import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { DEFAULT_PAGES, type CmsPageDoc, type CmsPageSlug } from '@/lib/content/pages'

function coerceSlug(v: unknown): CmsPageSlug | null {
  if (v === 'faq' || v === 'mission' || v === 'membership' || v === 'sisterclubs') return v
  return null
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const slug = coerceSlug(searchParams.get('slug'))
  if (!slug) return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 })

  const defaults = DEFAULT_PAGES[slug]

  const snap = await getFirebaseAdminDb().collection('pages').doc(slug).get()
  if (!snap.exists) return NextResponse.json({ page: defaults })

  const data: unknown = snap.data()
  const obj = typeof data === 'object' && data ? (data as Record<string, unknown>) : {}

  const page: CmsPageDoc = {
    slug,
    heroTitle: String(obj.heroTitle ?? defaults.heroTitle),
    heroSubtitle: String(obj.heroSubtitle ?? defaults.heroSubtitle),
    data: (obj.data as unknown) ?? defaults.data,
  }

  return NextResponse.json({ page })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body: unknown = await req.json().catch(() => null)
  const obj = typeof body === 'object' && body ? (body as Record<string, unknown>) : {}

  const slug = coerceSlug(obj.slug)
  if (!slug) return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 })

  const heroTitle = String(obj.heroTitle ?? '').trim()
  const heroSubtitle = String(obj.heroSubtitle ?? '').trim()
  const data = (obj.data as unknown) ?? {}

  if (!heroTitle) return NextResponse.json({ error: 'Missing heroTitle' }, { status: 400 })

  await getFirebaseAdminDb()
    .collection('pages')
    .doc(slug)
    .set(
      {
        slug,
        heroTitle,
        heroSubtitle,
        data,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.email,
      },
      { merge: true }
    )

  return NextResponse.json({ ok: true })
}
