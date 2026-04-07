import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const VALID_KEYS = [
  'duesReminders',
  'eventReminders',
  'welcomeSequence',
  'announcements',
  'weeklyDigest',
] as const;

type PreferenceKey = (typeof VALID_KEYS)[number];

const DEFAULT_PREFERENCES: Record<PreferenceKey, boolean> = {
  duesReminders: true,
  eventReminders: true,
  welcomeSequence: true,
  announcements: true,
  weeklyDigest: false,
};

/** Authenticate the request and return the member's UID. */
async function authenticate(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;

  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    return uid;
  } catch {
    return null;
  }
}

// ── GET — Fetch notification preferences ────────────────────────────────────

export async function GET() {
  const uid = await authenticate();
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const doc = await adminDb
      .collection('notification_preferences')
      .doc(uid)
      .get();

    const preferences = doc.exists
      ? { ...DEFAULT_PREFERENCES, ...doc.data() }
      : { ...DEFAULT_PREFERENCES };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 },
    );
  }
}

// ── PATCH — Update notification preferences ─────────────────────────────────

export async function PATCH(request: NextRequest) {
  const rateLimitResult = await rateLimit(
    getRateLimitKey(request, 'portal-notifications'),
    { max: 5, windowSec: 60 },
  );
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.resetAt);
  }

  const uid = await authenticate();
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate: only allow known preference keys with boolean values
    const updates: Partial<Record<PreferenceKey, boolean>> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!VALID_KEYS.includes(key as PreferenceKey)) {
        return NextResponse.json(
          { error: `Invalid preference key: ${key}` },
          { status: 400 },
        );
      }
      if (typeof value !== 'boolean') {
        return NextResponse.json(
          { error: `Value for "${key}" must be a boolean` },
          { status: 400 },
        );
      }
      updates[key as PreferenceKey] = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid preferences provided' },
        { status: 400 },
      );
    }

    await adminDb
      .collection('notification_preferences')
      .doc(uid)
      .set(
        { ...updates, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

    // Return the full merged preferences
    const doc = await adminDb
      .collection('notification_preferences')
      .doc(uid)
      .get();

    const preferences = { ...DEFAULT_PREFERENCES, ...doc.data() };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 },
    );
  }
}
