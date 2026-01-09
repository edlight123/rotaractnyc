import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { DEFAULT_EVENTS } from '@/lib/content/events'
import { DEFAULT_GALLERY } from '@/lib/content/gallery'
import { DEFAULT_SETTINGS } from '@/lib/content/settings'
import { DEFAULT_BOARD_MEMBERS } from '@/lib/content/members'
import { DEFAULT_PAGES } from '@/lib/content/pages'
import { RCUN_NEWS } from '@/lib/rcunNews'

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const db = getFirebaseAdminDb()

  const batch = db.batch()

  for (const e of DEFAULT_EVENTS) {
    const ref = db.collection('events').doc(e.id)
    batch.set(
      ref,
      {
        title: e.title,
        date: e.date,
        time: e.time || '',
        location: e.location || '',
        description: e.description,
        category: e.category,
        order: e.order,
        seeded: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  for (const g of DEFAULT_GALLERY) {
    const ref = db.collection('gallery').doc(g.id)
    batch.set(
      ref,
      {
        title: g.title,
        alt: g.alt,
        imageUrl: g.imageUrl,
        order: g.order,
        seeded: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  for (const p of RCUN_NEWS) {
    const ref = db.collection('posts').doc(p.slug)
    batch.set(
      ref,
      {
        slug: p.slug,
        title: p.title,
        date: p.date,
        author: p.author,
        category: p.category,
        excerpt: p.excerpt,
        content: p.content,
        published: true,
        seeded: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  // Site settings (singleton doc)
  batch.set(
    db.collection('settings').doc('site'),
    {
      ...DEFAULT_SETTINGS,
      seeded: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  // Board members
  for (const m of DEFAULT_BOARD_MEMBERS) {
    const ref = db.collection('members').doc(m.id)
    batch.set(
      ref,
      {
        group: m.group,
        title: m.title,
        name: m.name,
        role: m.role,
        order: m.order,
        active: m.active,
        seeded: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  // Static pages
  for (const [slug, page] of Object.entries(DEFAULT_PAGES)) {
    const ref = db.collection('pages').doc(slug)
    batch.set(
      ref,
      {
        slug,
        heroTitle: page.heroTitle,
        heroSubtitle: page.heroSubtitle,
        data: page.data,
        seeded: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  await batch.commit()

  return NextResponse.json({ ok: true })
}
