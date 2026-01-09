import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/app/api/admin/_utils'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

export type MessageDoc = {
  name: string
  email: string
  subject: string
  message: string
  createdAt?: unknown
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const db = getFirebaseAdminDb()
  const snap = await db.collection('messages').orderBy('createdAt', 'desc').limit(200).get()
  const messages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MessageDoc) }))
  return NextResponse.json({ messages })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = getFirebaseAdminDb()
  await db.collection('messages').doc(id).delete()
  return NextResponse.json({ ok: true })
}
