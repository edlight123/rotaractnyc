/**
 * Cron endpoint for automated event reminders.
 *
 * Vercel Cron hits this via GET with an Authorization: Bearer <CRON_SECRET> header.
 * For each published event in the next 3 days, finds RSVP'd members ('going' or
 * 'maybe') and sends a reminder email — deduped via the `event_reminders_sent`
 * collection so each user receives at most one reminder per event.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/send';
import { eventReminderEmail } from '@/lib/email/templates';

// ── Helpers ────────────────────────────────────────────────────────────────

function authorize(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  const token = header.replace('Bearer ', '');
  return !!process.env.CRON_SECRET && token === process.env.CRON_SECRET;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'America/New_York',
});

function formatEventDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let eventCount = 0;

  try {
    // 1. Find published events happening in the next 3 days
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const eventsSnap = await adminDb
      .collection('events')
      .where('status', '==', 'published')
      .where('date', '>=', now.toISOString())
      .where('date', '<=', threeDaysFromNow.toISOString())
      .get();

    eventCount = eventsSnap.size;

    // 2. Process each upcoming event
    for (const eventDoc of eventsSnap.docs) {
      // Field names mirror the RotaractEvent shape in types/index.ts. The time
      // of day is `time`, not `startTime` — reading the latter put "undefined"
      // in the reminder email where the start time should be.
      const event = eventDoc.data() as {
        title: string;
        date: string;
        time: string;
        location: string;
        status: string;
      };

      // 2a. Find RSVPs for this event where status is 'going' or 'maybe'
      const rsvpsSnap = await adminDb
        .collection('rsvps')
        .where('eventId', '==', eventDoc.id)
        .where('status', 'in', ['going', 'maybe'])
        .get();

      // 2b. Process each RSVP'd member
      for (const rsvpDoc of rsvpsSnap.docs) {
        // An RSVP identifies its member with `memberId` (see the RSVP
        // interface in types/index.ts and the writer in
        // /api/portal/events/rsvp). This read used `userId`, which is always
        // undefined — every lookup below then failed and no member ever
        // received an event reminder.
        const rsvp = rsvpDoc.data() as {
          eventId: string;
          memberId: string;
          status: string;
        };

        // Guard explicitly rather than letting `.doc(undefined)` throw into
        // the catch below, which is what hid the bug: the failure surfaced
        // only as an incremented error count.
        if (!rsvp.memberId) {
          console.warn(
            `[event-reminders] RSVP ${rsvpDoc.id} has no memberId, skipping.`,
          );
          skipped++;
          continue;
        }

        try {
          // 2c. Check if a reminder was already sent for this event+user combo
          const dedupId = `${eventDoc.id}_${rsvp.memberId}`;
          const dedupSnap = await adminDb
            .collection('event_reminders_sent')
            .doc(dedupId)
            .get();

          if (dedupSnap.exists) {
            skipped++;
            continue;
          }

          // Look up the member's email and name
          const userSnap = await adminDb
            .collection('members')
            .doc(rsvp.memberId)
            .get();

          if (!userSnap.exists) {
            console.warn(
              `[event-reminders] User ${rsvp.memberId} not found, skipping.`,
            );
            skipped++;
            continue;
          }

          const user = userSnap.data() as {
            email: string;
            displayName: string;
            status: string;
          };

          if (user.status !== 'active') {
            skipped++;
            continue;
          }

          // 2d. Send the reminder email
          const formattedDate = formatEventDate(event.date);
          const email = eventReminderEmail(user.displayName, {
            title: event.title,
            date: formattedDate,
            time: event.time,
            location: event.location,
          });

          const result = await sendEmail({
            to: user.email,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });

          if (!result.success) {
            errors++;
            continue;
          }

          // 2e. Create the dedup record
          await adminDb
            .collection('event_reminders_sent')
            .doc(dedupId)
            .set({
              eventId: eventDoc.id,
              memberId: rsvp.memberId,
              sentAt: new Date().toISOString(),
            });

          sent++;
        } catch (err) {
          console.error(
            `[event-reminders] Error sending reminder for event ${eventDoc.id}, member ${rsvp.memberId}:`,
            err,
          );
          errors++;
        }
      }
    }

    // 3. Write an audit log entry
    await adminDb.collection('activity_logs').add({
      action: 'event_reminder_cron',
      metadata: { events: eventCount, sent, skipped, errors },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      events: eventCount,
      reminders: { sent, skipped, errors },
    });
  } catch (err) {
    console.error('[event-reminders] Fatal cron error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 },
    );
  }
}
