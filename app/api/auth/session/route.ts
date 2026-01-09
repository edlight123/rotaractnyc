import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { isEmailAllowed } from '@/lib/firebase/allowlist'
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from '@/lib/firebase/session'

export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true)
    const email = decoded.email || null

    if (!isEmailAllowed(email)) {
      return NextResponse.json({ authenticated: false }, { status: 403 })
    }

    return NextResponse.json({ authenticated: true, email })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 500 }
    )
  }

  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string }
  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken)
    const email = decoded.email || null

    if (!isEmailAllowed(email)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }

    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, {
      expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    })

    const res = NextResponse.json({ ok: true, email })
    res.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: '/',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    maxAge: 0,
    path: '/',
  })
  return res
}
