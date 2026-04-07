/**
 * Tests for lib/cron.ts — validateCronAuth()
 */

import { validateCronAuth } from '@/lib/cron';

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/test', {
    headers,
  });
}

describe('validateCronAuth', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ── Missing env var ────────────────────────────────────────────────────

  it('returns invalid when CRON_SECRET env var is not set', () => {
    delete process.env.CRON_SECRET;
    const result = validateCronAuth(makeRequest({ authorization: 'Bearer whatever' }));
    expect(result.valid).toBe(false);
    expect(result.response).toBeDefined();
  });

  it('returns a 500 response when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET;
    const result = validateCronAuth(makeRequest({ authorization: 'Bearer whatever' }));
    expect(result.response).toBeDefined();
    const data = await result.response!.json();
    expect(result.response!.status).toBe(500);
    expect(data.error).toMatch(/misconfigured/i);
  });

  // ── Missing / wrong header ────────────────────────────────────────────

  it('returns invalid when no Authorization header is provided', () => {
    process.env.CRON_SECRET = 'test-secret';
    const result = validateCronAuth(makeRequest());
    expect(result.valid).toBe(false);
  });

  it('returns a 401 response when no Authorization header is provided', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const result = validateCronAuth(makeRequest());
    expect(result.response).toBeDefined();
    expect(result.response!.status).toBe(401);
    const data = await result.response!.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it('returns invalid when the secret is wrong', () => {
    process.env.CRON_SECRET = 'correct-secret';
    const result = validateCronAuth(makeRequest({ authorization: 'Bearer wrong-secret' }));
    expect(result.valid).toBe(false);
  });

  it('returns a 401 response when the secret is wrong', async () => {
    process.env.CRON_SECRET = 'correct-secret';
    const result = validateCronAuth(makeRequest({ authorization: 'Bearer wrong-secret' }));
    expect(result.response!.status).toBe(401);
  });

  it('returns invalid when Authorization header is not Bearer format', () => {
    process.env.CRON_SECRET = 'test-secret';
    const result = validateCronAuth(makeRequest({ authorization: 'Basic test-secret' }));
    expect(result.valid).toBe(false);
  });

  // ── Valid auth ─────────────────────────────────────────────────────────

  it('returns valid when the correct Bearer token is provided', () => {
    process.env.CRON_SECRET = 'my-secret';
    const result = validateCronAuth(makeRequest({ authorization: 'Bearer my-secret' }));
    expect(result.valid).toBe(true);
  });

  it('does not include a response object when auth is valid', () => {
    process.env.CRON_SECRET = 'my-secret';
    const result = validateCronAuth(makeRequest({ authorization: 'Bearer my-secret' }));
    expect(result.response).toBeUndefined();
  });
});
