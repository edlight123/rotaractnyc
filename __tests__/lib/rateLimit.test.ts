/**
 * Tests for lib/rateLimit.ts
 */

// Prevent the cleanup setInterval from leaking into tests
jest.useFakeTimers();

import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

afterAll(() => {
  jest.useRealTimers();
});

describe('rateLimit', () => {
  beforeEach(() => {
    // Advance time far enough to expire any previous entries
    jest.advanceTimersByTime(120_000);
  });

  it('allows the first request', () => {
    const result = rateLimit('test-first');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('returns remaining count that decreases with each call', () => {
    const key = 'test-remaining';
    const r1 = rateLimit(key, { max: 5 });
    expect(r1.remaining).toBe(4);

    const r2 = rateLimit(key, { max: 5 });
    expect(r2.remaining).toBe(3);

    const r3 = rateLimit(key, { max: 5 });
    expect(r3.remaining).toBe(2);
  });

  it('blocks requests once the max is reached', () => {
    const key = 'test-block';
    const max = 3;

    rateLimit(key, { max });
    rateLimit(key, { max });
    rateLimit(key, { max });

    const blocked = rateLimit(key, { max });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    const keyA = 'test-indep-a';
    const keyB = 'test-indep-b';

    // Exhaust keyA
    rateLimit(keyA, { max: 1 });
    const blockedA = rateLimit(keyA, { max: 1 });
    expect(blockedA.allowed).toBe(false);

    // keyB should still be allowed
    const resultB = rateLimit(keyB, { max: 1 });
    expect(resultB.allowed).toBe(true);
  });

  it('resets after the window expires', () => {
    const key = 'test-reset';
    const windowSec = 10;

    rateLimit(key, { max: 1, windowSec });
    const blocked = rateLimit(key, { max: 1, windowSec });
    expect(blocked.allowed).toBe(false);

    // Advance past the window
    jest.advanceTimersByTime(11_000);

    const afterReset = rateLimit(key, { max: 1, windowSec });
    expect(afterReset.allowed).toBe(true);
  });

  it('uses default max of 10 when not specified', () => {
    const key = 'test-default-max';
    for (let i = 0; i < 10; i++) {
      expect(rateLimit(key).allowed).toBe(true);
    }
    expect(rateLimit(key).allowed).toBe(false);
  });

  it('returns a resetAt timestamp in the future', () => {
    const now = Date.now();
    const result = rateLimit('test-resetAt', { windowSec: 30 });
    expect(result.resetAt).toBeGreaterThan(now);
  });
});

describe('getRateLimitKey', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getRateLimitKey(request)).toBe('api:1.2.3.4');
  });

  it('uses "unknown" when no x-forwarded-for header', () => {
    const request = new Request('https://example.com');
    expect(getRateLimitKey(request)).toBe('api:unknown');
  });

  it('supports a custom prefix', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(getRateLimitKey(request, 'contact')).toBe('contact:10.0.0.1');
  });
});

describe('rateLimitResponse', () => {
  it('returns a 429 status response', () => {
    const resetAt = Date.now() + 30_000;
    const res = rateLimitResponse(resetAt);
    expect(res.status).toBe(429);
  });

  it('includes Content-Type application/json header', () => {
    const resetAt = Date.now() + 30_000;
    const res = rateLimitResponse(resetAt);
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('includes Retry-After header', () => {
    const resetAt = Date.now() + 30_000;
    const res = rateLimitResponse(resetAt);
    const retryAfter = Number(res.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(30);
  });

  it('includes error message in the JSON body', async () => {
    const resetAt = Date.now() + 10_000;
    const res = rateLimitResponse(resetAt);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });
});
