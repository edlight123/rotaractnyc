import { NextResponse } from 'next/server'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  const db = getFirebaseAdminDb()
  const snap = await db
    .collection('posts')
    .where('published', '==', true)
    .orderBy('updatedAt', 'desc')
    .get()

  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ posts })
}
