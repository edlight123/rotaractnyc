import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdminDb, getFirebaseAdminAuth } from '@/lib/firebase/admin'

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
  featuredImage?: string
  createdAt?: unknown
  updatedAt?: unknown
  createdBy?: string
}

// Check if user has admin rights
async function requirePortalAdmin(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { ok: false, status: 401, message: 'No token provided' }
    }

    const token = authHeader.substring(7)
    const auth = getFirebaseAdminAuth()
    const decodedToken = await auth.verifyIdToken(token)
    
    const db = getFirebaseAdminDb()
    const userDoc = await db.collection('users').doc(decodedToken.uid).get()
    
    if (!userDoc.exists) {
      return { ok: false, status: 403, message: 'User not found' }
    }

    const userData = userDoc.data()
    if (userData?.role !== 'ADMIN') {
      return { ok: false, status: 403, message: 'Admin access required' }
    }

    return { ok: true, userId: decodedToken.uid, userData }
  } catch (error) {
    console.error('Auth error:', error)
    return { ok: false, status: 401, message: 'Invalid token' }
  }
}

export async function POST(req: NextRequest) {
  const admin = await requirePortalAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })

  const body = (await req.json().catch(() => null)) as Partial<PostDoc> | null
  if (!body?.slug || !body.title) {
    return NextResponse.json({ error: 'Missing required fields (slug, title)' }, { status: 400 })
  }

  const db = getFirebaseAdminDb()
  const ref = db.collection('posts').doc(body.slug)

  // Check if post already exists
  const existing = await ref.get()
  if (existing.exists) {
    return NextResponse.json({ error: 'A post with that slug already exists' }, { status: 409 })
  }

  // Format date
  const postDate = body.date ? new Date(body.date) : new Date()
  const formattedDate = formatPublishedDate(postDate)

  // Generate excerpt from content
  const excerpt = body.content && body.content.length > 0
    ? body.content[0].slice(0, 150) + (body.content[0].length > 150 ? '...' : '')
    : ''

  const newPost: PostDoc = {
    slug: body.slug,
    title: body.title,
    date: formattedDate,
    author: admin.userData?.displayName || admin.userData?.email || DEFAULT_AUTHOR,
    category: body.category || 'Uncategorized',
    excerpt: body.excerpt || excerpt,
    content: body.content || [],
    published: body.published ?? false,
    featuredImage: body.featuredImage || '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: admin.userId,
  }

  await ref.set(newPost)

  return NextResponse.json({ success: true, post: { id: body.slug, ...newPost } })
}
