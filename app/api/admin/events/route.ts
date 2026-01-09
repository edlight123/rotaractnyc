import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

export type EventDoc = {
  title: string
  date: string
  time?: string
  location?: string
  description: string
  category: 'upcoming' | 'past'
  order: number
  createdAt?: unknown
  updatedAt?: unknown
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const db = getFirebaseAdminDb()
  const snap = await db.collection('events').orderBy('category').orderBy('order').get()

  const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as EventDoc) }))
  return NextResponse.json({ events })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as Partial<EventDoc> & { id?: string } | null
  if (!body?.title || !body.date || !body.description || !body.category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const id = body.id || undefined

  const doc: EventDoc = {
    title: body.title,
    date: body.date,
    time: body.time || '',
    location: body.location || '',
    description: body.description,
    category: body.category,
    order: Number.isFinite(body.order as number) ? Number(body.order) : 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const ref = id ? db.collection('events').doc(id) : db.collection('events').doc()
  await ref.set(doc, { merge: true })
  return NextResponse.json({ ok: true, id: ref.id })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as (Partial<EventDoc> & { id?: string }) | null
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const updates: Partial<EventDoc> = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.date !== undefined ? { date: body.date } : {}),
    ...(body.time !== undefined ? { time: body.time } : {}),
    ...(body.location !== undefined ? { location: body.location } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.order !== undefined ? { order: Number(body.order) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const db = getFirebaseAdminDb()
  await db.collection('events').doc(body.id).set(updates, { merge: true })
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
  await db.collection('events').doc(id).delete()
  return NextResponse.json({ ok: true })
}
