/**
 * GET   /api/account/profile  — read the signed-in user's account profile
 * PATCH /api/account/profile  — update editable profile fields
 *
 * Auth is by session cookie. Writes go through the Admin SDK (not client
 * Firestore writes) so validation is centralized and immutable fields
 * (email, accountType, role, audit) can never be tampered with. The user's
 * displayName is also mirrored onto the Firebase Auth profile so future
 * session tokens carry the updated name.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const MAX = { name: 100, part: 60, phone: 30 } as const;

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, max);
}

async function requireUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET() {
  const uid = await requireUid();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb.collection('accounts').doc(uid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }
  const d = snap.data() || {};
  return NextResponse.json({
    profile: {
      email: d.email || '',
      emailVerified: !!d.emailVerified,
      accountType: d.accountType || 'supporter',
      displayName: d.displayName || '',
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      phone: d.phone || '',
      photoURL: d.photoURL || '',
      subscriptions: {
        newsletter: !!d.subscriptions?.newsletter,
        volunteer: !!d.subscriptions?.volunteer,
        eventReminders: d.subscriptions?.eventReminders !== false,
      },
    },
  });
}

export async function PATCH(request: Request) {
  const uid = await requireUid();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, any> = { updatedAt: new Date().toISOString() };

  const displayName = clean(body.displayName, MAX.name);
  if (displayName !== undefined) update.displayName = displayName;

  const firstName = clean(body.firstName, MAX.part);
  if (firstName !== undefined) update.firstName = firstName;

  const lastName = clean(body.lastName, MAX.part);
  if (lastName !== undefined) update.lastName = lastName;

  const phone = clean(body.phone, MAX.phone);
  if (phone !== undefined) update.phone = phone;

  if (body.subscriptions && typeof body.subscriptions === 'object') {
    const s = body.subscriptions as Record<string, unknown>;
    const subs: Record<string, boolean> = {};
    if (typeof s.newsletter === 'boolean') subs['subscriptions.newsletter'] = s.newsletter;
    if (typeof s.volunteer === 'boolean') subs['subscriptions.volunteer'] = s.volunteer;
    if (typeof s.eventReminders === 'boolean') subs['subscriptions.eventReminders'] = s.eventReminders;
    Object.assign(update, subs);
  }

  try {
    await adminDb.collection('accounts').doc(uid).update(update);
    // Keep the Auth profile name in sync so future tokens carry it.
    if (typeof update.displayName === 'string') {
      await adminAuth.updateUser(uid, { displayName: update.displayName }).catch(() => {});
    }
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
