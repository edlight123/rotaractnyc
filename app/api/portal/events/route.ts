import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, serializeDoc } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import type { RecurrenceRule, RecurrenceFrequency } from '@/types';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

// ─── Recurrence helper ───

function generateRecurrenceDates(
  startDate: Date,
  rule: RecurrenceRule,
): Date[] {
  const dates: Date[] = [];
  const maxOccurrences = Math.min(rule.occurrences || 52, 52);
  const endDate = rule.endDate ? new Date(rule.endDate) : null;

  const freq = rule.frequency;
  const daysOfWeek = rule.daysOfWeek || [startDate.getDay()];

  // Helper to add days
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  if (freq === 'daily') {
    let current = new Date(startDate);
    while (dates.length < maxOccurrences) {
      if (endDate && current > endDate) break;
      dates.push(new Date(current));
      current = addDays(current, rule.interval || 1);
    }
  } else if (freq === 'weekly' || freq === 'biweekly') {
    const weekStep = freq === 'biweekly' ? 2 : (rule.interval || 1);
    // Start from the week of startDate
    let weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // move to Sunday

    outer:
    while (dates.length < maxOccurrences) {
      for (const dow of daysOfWeek.sort((a, b) => a - b)) {
        const candidate = addDays(weekStart, dow);
        if (candidate < startDate) continue; // skip days before start
        if (endDate && candidate > endDate) break outer;
        if (dates.length >= maxOccurrences) break outer;
        dates.push(candidate);
      }
      weekStart = addDays(weekStart, 7 * weekStep);
    }
  } else if (freq === 'monthly') {
    const current = new Date(startDate);
    const dayOfMonth = rule.dayOfMonth || startDate.getDate();
    while (dates.length < maxOccurrences) {
      // Set to the right day of month (handle months with fewer days)
      const candidate = new Date(current.getFullYear(), current.getMonth(), Math.min(dayOfMonth, new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()));
      if (candidate < startDate) {
        current.setMonth(current.getMonth() + (rule.interval || 1));
        continue;
      }
      if (endDate && candidate > endDate) break;
      dates.push(candidate);
      current.setMonth(current.getMonth() + (rule.interval || 1));
    }
  }

  return dates;
}

/**
 * Verify the session cookie and return the authenticated user's uid and member data.
 * Throws if unauthorized.
 */
async function getAuthenticatedMember(requireAdmin = false) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) {
    throw { status: 401, message: 'Unauthorized — please sign in.' };
  }

  const { uid } = await adminAuth.verifySessionCookie(sessionCookie, true);

  const memberDoc = await adminDb.collection('members').doc(uid).get();
  if (!memberDoc.exists) {
    throw { status: 403, message: 'Member profile not found.' };
  }

  const member = memberDoc.data()!;

  if (requireAdmin && !ADMIN_ROLES.includes(member.role)) {
    throw { status: 403, message: 'You do not have permission to manage events.' };
  }

  return { uid, member };
}

// ─── GET: Fetch a single event by id, or all events for portal ───

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedMember(false);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const doc = await adminDb.collection('events').doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      return NextResponse.json(serializeDoc({ id: doc.id, ...doc.data() }));
    }

    // Return all events (no public/status filter — portal sees everything)
    const snap = await adminDb
      .collection('events')
      .orderBy('date', 'desc')
      .limit(100)
      .get();

    const events = snap.docs.map((d) => serializeDoc({ id: d.id, ...d.data() }));
    return NextResponse.json(events);
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json(
      { error: err.message || 'Failed to fetch events' },
      { status },
    );
  }
}

// ─── POST: Create a new event ───

