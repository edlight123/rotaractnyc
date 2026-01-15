import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_SESSION_COOKIE = 'rotaract_admin_session'
const PORTAL_SESSION_COOKIE = 'rotaract_portal_session'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect admin routes
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const hasSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value)
    if (!hasSession) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // Protect portal routes
  if (pathname.startsWith('/portal') && pathname !== '/portal/login') {
    const hasSession = Boolean(req.cookies.get(PORTAL_SESSION_COOKIE)?.value)
    if (!hasSession) {
      const url = req.nextUrl.clone()
      url.pathname = '/portal/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
}
