import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { IMPACT_STATS } from '@/lib/constants';
import type { ImpactStat } from '@/types';

export const dynamic = 'force-dynamic';

// ─── GET: Public – return current impact stats ───

export async function GET() {
  try {
    const doc = await adminDb.collection('settings').doc('site').get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.impactStats && Array.isArray(data.impactStats) && data.impactStats.length > 0) {
        return NextResponse.json({ impactStats: data.impactStats });
      }
    }
    return NextResponse.json({ impactStats: IMPACT_STATS });
  } catch (error) {
    console.error('Error fetching impact stats:', error);
    return NextResponse.json({ impactStats: IMPACT_STATS });
  }
}

// ─── PUT: Admin – update impact stats ───

export async function PUT(request: NextRequest) {
  try {
    // Authenticate
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
    }

    // Check role
    const memberSnap = await adminDb.collection('members').doc(uid).get();
    const member = memberSnap.exists ? (memberSnap.data() as any) : null;

    if (!member || !['board', 'president'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only board members and the president can update impact stats.' },
        { status: 403 },
      );
    }

    // Parse body
    const body = await request.json();
    const { impactStats } = body;

    if (!Array.isArray(impactStats) || impactStats.length === 0) {
      return NextResponse.json(
        { error: 'At least one stat is required.' },
        { status: 400 },
      );
    }

    // Validate each stat
    for (const stat of impactStats) {
      if (!stat.value?.trim() || !stat.label?.trim()) {
        return NextResponse.json(
          { error: 'Each stat must have a value and label.' },
          { status: 400 },
        );
      }
    }

    // Sanitise
    const sanitized: ImpactStat[] = impactStats.map((s: any) => ({
      value: s.value.trim(),
      label: s.label.trim(),
    }));

    // Write to Firestore
    await adminDb.collection('settings').doc('site').set(
      { impactStats: sanitized, updatedAt: new Date().toISOString(), updatedBy: uid },
      { merge: true },
    );

    return NextResponse.json({ impactStats: sanitized });
  } catch (error) {
    console.error('[PUT /api/settings/impact-stats]', error);
    return NextResponse.json({ error: 'Failed to update impact stats.' }, { status: 500 });
  }
}
