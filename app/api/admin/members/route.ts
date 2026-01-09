import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

export type MemberDoc = {
  group: 'board' | 'member'
  title: string
  name: string
  role: string
  photoUrl?: string
  order: number
  active: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

function coerceGroup(v: unknown): MemberDoc['group'] {
  return v === 'member' ? 'member' : 'board'
}

function coerceMember(input: unknown): Omit<MemberDoc, 'createdAt' | 'updatedAt'> {
  const obj = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}
  const order = Number(obj.order)
  const photoUrl = String(obj.photoUrl ?? '').trim()

  return {
    group: coerceGroup(obj.group),
    title: String(obj.title ?? ''),
    name: String(obj.name ?? ''),
    role: String(obj.role ?? ''),
    photoUrl: photoUrl || undefined,
    order: Number.isFinite(order) ? order : 1,
    active: obj.active !== false,
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const group = coerceGroup(searchParams.get('group'))

  const db = getFirebaseAdminDb()
  let query: FirebaseFirestore.Query = db.collection('members')
  query = query.where('group', '==', group)

  const snap = await query.orderBy('order', 'asc').limit(500).get()
  const members = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MemberDoc) }))

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body: unknown = await req.json().catch(() => null)
  const member = coerceMember(body)

  if (!member.title.trim() || !member.name.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const ref = await db.collection('members').add({
    ...member,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: admin.email,
  })

  return NextResponse.json({ ok: true, id: ref.id })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body: unknown = await req.json().catch(() => null)
  const obj = typeof body === 'object' && body ? (body as Record<string, unknown>) : {}
  const id = String(obj.id ?? '')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const member = coerceMember(body)
  if (!member.title.trim() || !member.name.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  await db.collection('members').doc(id).set(
    {
      ...member,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.email,
    },
    { merge: true }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = getFirebaseAdminDb()
  await db.collection('members').doc(id).delete()

  return NextResponse.json({ ok: true })
}
