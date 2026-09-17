/**
 * Cron endpoint — refresh Sandra's document corpus from the shared Drive.
 *
 * Triggered weekly by Vercel Cron (see vercel.json). Re-ingests the curated
 * club Google Docs into Firestore `sandra_corpus` so Sandra's answers stay
 * current as the documents change.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sets this
 * automatically when CRON_SECRET is configured.
 * Needs GOOGLE_SA_JSON in the environment (shared-Drive read access).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { runSandraIngest, resolveDriveCredential } from '@/lib/services/sandraIngest';
import type { Firestore } from 'firebase-admin/firestore';

function authorize(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace('Bearer ', '');
  return !!process.env.CRON_SECRET && token === process.env.CRON_SECRET;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Either credential will do: the dedicated Drive key, or the Firebase
  // service account once it has Viewer on the source folders. Guarding on
  // GOOGLE_SA_JSON alone would keep skipping after that variable is removed,
  // which is exactly the silent no-op this endpoint spent eight weeks doing.
  try {
    resolveDriveCredential({
      GOOGLE_SA_JSON: process.env.GOOGLE_SA_JSON,
      FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, skipped: (e as Error).message },
      { status: 200 },
    );
  }

  try {
    const result = await runSandraIngest(adminDb as unknown as Firestore);
    try {
      await adminDb.collection('activity_logs').add({
        action: 'sandra_corpus_ingest_cron',
        metadata: result,
        createdAt: new Date().toISOString(),
      });
    } catch { /* audit log is best-effort */ }
    return NextResponse.json({ ok: true, ingested: result.ok, total: result.total, errors: result.errors });
  } catch (e) {
    console.error('[sandra] corpus ingest cron failed:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'ingest failed' },
      { status: 500 },
    );
  }
}
