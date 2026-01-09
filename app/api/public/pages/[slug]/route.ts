import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_PAGES, type CmsPageDoc, type CmsPageSlug } from '@/lib/content/pages'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

function coerceSlug(v: unknown): CmsPageSlug | null {
  if (v === 'faq' || v === 'mission' || v === 'membership' || v === 'sisterclubs') return v
  return null
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await ctx.params
  const slug = coerceSlug(raw)
  if (!slug) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const defaults = DEFAULT_PAGES[slug]

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ page: defaults })
  }

  try {
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
  } catch {
    return NextResponse.json({ page: defaults })
  }
}
