import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect portal routes (except login)
  if (pathname.startsWith('/portal') && !pathname.startsWith('/portal/login')) {
    const session = request.cookies.get('rotaract_portal_session');

    // Check cookie exists and has a non-empty value
    if (!session?.value) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Basic JWT structure check (3 dot-separated base64 segments).
    // Full verification happens server-side in API routes via Firebase Admin.
    const parts = session.value.split('.');
    if (parts.length !== 3) {
      // Malformed token — clear it and redirect to login
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('rotaract_portal_session');
      return response;
    }

    // Check if the token's exp claim has passed (base64-decode payload)
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        const loginUrl = new URL('/portal/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('rotaract_portal_session');
        return response;
      }
    } catch {
      // If decode fails, let the API route do full verification
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  matcher: ['/portal/:path*', '/((?!_next/static|_next/image|favicon).*)'],
};
