import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { BADGES, type BadgeDefinition } from '@/lib/badges';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// ── Helpers ──

interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

/** Profile fields we consider required for the "profile-complete" badge. */
const REQUIRED_PROFILE_FIELDS = [
  'displayName',
  'firstName',
  'lastName',
  'email',
  'photoURL',
  'bio',
  'phone',
  'occupation',
  'employer',
  'interests',
] as const;

/** The founding year cutoff — members who joined before this date qualify. */
const FOUNDING_YEAR_END = '2025-12-31T23:59:59.999Z';

// ── GET /api/portal/badges ──

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(
    getRateLimitKey(request, 'portal-badges'),
    { max: 30, windowSec: 60 },
  );
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    // Auth
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Determine target member (defaults to self)
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || uid;

    // Fetch member document
    const memberDoc = await adminDb.collection('members').doc(memberId).get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = memberDoc.data()!;

    // Gather data in parallel
    const [rsvpSnap, serviceSnap, postsSnap, committeeSnap, duesSnap] =
      await Promise.all([
        // RSVPs by this member with status "going"
        adminDb
          .collection('rsvps')
          .where('memberId', '==', memberId)
          .where('status', '==', 'going')
          .get(),

        // Approved service hours
        adminDb
          .collection('serviceHours')
          .where('memberId', '==', memberId)
          .where('status', '==', 'approved')
          .get(),

        // Posts authored by this member
        adminDb
          .collection('posts')
          .where('authorId', '==', memberId)
          .limit(1)
          .get(),

        // Committees where this member is listed
        adminDb
          .collection('committees')
          .where('memberIds', 'array-contains', memberId)
          .limit(1)
          .get(),

        // Dues payments for this member
        adminDb
          .collection('memberDues')
          .where('memberId', '==', memberId)
          .get(),
      ]);

    // ── Compute earned badges ──

    const earned: EarnedBadge[] = [];
    const now = new Date().toISOString();

    // — Engagement —
    const rsvpCount = rsvpSnap.size;

    if (rsvpCount >= 1) {
      // Use the earliest RSVP's updatedAt as the earned date
      const earliest = rsvpSnap.docs
        .map((d) => serializeDoc(d.data()))
        .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''))[0];
      earned.push({ badgeId: 'first-event', earnedAt: earliest?.updatedAt || now });
    }
    if (rsvpCount >= 5) {
      const sorted = rsvpSnap.docs
        .map((d) => serializeDoc(d.data()))
        .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
      earned.push({ badgeId: 'event-regular', earnedAt: sorted[4]?.updatedAt || now });
    }
    if (rsvpCount >= 20) {
      const sorted = rsvpSnap.docs
        .map((d) => serializeDoc(d.data()))
        .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
      earned.push({ badgeId: 'event-champion', earnedAt: sorted[19]?.updatedAt || now });
    }

    // — Service —
    const approvedHours = serviceSnap.docs.reduce((sum, doc) => {
      return sum + (doc.data().hours || 0);
    }, 0);

    if (approvedHours > 0) {
      const earliest = serviceSnap.docs
        .map((d) => serializeDoc(d.data()))
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0];
      earned.push({ badgeId: 'first-hours', earnedAt: earliest?.createdAt || now });
    }
    if (approvedHours >= 10) {
      earned.push({ badgeId: '10-hours', earnedAt: now });
    }
    if (approvedHours >= 40) {
      earned.push({ badgeId: '40-hours', earnedAt: now });
    }

    // — Community —
    if (!postsSnap.empty) {
      const post = serializeDoc(postsSnap.docs[0].data());
      earned.push({ badgeId: 'first-post', earnedAt: post.createdAt || now });
    }

    // Profile complete — check all required fields are populated
    const isProfileComplete = REQUIRED_PROFILE_FIELDS.every((field) => {
      const val = member[field];
      if (Array.isArray(val)) return val.length > 0;
      return !!val;
    });
    if (isProfileComplete) {
      earned.push({ badgeId: 'profile-complete', earnedAt: member.updatedAt || now });
    }

    // Committee membership
    if (!committeeSnap.empty) {
      earned.push({ badgeId: 'connector', earnedAt: now });
    }

    // — Milestones —

    // Dues paid on time — check if any dues record has paidAt within 30 days of cycle start
    for (const dDoc of duesSnap.docs) {
      const dues = serializeDoc(dDoc.data());
      if (['PAID', 'PAID_OFFLINE', 'WAIVED'].includes(dues.status) && dues.paidAt) {
        // Look up the cycle to check timing
        if (dues.cycleId) {
          try {
            const cycleDoc = await adminDb.collection('duesCycles').doc(dues.cycleId).get();
            if (cycleDoc.exists) {
              const cycle = serializeDoc(cycleDoc.data()!);
              const cycleStart = new Date(cycle.startDate);
              const paidDate = new Date(dues.paidAt);
              const diffDays = (paidDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24);
              if (diffDays <= 30) {
                earned.push({ badgeId: 'dues-ontime', earnedAt: dues.paidAt });
                break; // only need one qualifying payment
              }
            }
          } catch {
            // skip if cycle not found
          }
        }
      }
    }

    // Anniversary — member for 1+ year
    const joinedAt = member.joinedAt;
    if (joinedAt) {
      const joinDate = new Date(joinedAt);
      const oneYearLater = new Date(joinDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      if (new Date() >= oneYearLater) {
        earned.push({ badgeId: 'one-year', earnedAt: oneYearLater.toISOString() });
      }
    }

    // Founding member — joined before the end of the founding year
    if (joinedAt && joinedAt <= FOUNDING_YEAR_END) {
      earned.push({ badgeId: 'founding', earnedAt: joinedAt });
    }

    return NextResponse.json({
      badges: earned,
      available: BADGES as BadgeDefinition[],
    });
  } catch (error) {
    console.error('Error computing badges:', error);
    return NextResponse.json({ error: 'Failed to compute badges' }, { status: 500 });
  }
}
