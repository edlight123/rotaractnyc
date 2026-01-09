import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

export async function GET(_req: NextRequest, ctx: { params: { slug: string } }) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  const db = getFirebaseAdminDb()
  const doc = await db.collection('posts').doc(ctx.params.slug).get()
  if (!doc.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = doc.data() || {}
  if (data.published === false) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ post: { id: doc.id, ...data } })
}
