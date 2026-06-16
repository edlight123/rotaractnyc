import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect the member portal (except its login) and the supporter account hub
  // (except its public auth pages). Both share the same Firebase session cookie.
  const isProtectedPortal =
    pathname.startsWith('/portal') && !pathname.startsWith('/portal/login');
  const isProtectedAccount =
    pathname.startsWith('/account') &&
    !pathname.startsWith('/account/login') &&
    !pathname.startsWith('/account/signup') &&
    !pathname.startsWith('/account/verify');

  if (isProtectedPortal || isProtectedAccount) {
    const session = request.cookies.get(SESSION_COOKIE_NAME);

    // Send unauthenticated visitors to the matching sign-in surface:
    // supporters → /account/login, members → /portal/login.
    const loginPath = isProtectedAccount ? '/account/login' : '/portal/login';

    // Check cookie exists and has a non-empty value
    if (!session?.value) {
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Basic JWT structure check (3 dot-separated base64 segments).
    // Full verification happens server-side in API routes via Firebase Admin.
    const parts = session.value.split('.');
    if (parts.length !== 3) {
      // Malformed token — clear it and redirect to login
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // Advisory JWT checks — full verification happens server-side via Firebase Admin.
    // These filter out obviously invalid / expired / forged tokens at the edge.
    try {
      // ── Header checks ──────────────────────────────────────────────────
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64').toString('utf-8'),
      );

      // Firebase ID tokens and session cookies must use RS256
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

      // Issuer must match the Firebase project.
      // Firebase ID tokens use securetoken.google.com, while Firebase
      // session cookies (created via adminAuth.createSessionCookie)
      // use session.firebase.google.com — we must accept both.
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (projectId && payload.iss) {
        const validIssuers = [
          `https://securetoken.google.com/${projectId}`,
          `https://session.firebase.google.com/${projectId}`,
        ];
        if (!validIssuers.includes(payload.iss)) {
          throw new Error('issuer mismatch');
        }
      }

      // Token should not be older than 14 days (max-age guard)
      if (payload.iat && (now / 1000 - payload.iat) > 14 * 24 * 60 * 60) {
        throw new Error('token too old');
      }
    } catch {
      // Any check failure — clear the cookie and redirect to login
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  // Portal routes need auth — just pass through for security headers
  const response = NextResponse.next();
  return response;
}

export const config = {
  matcher: ['/portal/:path*', '/account/:path*'],
};
