import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const SERVICE_HOURS_GOAL = 40;

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMonth(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as any).toDate === 'function') return (value as any).toDate();
  if (typeof value === 'object' && '_seconds' in (value as any)) {
    const ts = value as { _seconds: number; _nanoseconds: number };
    return new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const memberDoc = await adminDb.collection('members').doc(uid).get();
    if (!memberDoc.exists) return null;
    return { uid, ...memberDoc.data() };
  } catch {
    return null;
  }
}

// ─── GET /api/portal/service-hours/analytics ────────────────────────────────

export async function GET(request: NextRequest) {
  // Rate limit: 10 requests per 60 seconds
  const rlResult = await rateLimit(getRateLimitKey(request, 'portal-sh-analytics'), {
    max: 10,
    windowSec: 60,
  });
  if (!rlResult.allowed) return rateLimitResponse(rlResult.resetAt);

  // Auth — any active member
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const currentUid = session.uid;

    // Fetch all service hour entries and members in parallel
    const [serviceSnap, membersSnap] = await Promise.all([
      adminDb.collection('serviceHours').get(),
      adminDb.collection('members').where('status', '==', 'active').get(),
    ]);

    const entries = serviceSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const memberPhotos = new Map<string, string>();
    for (const m of members) {
      if (m.photoURL) memberPhotos.set(m.id, m.photoURL);
    }

    const totalMembers = members.length;

    // ── Aggregate by status ──────────────────────────────────────────────
    let totalApproved = 0;
    let totalPending = 0;

    // Per-member approved hours
    const memberHoursMap = new Map<string, { hours: number; name: string }>();

    // Monthly trend (last 12 months)
    const now = new Date();
    const monthKeys: string[] = [];
    const monthHoursMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = formatMonth(d);
      monthKeys.push(key);
      monthHoursMap.set(key, 0);
    }

    // By event
    const eventMap = new Map<string, { totalHours: number; participants: Set<string> }>();

    for (const entry of entries) {
      const hours = Number(entry.hours) || 0;

      if (entry.status === 'approved') {
        totalApproved += hours;

        // Per-member aggregation
        const existing = memberHoursMap.get(entry.memberId);
        if (existing) {
          existing.hours += hours;
        } else {
          memberHoursMap.set(entry.memberId, {
            hours,
            name: entry.memberName || 'Unknown',
          });
        }

        // Monthly trend
        const created = toDate(entry.createdAt);
        if (created) {
          const key = formatMonth(created);
          if (monthHoursMap.has(key)) {
            monthHoursMap.set(key, monthHoursMap.get(key)! + hours);
          }
        }

        // By event
        if (entry.eventTitle) {
          const ev = eventMap.get(entry.eventTitle);
          if (ev) {
            ev.totalHours += hours;
            ev.participants.add(entry.memberId);
          } else {
            eventMap.set(entry.eventTitle, {
              totalHours: hours,
              participants: new Set([entry.memberId]),
            });
          }
        }
      } else if (entry.status === 'pending') {
        totalPending += hours;
      }
    }

    // ── Leaderboard (top 20 by approved hours) ──────────────────────────
    const sortedMembers = Array.from(memberHoursMap.entries())
      .map(([memberId, data]) => ({
        memberId,
        memberName: data.name,
        memberPhoto: memberPhotos.get(memberId) || undefined,
        hours: Math.round(data.hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours);

    const leaderboard = sortedMembers.slice(0, 20).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    // ── Summary ─────────────────────────────────────────────────────────
    const membersAtGoal = sortedMembers.filter((m) => m.hours >= SERVICE_HOURS_GOAL).length;
    const avgPerMember = totalMembers > 0
      ? Math.round((totalApproved / totalMembers) * 10) / 10
      : 0;

    const summary = {
      totalApproved: Math.round(totalApproved * 10) / 10,
      totalPending: Math.round(totalPending * 10) / 10,
      avgPerMember,
      membersAtGoal,
      totalMembers,
    };

    // ── Monthly trend ───────────────────────────────────────────────────
    const monthlyTrend = monthKeys.map((month) => ({
      month,
      hours: Math.round((monthHoursMap.get(month) || 0) * 10) / 10,
    }));

    // ── By event (top 10) ───────────────────────────────────────────────
    const byEvent = Array.from(eventMap.entries())
      .map(([eventTitle, data]) => ({
        eventTitle,
        totalHours: Math.round(data.totalHours * 10) / 10,
        participantCount: data.participants.size,
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10);

    // ── My stats ────────────────────────────────────────────────────────
    const myApproved = memberHoursMap.get(currentUid)?.hours || 0;
    const myPendingHours = entries
      .filter((e) => e.memberId === currentUid && e.status === 'pending')
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

    // Rank: position among all members with approved hours
    const myRankIndex = sortedMembers.findIndex((m) => m.memberId === currentUid);
    const myRank = myRankIndex >= 0 ? myRankIndex + 1 : sortedMembers.length + 1;
    const totalRanked = Math.max(sortedMembers.length, 1);
    const percentile = Math.max(
      1,
      Math.round(((totalRanked - myRank + 1) / totalRanked) * 100),
    );

    const myStats = {
      totalApproved: Math.round(myApproved * 10) / 10,
      totalPending: Math.round(myPendingHours * 10) / 10,
      rank: myRank,
      percentile,
      goal: SERVICE_HOURS_GOAL,
      progress: Math.min(100, Math.round((myApproved / SERVICE_HOURS_GOAL) * 100)),
    };

    return NextResponse.json({
      summary,
      leaderboard,
      monthlyTrend,
      byEvent,
      myStats,
    });
  } catch (error) {
    console.error('Error computing service hours analytics:', error);
    return NextResponse.json(
      { error: 'Failed to compute analytics' },
      { status: 500 },
    );
  }
}