export async function POST(request: NextRequest) {
  try {
    const { uid } = await getAuthenticatedMember(true);
    const body = await request.json();

    const {
      title,
      slug,
      description,
      date,
      endDate,
      time,
      endTime,
      location,
      address,
      type,
      pricing,
      imageURL,
      tags,
      capacity,
      isPublic,
      status,
      isRecurring,
      recurrence,
    } = body;

    // Validate required fields
    if (!title || !date || !time || !location) {
      return NextResponse.json(
        { error: 'Title, date, time, and location are required.' },
        { status: 400 },
      );
    }

    // Ensure slug uniqueness
    let eventSlug = slug || title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const existing = await adminDb
      .collection('events')
      .where('slug', '==', eventSlug)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Append a short suffix to make it unique
      eventSlug = `${eventSlug}-${Date.now().toString(36)}`;
    }

    const eventData = {
      title,
      slug: eventSlug,
      description: description || '',
      date,
      endDate: endDate || null,
      time,
      endTime: endTime || null,
      location,
      address: address || null,
      type: type || 'free',
      pricing: pricing || null,
      imageURL: imageURL || null,
      tags: tags || [],
      capacity: capacity || null,
      attendeeCount: 0,
      isPublic: isPublic ?? true,
      status: status || 'draft',
      isRecurring: isRecurring || false,
      recurrence: isRecurring && recurrence ? recurrence : null,
      recurrenceParentId: null,
      occurrenceIndex: isRecurring ? 0 : null,
      createdBy: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await adminDb.collection('events').add(eventData);
    const parentId = ref.id;

    // ── Generate recurring occurrences ──
    const createdEvents: Array<{ id: string; [k: string]: any }> = [{ id: parentId, ...eventData }];

    if (isRecurring && recurrence) {
      const startDate = new Date(date);
      const occurrenceDates = generateRecurrenceDates(startDate, recurrence);

      // Skip the first date (it's the parent event)
      const childDates = occurrenceDates.slice(1);
      const batch = adminDb.batch();

      for (let i = 0; i < childDates.length; i++) {
        const occDate = childDates[i];
        // Preserve original time
        const [origHours, origMinutes] = date.includes('T')
          ? [startDate.getUTCHours(), startDate.getUTCMinutes()]
          : [0, 0];
        occDate.setHours(origHours, origMinutes, 0, 0);

        const childSlug = `${eventSlug}-${i + 2}`;
        const childData = {
          ...eventData,
          slug: childSlug,
          date: occDate.toISOString(),
          endDate: null, // occurrences are single-day by default
          recurrenceParentId: parentId,
          occurrenceIndex: i + 1,
          attendeeCount: 0,
        };

        const childRef = adminDb.collection('events').doc();
        batch.set(childRef, childData);
        createdEvents.push({ id: childRef.id, ...childData });
      }

      if (childDates.length > 0) {
        await batch.commit();
      }
    }

    return NextResponse.json(
      { id: parentId, ...eventData, totalOccurrences: createdEvents.length },
      { status: 201 },
    );
  } catch (err: any) {
    console.error('Create event error:', err);
    const status = err.status || 500;
    return NextResponse.json(
      { error: err.message || 'Failed to create event' },
      { status },
    );
  }
}

// ─── PATCH: Update an existing event ───

export async function PATCH(request: NextRequest) {
  try {
    await getAuthenticatedMember(true);
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    const docRef = adminDb.collection('events').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    // If slug is being changed, ensure uniqueness
    if (updates.slug && updates.slug !== doc.data()?.slug) {
      const existing = await adminDb
        .collection('events')
        .where('slug', '==', updates.slug)
        .limit(1)
        .get();
      if (!existing.empty) {
        updates.slug = `${updates.slug}-${Date.now().toString(36)}`;
      }
    }

    await docRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const updated = await docRef.get();
    return NextResponse.json(serializeDoc({ id: updated.id, ...updated.data() }));
  } catch (err: any) {
    console.error('Update event error:', err);
    const status = err.status || 500;
    return NextResponse.json(
      { error: err.message || 'Failed to update event' },
      { status },
    );
  }
}

// ─── DELETE: Remove an event ───

export async function DELETE(request: NextRequest) {
  try {
    await getAuthenticatedMember(true);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    const docRef = adminDb.collection('events').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    // Also delete associated RSVPs
    const rsvpSnap = await adminDb
      .collection('rsvps')
      .where('eventId', '==', id)
      .get();

    const batch = adminDb.batch();
    batch.delete(docRef);
    rsvpSnap.docs.forEach((rsvp) => batch.delete(rsvp.ref));

    // If this is a parent recurring event, delete all child occurrences too
    const eventData = doc.data();
    if (eventData?.isRecurring && !eventData?.recurrenceParentId) {
      const childSnap = await adminDb
        .collection('events')
        .where('recurrenceParentId', '==', id)
        .get();
      for (const child of childSnap.docs) {
        batch.delete(child.ref);
        // Delete child RSVPs
        const childRsvps = await adminDb
          .collection('rsvps')
          .where('eventId', '==', child.id)
          .get();
        childRsvps.docs.forEach((rsvp) => batch.delete(rsvp.ref));
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Event deleted.' });
  } catch (err: any) {
    console.error('Delete event error:', err);
    const status = err.status || 500;
    return NextResponse.json(
      { error: err.message || 'Failed to delete event' },
      { status },
    );
  }
}
