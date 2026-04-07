import { NextResponse } from 'next/server';

/**
 * Validate that a request comes from Vercel Cron or has the correct CRON_SECRET.
 * Vercel Cron sets the `Authorization: Bearer <CRON_SECRET>` header automatically.
 */
export function validateCronAuth(request: Request): { valid: boolean; response?: NextResponse } {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('[cron] CRON_SECRET env var is not set');
    return { valid: false, response: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }) };
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { valid: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  
  return { valid: true };
}
