/**
 * Tests for the Next.js middleware function
 *
 * Verifies routing behaviour: which routes require authentication,
 * how unauthenticated / authenticated requests are handled, and that
 * the exported matcher config is correct.
 *
 * No real Firebase credentials are needed — we craft JWTs locally and
 * the middleware only performs structural checks (full cryptographic
 * verification happens server-side via Firebase Admin in API routes).
 */

import { NextRequest } from 'next/server';
import { middleware, config } from '@/middleware';

// ─── Constants ──────────────────────────────────────────────────────────────

const PROJECT_ID = 'test-project-id';
const COOKIE_NAME = 'rotaract_portal_session';
const BASE_URL = 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────────────────────

function base64Encode(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

/** Build a valid-looking Firebase JWT for testing. */
function validJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    iat: now,
    exp: now + 3600,
    sub: 'user-abc',
    aud: PROJECT_ID,
  };
  return `${base64Encode(header)}.${base64Encode(payload)}.fake-sig`;
}

/** Create a NextRequest for the given path, optionally with a session cookie. */
function makeRequest(path: string, sessionCookie?: string): NextRequest {
  const url = new URL(path, BASE_URL);
  const headers: Record<string, string> = {};
  if (sessionCookie !== undefined) {
    headers.cookie = `${COOKIE_NAME}=${sessionCookie}`;
  }
  return new NextRequest(url, { headers });
}

// ─── Environment ────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = PROJECT_ID;
});

afterAll(() => {
  delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
});

// ─── Middleware config ──────────────────────────────────────────────────────

describe('Middleware configuration', () => {
  it('exports a config object with a matcher array', () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeInstanceOf(Array);
  });

  it('matcher targets /portal/:path* routes', () => {
    expect(config.matcher).toContain('/portal/:path*');
  });

  it('matcher targets /account/:path* routes', () => {
    expect(config.matcher).toContain('/account/:path*');
  });

  it('matcher has exactly two patterns (portal + account routes)', () => {
    expect(config.matcher).toHaveLength(2);
  });
});

// ─── Public routes ──────────────────────────────────────────────────────────

describe('Public routes (pass through without auth)', () => {
  const publicPaths = [
    '/',
    '/about',
    '/events',
    '/contact',
    '/donate',
    '/faq',
    '/gallery',
    '/leadership',
    '/membership',
    '/news',
    '/partners',
  ];

  it.each(publicPaths)(
    '%s passes through without auth check',
    (path) => {
      const req = makeRequest(path);
      const res = middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-middleware-next')).toBe('1');
    },
  );

  it('public routes do not set any auth-related cookies', () => {
    const req = makeRequest('/about');
    const res = middleware(req);

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).not.toContain(COOKIE_NAME);
  });
});

// ─── Portal routes without session ──────────────────────────────────────────

describe('Portal routes redirect to /portal/login without session cookie', () => {
  const protectedPaths = [
    '/portal/dashboard',
    '/portal/events',
    '/portal/settings',
    '/portal/profile',
    '/portal/service-hours',
    '/portal/documents',
    '/portal/messages',
  ];

  it.each(protectedPaths)(
    '%s redirects to /portal/login',
    (path) => {
      const req = makeRequest(path);
      const res = middleware(req);

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get('location')!, BASE_URL);
      expect(location.pathname).toBe('/portal/login');
    },
  );

  it('redirect includes the original path as ?redirect= param', () => {
    const req = makeRequest('/portal/events');
    const res = middleware(req);

    const location = new URL(res.headers.get('location')!, BASE_URL);
    expect(location.searchParams.get('redirect')).toBe('/portal/events');
  });

  it('redirect preserves nested path segments', () => {
    const req = makeRequest('/portal/events/some-event-id');
    const res = middleware(req);

    const location = new URL(res.headers.get('location')!, BASE_URL);
    expect(location.searchParams.get('redirect')).toBe('/portal/events/some-event-id');
  });
});

// ─── Portal routes with valid session ───────────────────────────────────────

describe('Portal routes with valid JWT proceed', () => {
  const protectedPaths = [
    '/portal/dashboard',
    '/portal/events',
    '/portal/settings',
    '/portal/profile',
    '/portal/articles',
    '/portal/committees',
    '/portal/directory',
  ];

  it.each(protectedPaths)(
    '%s passes through with valid JWT',
    (path) => {
      const req = makeRequest(path, validJwt());
      const res = middleware(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-middleware-next')).toBe('1');
    },
  );

  it('does not delete the session cookie on valid JWT', () => {
    const req = makeRequest('/portal/dashboard', validJwt());
    const res = middleware(req);

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).not.toContain(COOKIE_NAME);
  });
});

// ─── /portal/login exemption ────────────────────────────────────────────────

describe('/portal/login exemption', () => {
  it('allows /portal/login without any session cookie', () => {
    const req = makeRequest('/portal/login');
    const res = middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('allows /portal/login even with an invalid session cookie', () => {
    const req = makeRequest('/portal/login', 'garbage-token');
    const res = middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('allows /portal/login with a valid session cookie', () => {
    const req = makeRequest('/portal/login', validJwt());
    const res = middleware(req);

    expect(res.status).toBe(200);
  });

  it('allows /portal/login with query params (e.g. redirect)', () => {
    const req = makeRequest('/portal/login?redirect=/portal/dashboard');
    const res = middleware(req);

    expect(res.status).toBe(200);
  });
});

// ─── API routes ─────────────────────────────────────────────────────────────

describe('API portal routes', () => {
  /*
   * The middleware config matcher only targets /portal/:path*, so API routes
   * at /api/portal/... are NOT processed by the middleware at all in
   * production. When called directly, the middleware function passes them
   * through because their pathname doesn't start with "/portal".
   *
   * Auth for API routes is handled inside each route handler via Firebase
   * Admin SDK verification, returning 401 when the session is invalid.
   */

  it('/api/portal routes are not covered by the middleware matcher', () => {
    // The matcher pattern /portal/:path* does not match /api/portal/...
    expect(config.matcher).not.toContain('/api/portal/:path*');
    expect(config.matcher).not.toContain('/api/:path*');
  });

  it('middleware passes through /api/portal routes without auth check', () => {
    const req = makeRequest('/api/portal/auth/session');
    const res = middleware(req);

    // Not matched by the "starts with /portal" check → pass through
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('middleware passes through /api/portal routes even without a cookie', () => {
    const req = makeRequest('/api/portal/events');
    const res = middleware(req);

    expect(res.status).toBe(200);
  });

  it('middleware passes through general API routes', () => {
    const req = makeRequest('/api/contact');
    const res = middleware(req);

    expect(res.status).toBe(200);
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles /portal (root) without trailing slash as protected', () => {
    // pathname = "/portal" starts with "/portal" and not "/portal/login"
    const req = makeRequest('/portal');
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!, BASE_URL);
    expect(location.pathname).toBe('/portal/login');
  });

  it('/portal with valid JWT passes through', () => {
    const req = makeRequest('/portal', validJwt());
    const res = middleware(req);

    expect(res.status).toBe(200);
  });

  it('clears cookie and redirects on malformed JWT for any portal path', () => {
    const req = makeRequest('/portal/board', 'x.y');
    const res = middleware(req);

    expect(res.status).toBe(307);
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain(COOKIE_NAME);
  });

  it('the middleware function can be imported and called directly', () => {
    // Verify the middleware is a callable function
    expect(typeof middleware).toBe('function');
    const req = makeRequest('/');
    const res = middleware(req);
    expect(res).toBeDefined();
    expect(typeof res.status).toBe('number');
  });
});
