import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const snap = await adminDb.collection('members').doc(decoded.uid).get();
  const role = snap.data()?.role as string | undefined;
  if (!role || !['president', 'board', 'treasurer'].includes(role)) throw new Error('Forbidden');
  return decoded;
}

export interface ImportRow {
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  role?: string;
  memberType?: string;
  committee?: string;
  phone?: string;
  occupation?: string;
  employer?: string;
  linkedIn?: string;
  joinedAt?: string;
  birthday?: string;
}

export interface ImportResult {
  email: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
}

/**
 * POST /api/portal/members/import
 * Body: { rows: ImportRow[], skipInviteEmail?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 403 });
  }

  const { rows }: { rows: ImportRow[] } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
  }

  // Fetch all existing emails in one query for duplicate detection
  const existingSnap = await adminDb.collection('members').select('email').get();
  const existingEmails = new Set(existingSnap.docs.map((d) => (d.data().email as string || '').toLowerCase()));

  const results: ImportResult[] = [];
  const now = new Date().toISOString();

  // Process in chunks of 400 (Firestore batch limit is 500)
  const CHUNK = 400;
  for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK) {
    const batch = adminDb.batch();
    const chunkRows = rows.slice(chunkStart, chunkStart + CHUNK);

    for (const row of chunkRows) {
      const email = (row.email || '').toLowerCase().trim();

      // Basic validation
      if (!row.firstName?.trim() || !row.lastName?.trim() || !email) {
        results.push({ email: email || '(empty)', status: 'error', reason: 'firstName, lastName, and email are required' });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email, status: 'error', reason: 'Invalid email address' });
        continue;
      }

      // Skip duplicates
      if (existingEmails.has(email)) {
        results.push({ email, status: 'skipped', reason: 'Email already exists' });
        continue;
      }

      const validStatuses = ['pending', 'active', 'inactive', 'alumni'];
      const validRoles = ['member', 'board', 'treasurer', 'president'];

      const memberStatus = validStatuses.includes(row.status || '') ? row.status! : 'active';
      const memberRole = validRoles.includes(row.role || '') ? row.role! : 'member';

      const memberData: Record<string, any> = {
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        displayName: `${row.firstName.trim()} ${row.lastName.trim()}`,
        email,
        role: memberRole,
        status: memberStatus,
        onboardingComplete: memberStatus === 'active' || memberStatus === 'alumni',
        joinedAt: row.joinedAt || now,
        createdAt: now,
        updatedAt: now,
        invitedAt: now,
      };

      if (row.memberType && ['professional', 'student'].includes(row.memberType)) memberData.memberType = row.memberType;
      if (row.committee?.trim()) memberData.committee = row.committee.trim();
      if (row.phone?.trim()) memberData.phone = row.phone.trim();
      if (row.occupation?.trim()) memberData.occupation = row.occupation.trim();
      if (row.employer?.trim()) memberData.employer = row.employer.trim();
      if (row.linkedIn?.trim()) memberData.linkedIn = row.linkedIn.trim();
      if (row.birthday?.trim()) memberData.birthday = row.birthday.trim();

      const docRef = adminDb.collection('members').doc();
      batch.set(docRef, memberData);
      existingEmails.add(email); // prevent duplicates within same import batch
      results.push({ email, status: 'created' });
    }

    await batch.commit();
  }

  return NextResponse.json({
    total: rows.length,
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  });
}
