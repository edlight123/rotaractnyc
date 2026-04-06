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

    // Advisory JWT checks — full verification happens server-side via Firebase Admin.
    // These filter out obviously invalid / expired / forged tokens at the edge.
    try {
      // ── Header checks ──────────────────────────────────────────────────
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64').toString('utf-8'),
      );

      // Firebase ID tokens must use RS256
      if (header.alg !== 'RS256') {
        throw new Error('unexpected alg');
      }

      // ── Payload checks ─────────────────────────────────────────────────
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );

      const now = Date.now();

      // Token expired
      if (payload.exp && payload.exp * 1000 < now) {
        throw new Error('token expired');
      }

      // Issuer must match the Firebase project
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (
        projectId &&
        payload.iss &&
        payload.iss !== `https://securetoken.google.com/${projectId}`
      ) {
        throw new Error('issuer mismatch');
      }

      // Token should not be older than 14 days (max-age guard)
      const MAX_AGE_SECONDS = 14 * 24 * 60 * 60; // 14 days
      if (payload.iat && (now / 1000 - payload.iat) > MAX_AGE_SECONDS) {
        throw new Error('token too old');
      }
    } catch {
      // Any check failure — clear the cookie and redirect to login
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('rotaract_portal_session');
      return response;
    }
  }

  // Portal routes need auth — just pass through for security headers
  const response = NextResponse.next();
  return response;
}

export const config = {
  matcher: ['/portal/:path*'],
};
