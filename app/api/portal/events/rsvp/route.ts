import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { eventHasEnded } from '@/lib/utils/eventTime';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email/send';
import { memberRsvpConfirmationEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { incrementTierSoldCount, decrementTierSoldCount } from '@/lib/services/tierTracking';

// RSVP to an event
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'portal-rsvp'), { max: 20, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);
    const body = await request.json();
    const { eventId, status, tierId } = body;

    if (!eventId || !status) {
      return NextResponse.json({ error: 'Event ID and status are required' }, { status: 400 });
    }

    const VALID_RSVP_STATUSES = ['going', 'maybe', 'not_going'];
    if (!VALID_RSVP_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid RSVP status. Must be one of: ${VALID_RSVP_STATUSES.join(', ')}` }, { status: 400 });
    }

    // Registration closes once the event has ended (cancelling stays allowed).
    if (status === 'going' || status === 'maybe') {
      const endedCheck = await adminDb.collection('events').doc(eventId).get();
      if (endedCheck.exists && eventHasEnded(endedCheck.data() as { date?: string; endDate?: string })) {
        return NextResponse.json({ error: 'This event has ended — registration is closed.' }, { status: 410 });
      }
    }

    // P0 #2: If tierId is provided, validate it belongs to the event's pricing tiers
    if (tierId) {
      const eventDoc = await adminDb.collection('events').doc(eventId).get();
      if (eventDoc.exists) {
        const pricing = eventDoc.data()?.pricing;
        if (!pricing?.tiers?.length) {
          return NextResponse.json({ error: 'This event does not have ticket tiers.' }, { status: 400 });
        }
        const tier = pricing.tiers.find((t: any) => t.id === tierId);
        if (!tier) {
          return NextResponse.json({ error: 'Invalid tier selected.' }, { status: 400 });
        }
        // Check tier capacity and deadline
        const now = new Date();
        if (tier.deadline && new Date(tier.deadline) < now) {
          return NextResponse.json({ error: `The "${tier.label}" tier has expired.` }, { status: 409 });
        }
        if (tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity) {
          return NextResponse.json({ error: `The "${tier.label}" tier is sold out.` }, { status: 409 });
        }
      }
    }

    // Read existing RSVP to track tier sold-count changes
    const rsvpRef = adminDb.collection('rsvps').doc(`${uid}_${eventId}`);
    const existingDoc = await rsvpRef.get();
    const prevStatus = existingDoc.exists ? existingDoc.data()?.status : null;
    const prevTierId = existingDoc.exists ? existingDoc.data()?.tierId : null;

    // Upsert RSVP — include tierId (P0 #2)
    await rsvpRef.set(
      {
        memberId: uid,
        eventId,
        status, // going | maybe | not_going
        ...(tierId ? { tierId } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Adjust tier sold count when status or tierId changes
    const wasGoing = prevStatus === 'going';
    const nowGoing = status === 'going';
    const tierChanged = tierId && prevTierId && tierId !== prevTierId;

    if (tierChanged) {
      // Switched tiers: decrement old tier, increment new tier
      if (wasGoing && nowGoing) {
        await Promise.all([
          decrementTierSoldCount(eventId, prevTierId),
          incrementTierSoldCount(eventId, tierId),
        ]);
      } else if (wasGoing && !nowGoing) {
        // Un-RSVP with tier change: just decrement old
        await decrementTierSoldCount(eventId, prevTierId);
      } else if (!wasGoing && nowGoing) {
        // New RSVP with tier: just increment new
        await incrementTierSoldCount(eventId, tierId);
      }
    } else if (prevTierId) {
      if (!wasGoing && nowGoing) {
        // Re-attending with same tier → increment
        await incrementTierSoldCount(eventId, prevTierId);
      } else if (wasGoing && !nowGoing) {
        // Cancelling → decrement to free up the spot
        await decrementTierSoldCount(eventId, prevTierId);
      }
    }

    // Update attendeeCount on the event document based on RSVP status change
    if (!wasGoing && nowGoing) {
      try {
        await adminDb.collection('events').doc(eventId).update({
          attendeeCount: FieldValue.increment(1),
        });
      } catch (err) {
        console.error('Failed to increment attendeeCount:', err);
      }
    } else if (wasGoing && !nowGoing) {
      try {
        await adminDb.collection('events').doc(eventId).update({
          attendeeCount: FieldValue.increment(-1),
        });
      } catch (err) {
        console.error('Failed to decrement attendeeCount:', err);
      }
    }

    // Send RSVP confirmation email when a member RSVPs as 'going' for the first time
    if (nowGoing && !wasGoing) {
      try {
        const [userRecord, eventDoc] = await Promise.all([
          adminAuth.getUser(uid),
          adminDb.collection('events').doc(eventId).get(),
        ]);
        if (userRecord.email && eventDoc.exists) {
          const ev = eventDoc.data()!;
          const content = memberRsvpConfirmationEmail(
            userRecord.displayName || 'Member',
            {
              title: ev.title || 'Event',
              date: ev.date || '',
              time: ev.time || '',
              location: ev.location || '',
              slug: ev.slug || eventId,
            },
          );
          await sendEmail({ to: userRecord.email, subject: content.subject, html: content.html, text: content.text });
        }
      } catch (emailErr) {
        // Non-blocking — log but don't fail the RSVP
        console.error('RSVP confirmation email failed (non-blocking):', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing RSVP:', error);
    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 });
  }
}
