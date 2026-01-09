import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

export type GalleryDoc = {
  title: string
  alt: string
  imageUrl: string
  storagePath?: string
  order: number
  createdAt?: unknown
  updatedAt?: unknown
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const db = getFirebaseAdminDb()
  const snap = await db.collection('gallery').orderBy('order').get()
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as GalleryDoc) }))
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as Partial<GalleryDoc> & { id?: string } | null
  if (!body?.title || !body.alt || !body.imageUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const ref = body.id ? db.collection('gallery').doc(body.id) : db.collection('gallery').doc()

  const doc: GalleryDoc = {
    title: body.title,
    alt: body.alt,
    imageUrl: body.imageUrl,
    storagePath: body.storagePath || '',
    order: Number.isFinite(body.order as number) ? Number(body.order) : 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await ref.set(doc, { merge: true })
  return NextResponse.json({ ok: true, id: ref.id })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as (Partial<GalleryDoc> & { id?: string }) | null
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const updates: Partial<GalleryDoc> = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.alt !== undefined ? { alt: body.alt } : {}),
    ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
    ...(body.storagePath !== undefined ? { storagePath: body.storagePath } : {}),
    ...(body.order !== undefined ? { order: Number(body.order) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const db = getFirebaseAdminDb()
  await db.collection('gallery').doc(body.id).set(updates, { merge: true })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  await db.collection('gallery').doc(id).delete()
  return NextResponse.json({ ok: true })
}
