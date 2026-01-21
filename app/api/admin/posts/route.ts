import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { logActivity } from '@/lib/admin/activities'

const DEFAULT_AUTHOR = 'Rotaract Club of New York at the United Nations'

function formatPublishedDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export type PostDoc = {
  slug: string
  title: string
  date: string
  author: string
  category: string
  excerpt: string
  content: string[]
  published: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const db = getFirebaseAdminDb()
  const snap = await db.collection('posts').orderBy('updatedAt', 'desc').get()
  const posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as PostDoc) }))
  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as Partial<PostDoc> | null
  if (!body?.slug || !body.title) {
    return NextResponse.json({ error: 'Missing required fields (slug, title)' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const ref = db.collection('posts').doc(body.slug)

  const normalizedAuthor = body.author?.trim()
  const normalizedDate = body.date?.trim()

  const doc: PostDoc = {
    slug: body.slug,
    title: body.title,
    date: normalizedDate ? normalizedDate : formatPublishedDate(new Date()),
    author: normalizedAuthor ? normalizedAuthor : DEFAULT_AUTHOR,
    category: body.category || 'News',
    excerpt: body.excerpt || '',
    content: Array.isArray(body.content) ? body.content : [],
    published: body.published ?? true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await ref.set(doc, { merge: true })
  
  // Log activity
  await logActivity({
    type: 'post',
    action: 'created',
    title: 'Post created',
    description: `${body.title} was ${body.published ? 'published' : 'saved as draft'}`,
    userId: admin.uid,
    userName: admin.email || 'Admin',
    metadata: { postSlug: body.slug, postTitle: body.title, published: body.published },
  })
  
  return NextResponse.json({ ok: true, id: ref.id })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as (Partial<PostDoc> & { slug?: string }) | null
  if (!body?.slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const updates: Partial<PostDoc> = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
    ...(body.content !== undefined ? { content: body.content } : {}),
    ...(body.published !== undefined ? { published: body.published } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (body.author !== undefined) {
    const normalizedAuthor = body.author?.trim()
    updates.author = normalizedAuthor ? normalizedAuthor : DEFAULT_AUTHOR
  }

  if (body.date !== undefined) {
    const normalizedDate = body.date?.trim()
    if (normalizedDate) {
      updates.date = normalizedDate
    }
  }

  const db = getFirebaseAdminDb()
  await db.collection('posts').doc(body.slug).set(updates, { merge: true })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  await db.collection('posts').doc(slug).delete()
  return NextResponse.json({ ok: true })
}
