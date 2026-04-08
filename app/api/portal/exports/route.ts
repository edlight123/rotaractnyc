import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// ─── CSV helpers ────────────────────────────────────────────────────────────

/**
 * Escape a single CSV field. Wraps in double quotes if the value contains
 * commas, double quotes, or newlines, doubling any internal quotes per RFC 4180.
 */
function escapeCsvField(value: string): string {
  if (!value) return '';
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV string from a header row and data rows. */
function buildCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Safely read a value from a Firestore document, returning an empty string for
 * null / undefined. Firestore Timestamps are converted to ISO strings.
 */
function safeField(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  // Firestore admin Timestamp
  if (typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }
  // Already-serialised admin Timestamp { _seconds, _nanoseconds }
  if (
    typeof value === 'object' &&
    '_seconds' in (value as any) &&
    '_nanoseconds' in (value as any)
  ) {
    const ts = value as { _seconds: number; _nanoseconds: number };
    return new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6).toISOString();
  }
  return String(value);
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('rotaract_portal_session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');
  return adminAuth.verifySessionCookie(sessionCookie, true);
}

async function getMemberRole(uid: string): Promise<string | undefined> {
  const snap = await adminDb.collection('members').doc(uid).get();
  return snap.data()?.role as string | undefined;
}

// ─── Exporters ──────────────────────────────────────────────────────────────

async function exportMembers(): Promise<string> {
  const snapshot = await adminDb.collection('members').orderBy('displayName').get();

  const headers = [
    'Name', 'Email', 'Role', 'Status', 'Member Type',
    'Committee', 'Joined Date', 'Alumni Since', 'Phone', 'Occupation', 'Employer',
  ];

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return [
      safeField(d.displayName),
      safeField(d.email),
      safeField(d.role),
      safeField(d.status),
      safeField(d.memberType),
      safeField(d.committee),
      safeField(d.joinedDate ?? d.createdAt),
      safeField(d.alumniSince),
      safeField(d.phone),
      safeField(d.occupation),
      safeField(d.employer),
    ];
  });

  return buildCsv(headers, rows);
}

async function exportDues(): Promise<string> {
  const duesSnapshot = await adminDb.collection('memberDues').get();

  // Batch-fetch unique member IDs for name resolution
  const memberIds = Array.from(new Set(duesSnapshot.docs.map((d) => d.data().memberId).filter(Boolean)));
  const memberMap = new Map<string, { displayName: string; email: string }>();

  // Firestore `in` queries accept max 30 values; chunk accordingly
  for (let i = 0; i < memberIds.length; i += 30) {
    const chunk = memberIds.slice(i, i + 30);
    const snap = await adminDb
      .collection('members')
      .where('__name__', 'in', chunk)
      .get();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      memberMap.set(doc.id, {
        displayName: data.displayName || '',
        email: data.email || '',
      });
    });
  }

  const headers = [
    'Member Name', 'Email', 'Cycle', 'Amount', 'Status', 'Paid At', 'Payment Method',
  ];

  const rows = duesSnapshot.docs.map((doc) => {
    const d = doc.data();
    const member = memberMap.get(d.memberId) || { displayName: '', email: '' };
    return [
      safeField(member.displayName),
      safeField(member.email),
      safeField(d.cycle ?? d.cycleId),
      safeField(d.amount),
      safeField(d.status),
      safeField(d.paidAt),
      safeField(d.paymentMethod),
    ];
  });

  return buildCsv(headers, rows);
}

