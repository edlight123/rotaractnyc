import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// ─── Auth helpers ───────────────────────────────────────────────────────────

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) return null;
  try {
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data()!;
    return { uid, role: data.role as string };
  } catch {
    return null;
  }
}

function isBoardOrAbove(role: string): boolean {
  return ['president', 'board', 'treasurer'].includes(role);
}

// ─── Date helpers ───────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Format a Date as "Jan 2026" */
function formatMonth(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Convert a Firestore Timestamp or ISO string to a JS Date. */
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

// ─── GET /api/portal/analytics ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Rate limit: 10 requests per 60 seconds
  const rlResult = await rateLimit(getRateLimitKey(request, 'portal-analytics'), {
    max: 10,
    windowSec: 60,
  });
  if (!rlResult.allowed) return rateLimitResponse(rlResult.resetAt);

  // Auth — board/president/treasurer only
  const session = await getSession();
  if (!session || !isBoardOrAbove(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // ── Fetch all collections in parallel ────────────────────────────────
    const [usersSnap, duesSnap, eventsSnap, rsvpsSnap, serviceSnap, postsSnap] =
      await Promise.all([
        adminDb.collection('users').get(),
        adminDb.collection('dues').get(),
        adminDb.collection('events').get(),
        adminDb.collection('rsvps').get(),
        adminDb.collection('serviceHours').get(),
        adminDb.collection('posts').get(),
      ]);

    const now = new Date();
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    // ── Overview ─────────────────────────────────────────────────────────
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const totalMembers = users.length;
    const activeMembers = users.filter((u: any) => u.status === 'active').length;

    let newMembersThisMonth = 0;
    let newMembersLastMonth = 0;

    for (const u of users) {
      const joined = toDate((u as any).joinedAt);
      if (!joined) continue;
      if (joined >= thisMonthStart) newMembersThisMonth++;
      else if (joined >= lastMonthStart && joined < thisMonthStart) newMembersLastMonth++;
    }

    const memberGrowthPercent =
      newMembersLastMonth > 0
        ? Math.round(((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100)
        : newMembersThisMonth > 0
          ? 100
          : 0;

    // ── Dues ─────────────────────────────────────────────────────────────
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalRevenue = 0;

    for (const doc of duesSnap.docs) {
      const d = doc.data();
      const status = d.status as string;
      if (status === 'PAID' || status === 'PAID_OFFLINE' || status === 'WAIVED') {
        totalPaid++;
        if (status !== 'WAIVED') {
          totalRevenue += typeof d.amount === 'number' ? d.amount : 0;
        }
      } else {
        totalUnpaid++;
      }
    }

    const duesTotal = totalPaid + totalUnpaid;
    const collectionRate = duesTotal > 0 ? Math.round((totalPaid / duesTotal) * 100) : 0;

    // ── Events ───────────────────────────────────────────────────────────
    const eventsThisYear = eventsSnap.docs.filter((doc) => {
      const d = doc.data();
      const eventDate = toDate(d.date);
      return eventDate && eventDate >= yearStart;
    });

    const totalEventsThisYear = eventsThisYear.length;
    const totalAttendance = eventsThisYear.reduce((sum, doc) => {
      const d = doc.data();
      return sum + (typeof d.attendeeCount === 'number' ? d.attendeeCount : 0);
    }, 0);
    const avgAttendance =
      totalEventsThisYear > 0 ? Math.round(totalAttendance / totalEventsThisYear) : 0;

    const totalRsvps = rsvpsSnap.size;
    const checkedInCount = rsvpsSnap.docs.filter((doc) => doc.data().checkedIn === true).length;
    const checkInRate = totalRsvps > 0 ? Math.round((checkedInCount / totalRsvps) * 100) : 0;

    // ── Service Hours ────────────────────────────────────────────────────
    const hoursByMember = new Map<string, number>();

    let totalApprovedHours = 0;

    for (const doc of serviceSnap.docs) {
      const d = doc.data();
      if (d.status !== 'approved') continue;
      const hours = typeof d.hours === 'number' ? d.hours : 0;
      totalApprovedHours += hours;
      const memberId = d.memberId as string;
      hoursByMember.set(memberId, (hoursByMember.get(memberId) ?? 0) + hours);
    }

    const avgHoursPerMember = activeMembers > 0 ? Math.round((totalApprovedHours / activeMembers) * 10) / 10 : 0;

    // Build name lookup for top contributors
    const userNameMap = new Map<string, string>();
    for (const u of users) {
      userNameMap.set(u.id, (u as any).displayName || 'Unknown');
    }

    const topContributors = Array.from(hoursByMember.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([memberId, hours]) => ({
        memberId,
        memberName: userNameMap.get(memberId) || 'Unknown',
        hours,
      }));

    // ── Engagement ───────────────────────────────────────────────────────
    const profileCompleteCount = users.filter((u: any) => {
      const hasPhoto = typeof u.photoURL === 'string' && u.photoURL.trim().length > 0;
      const hasBio = typeof u.bio === 'string' && u.bio.trim().length > 0;
      return hasPhoto && hasBio;
    }).length;

    const profileCompletionRate =
      totalMembers > 0 ? Math.round((profileCompleteCount / totalMembers) * 100) : 0;

    const onboardingCompleteCount = users.filter(
      (u: any) => u.onboardingComplete === true,
    ).length;

    const onboardingCompletionRate =
      totalMembers > 0 ? Math.round((onboardingCompleteCount / totalMembers) * 100) : 0;

    const postsThisMonth = postsSnap.docs.filter((doc) => {
      const created = toDate(doc.data().createdAt);
      return created && created >= thisMonthStart;
    }).length;

    // ── Membership Trend (last 12 months) ────────────────────────────────
    const membershipTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      membershipTrend.push({ month: formatMonth(d), count: 0 });
    }

    const trendMonthSet = new Map<string, number>();
    membershipTrend.forEach((entry, idx) => trendMonthSet.set(entry.month, idx));

    for (const u of users) {
      const joined = toDate((u as any).joinedAt);
      if (!joined) continue;
      const key = formatMonth(joined);
      const idx = trendMonthSet.get(key);
      if (idx !== undefined) {
        membershipTrend[idx].count++;
      }
    }

    // ── Dues Over Time (last 3 cycles) ───────────────────────────────────
    const cycleMap = new Map<string, { paid: number; total: number }>();

    for (const doc of duesSnap.docs) {
      const d = doc.data();
      const cycle = (d.cycleName ?? d.cycle ?? d.cycleId ?? 'Unknown') as string;
      if (!cycleMap.has(cycle)) {
        cycleMap.set(cycle, { paid: 0, total: 0 });
      }
      const entry = cycleMap.get(cycle)!;
      entry.total++;
      const status = d.status as string;
      if (status === 'PAID' || status === 'PAID_OFFLINE' || status === 'WAIVED') {
        entry.paid++;
      }
    }

    // Take the last 3 cycles (by natural sort — cycle names like "2024-2025" sort chronologically)
    const duesOverTime = Array.from(cycleMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-3)
      .map(([cycle, data]) => ({
        cycle,
        paid: data.paid,
        total: data.total,
      }));

    // ── Response ─────────────────────────────────────────────────────────
    return NextResponse.json({
      overview: {
        totalMembers,
        activeMembers,
        newMembersThisMonth,
        newMembersLastMonth,
        memberGrowthPercent,
      },
      dues: {
        totalPaid,
        totalUnpaid,
        collectionRate,
        totalRevenue,
      },
      events: {
        totalEventsThisYear,
        avgAttendance,
        totalRsvps,
        checkInRate,
      },
      serviceHours: {
        totalApprovedHours,
        avgHoursPerMember,
        topContributors,
      },
      engagement: {
        profileCompletionRate,
        onboardingCompletionRate,
        postsThisMonth,
      },
      membershipTrend,
      duesOverTime,
    });
  } catch (err) {
    console.error('[GET /api/portal/analytics]', err);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
