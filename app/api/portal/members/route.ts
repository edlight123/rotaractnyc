import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// ─── helpers ───
async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded;
}

async function getMemberRole(uid: string) {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.exists ? (snap.data()?.role as string) : null;
}

// ─── GET members (portal-only) ───
export async function GET(request: NextRequest) {
  try {
    await verifySession();

    const snapshot = await adminDb
      .collection('members')
      .orderBy('displayName')
      .get();

    const members = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

// ─── POST — create a new member (board / president only) ───
export async function POST(request: NextRequest) {
  try {
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (!role || !['president', 'board', 'treasurer'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      role: memberRole = 'member',
      status = 'active',
      memberType,
      committee,
      phone,
      birthday,
      occupation,
      employer,
      linkedIn,
      bio,
    } = body;

    // Validation
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 },
      );
    }

    // Check for duplicate email
    const existing = await adminDb
      .collection('members')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();
    if (!existing.empty) {
      return NextResponse.json(
        { error: 'A member with this email already exists' },
        { status: 409 },
      );
    }

    const displayName = `${firstName.trim()} ${lastName.trim()}`;
    const now = new Date().toISOString();

    const memberData: Record<string, any> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName,
      email: email.toLowerCase().trim(),
      role: memberRole,
      status,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Optional fields — only include if provided
    if (memberType) memberData.memberType = memberType;
    if (committee) memberData.committee = committee.trim();
    if (phone) memberData.phone = phone.trim();
    if (birthday) memberData.birthday = birthday;
    if (occupation) memberData.occupation = occupation.trim();
    if (employer) memberData.employer = employer.trim();
    if (linkedIn) memberData.linkedIn = linkedIn.trim();
    if (bio) memberData.bio = bio.trim();

    const docRef = await adminDb.collection('members').add(memberData);

    return NextResponse.json(
      { id: docRef.id, ...memberData },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Error creating member:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 },
    );
  }
}
