/**
 * One-off "the gala photos are ready" email blast — automation endpoint.
 *
 * Triggered by the scheduled GitHub Actions workflow (.github/workflows/
 * gala-photos.yml) via an authenticated POST, mirroring the dues-automation
 * pattern. Running here (on Vercel) means we reuse the production Resend +
 * Firebase Admin credentials rather than depending on GitHub Actions secrets.
 *
 * Recipients are resolved LIVE from Firestore and the send is idempotent via
 * the `system_flags/galaPhotosSent` guard (see lib/services/galaPhotos.ts).
 *
 * Auth: send `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`).
 *
 * Body (all optional):
 *   { dryRun?: boolean,        // default true — resolve only, send nothing
 *     testEmail?: string,      // send a single sample here instead of everyone
 *     force?: boolean,         // override the double-send guard
 *     checkedInOnly?: boolean, // only people checked in at the door
 *     slug?, albumSlug?, galleryUrl?, googlePhotosUrl? }
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendGalaPhotos } from '@/lib/services/galaPhotos';

function verifySecret(req: Request): boolean {
  const secret =
    req.headers.get('x-cron-secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '');
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Body is optional; default to a safe dry run.
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const dryRun = body.dryRun !== false; // default true unless explicitly false
  const testEmail = typeof body.testEmail === 'string' ? body.testEmail : undefined;
  const force = body.force === true;
  const checkedInOnly = body.checkedInOnly === true;

  try {
    const result = await sendGalaPhotos(adminDb, {
      send: !dryRun,
      force,
      checkedInOnly,
      testEmail,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      albumSlug: typeof body.albumSlug === 'string' ? body.albumSlug : undefined,
      galleryUrl: typeof body.galleryUrl === 'string' ? body.galleryUrl : undefined,
      googlePhotosUrl:
        typeof body.googlePhotosUrl === 'string' ? body.googlePhotosUrl : undefined,
      includeRecipients: dryRun, // list recipients only on dry runs
      onLog: (line) => console.log(`[gala-photos] ${line}`),
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[gala-photos] send failed:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