async function exportRsvps(eventId?: string): Promise<string> {
  let query: FirebaseFirestore.Query = adminDb.collection('rsvps');
  if (eventId) {
    query = query.where('eventId', '==', eventId);
  }
  const rsvpSnapshot = await query.get();

  // Batch-fetch event titles for denormalisation
  const eventIds = Array.from(new Set(rsvpSnapshot.docs.map((d) => d.data().eventId).filter(Boolean)));
  const eventMap = new Map<string, string>();

  for (let i = 0; i < eventIds.length; i += 30) {
    const chunk = eventIds.slice(i, i + 30);
    const snap = await adminDb
      .collection('events')
      .where('__name__', 'in', chunk)
      .get();
    snap.docs.forEach((doc) => {
      eventMap.set(doc.id, doc.data().title || doc.data().name || '');
    });
  }

  // Batch-fetch member names
  const memberIds = Array.from(new Set(rsvpSnapshot.docs.map((d) => d.data().memberId).filter(Boolean)));
  const memberMap = new Map<string, string>();

  for (let i = 0; i < memberIds.length; i += 30) {
    const chunk = memberIds.slice(i, i + 30);
    const snap = await adminDb
      .collection('members')
      .where('__name__', 'in', chunk)
      .get();
    snap.docs.forEach((doc) => {
      memberMap.set(doc.id, doc.data().displayName || '');
    });
  }

  const headers = [
    'Event ID', 'Event Title', 'Member Name', 'RSVP Status', 'Checked In', 'Checked In At',
  ];

  const rows = rsvpSnapshot.docs.map((doc) => {
    const d = doc.data();
    return [
      safeField(d.eventId),
      safeField(eventMap.get(d.eventId) || d.eventTitle || ''),
      safeField(memberMap.get(d.memberId) || d.memberName || ''),
      safeField(d.status),
      safeField(d.checkedIn),
      safeField(d.checkedInAt),
    ];
  });

  return buildCsv(headers, rows);
}

async function exportAttendance(): Promise<string> {
  const snapshot = await adminDb
    .collection('rsvps')
    .where('checkedIn', '==', true)
    .get();

  // Batch-fetch event titles
  const eventIds = Array.from(new Set(snapshot.docs.map((d) => d.data().eventId).filter(Boolean)));
  const eventMap = new Map<string, string>();

  for (let i = 0; i < eventIds.length; i += 30) {
    const chunk = eventIds.slice(i, i + 30);
    const snap = await adminDb
      .collection('events')
      .where('__name__', 'in', chunk)
      .get();
    snap.docs.forEach((doc) => {
      eventMap.set(doc.id, doc.data().title || doc.data().name || '');
    });
  }

  // Batch-fetch member names
  const memberIds = Array.from(new Set(snapshot.docs.map((d) => d.data().memberId).filter(Boolean)));
  const memberMap = new Map<string, string>();

  for (let i = 0; i < memberIds.length; i += 30) {
    const chunk = memberIds.slice(i, i + 30);
    const snap = await adminDb
      .collection('members')
      .where('__name__', 'in', chunk)
      .get();
    snap.docs.forEach((doc) => {
      memberMap.set(doc.id, doc.data().displayName || '');
    });
  }

  const headers = ['Event Title', 'Member Name', 'Checked In At'];

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return [
      safeField(eventMap.get(d.eventId) || d.eventTitle || ''),
      safeField(memberMap.get(d.memberId) || d.memberName || ''),
      safeField(d.checkedInAt),
    ];
  });

  return buildCsv(headers, rows);
}

async function exportServiceHours(): Promise<string> {
  const snapshot = await adminDb.collection('serviceHours').get();

  const headers = ['Member Name', 'Event Title', 'Hours', 'Status', 'Submitted Date'];

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return [
      safeField(d.memberName),
      safeField(d.eventTitle),
      safeField(d.hours),
      safeField(d.status),
      safeField(d.createdAt),
    ];
  });

  return buildCsv(headers, rows);
}

// ─── GET /api/portal/exports?type=... ───────────────────────────────────────

const VALID_TYPES = ['members', 'dues', 'rsvps', 'attendance', 'service-hours'] as const;
type ExportType = (typeof VALID_TYPES)[number];

export async function GET(request: NextRequest) {
  // Rate limit: 5 requests per 60 seconds
  const rateLimitResult = await rateLimit(getRateLimitKey(request, 'exports'), { max: 5, windowSec: 60 });
  if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.resetAt);

  try {
    // Auth — board, president, or treasurer only
    const decoded = await verifySession();
    const role = await getMemberRole(decoded.uid);
    if (!role || !['board', 'president', 'treasurer'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExportType | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid export type. Must be one of: ${VALID_TYPES.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let csvContent: string;

    switch (type) {
      case 'members':
        csvContent = await exportMembers();
        break;
      case 'dues':
        csvContent = await exportDues();
        break;
      case 'rsvps': {
        const eventId = searchParams.get('eventId') || undefined;
        csvContent = await exportRsvps(eventId);
        break;
      }
      case 'attendance':
        csvContent = await exportAttendance();
        break;
      case 'service-hours':
        csvContent = await exportServiceHours();
        break;
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
