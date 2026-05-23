'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import type { RotaractEvent } from '@/types';

interface Purchaser {
  id: string;
  kind: 'member' | 'guest';
  source?: 'transaction' | 'offline_payment' | 'rsvp' | 'guest_rsvp';
  orderId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  paymentStatus: string;
  quantity: number;
  amountCents: number;
  tierId?: string | null;
  createdAt: string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
  invitedBy?: string | null;
  notes?: string | null;
  memberId?: string | null;
}

interface Summary {
  totalRevenueCents: number;
  guestCount: number;
  memberCount: number;
  totalTickets: number;
  checkedInCount: number;
  totalAttendees?: number;
  orderCount?: number;
}

type FilterKind = 'all' | 'member' | 'guest';
type FilterPay = 'all' | 'paid' | 'free' | 'pending';
type FilterCheck = 'all' | 'checked_in' | 'not_checked_in';

export default function EventAttendeesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { member } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<RotaractEvent | null>(null);
  const [purchasers, setPurchasers] = useState<Purchaser[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<null | 'pdf' | 'csv'>(null);

  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>('all');
  const [filterPay, setFilterPay] = useState<FilterPay>('all');
  const [filterCheck, setFilterCheck] = useState<FilterCheck>('all');

  const canManage = member && ['board', 'president', 'treasurer'].includes(member.role);

  useEffect(() => {
    if (!id) return;
    if (member && !canManage) {
      toast('You do not have access to this page', 'error');
      router.replace(`/portal/events/${id}`);
      return;
    }
    if (!member) return;

    let cancelled = false;
    async function load() {
      try {
        const [eventData, purchData] = await Promise.all([
          apiGet(`/api/portal/events?id=${id}`).catch(() =>
            apiGet(`/api/events?id=${id}`).then((d) =>
              Array.isArray(d) ? d.find((e: RotaractEvent) => e.id === id) || null : d,
            ),
          ),
          apiGet(`/api/portal/events/${id}/purchasers`),
        ]);
        if (cancelled) return;
        setEvent(eventData);
        setPurchasers(purchData?.purchasers || []);
        setSummary(purchData?.summary || null);
      } catch (err: any) {
        if (!cancelled) toast(err?.message || 'Failed to load attendees', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, member, canManage, router, toast]);

  /* ── Tier label lookup ── */
  const tierLabel = (tierId?: string | null) => {
    if (!tierId || !event?.pricing?.tiers) return null;
    return event.pricing.tiers.find((t) => t.id === tierId)?.label || null;
  };

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchasers.filter((p) => {
      if (filterKind !== 'all' && p.kind !== filterKind) return false;
      if (filterCheck === 'checked_in' && !p.checkedIn) return false;
      if (filterCheck === 'not_checked_in' && p.checkedIn) return false;
      if (filterPay !== 'all') {
        const isPaid = p.paymentStatus === 'paid';
        const isFree = p.paymentStatus === 'free' || (p.amountCents === 0 && !isPaid && !p.paymentStatus.startsWith('pending'));
        const isPending = p.paymentStatus === 'pending' || p.paymentStatus === 'pending_offline';
        if (filterPay === 'paid' && !isPaid) return false;
        if (filterPay === 'free' && !isFree) return false;
        if (filterPay === 'pending' && !isPending) return false;
      }
      if (q) {
        const hay = [p.name, p.email, p.phone || ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [purchasers, search, filterKind, filterPay, filterCheck]);

  /* ── Exports ── */
  const handleExportCSV = () => {
    if (!event) return;
    setExporting('csv');
    try {
      const rows = filtered.map((p, i) => ({
        '#': i + 1,
        Name: p.name,
        Type: p.kind,
        Email: p.email,
        Phone: p.phone || '',
        Tier: tierLabel(p.tierId) || '',
        Quantity: p.quantity,
        'Amount Paid (USD)': (p.amountCents / 100).toFixed(2),
        'Payment Status': p.paymentStatus,
        'RSVP Status': p.status,
        'Checked In': p.checkedIn ? 'Yes' : 'No',
        'Checked In At': p.checkedInAt
          ? new Date(p.checkedInAt).toLocaleString()
          : '',
        'Registered At': p.createdAt
          ? new Date(p.createdAt).toLocaleString()
          : '',
        'Invited By': p.invitedBy || '',
        Notes: p.notes || '',
      }));
      const csv = Papa.unparse(rows);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (event.title || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      a.href = url;
      a.download = `attendees-${safeTitle}-${event.date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('CSV downloaded — opens in Excel');
    } catch (err: any) {
      toast(err?.message || 'CSV export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!event) return;
    setExporting('pdf');
    try {
      const [{ pdf }, { default: EventAttendeesPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/EventAttendeesPDF'),
      ]);

      const rows = filtered.map((p) => ({
        id: p.id,
        kind: p.kind,
        name: p.name,
        email: p.email,
        phone: p.phone,
        quantity: p.quantity,
        amountCents: p.amountCents,
        paymentStatus: p.paymentStatus,
        status: p.status,
        checkedIn: p.checkedIn,
        checkedInAt: p.checkedInAt,
        tierLabel: tierLabel(p.tierId),
      }));

      const totals = {
        members: filtered.filter((p) => p.kind === 'member').length,
        guests: filtered.filter((p) => p.kind === 'guest').length,
        tickets: filtered.reduce((s, p) => s + (p.quantity || 0), 0),
        revenueCents: filtered.reduce((s, p) => s + (p.amountCents || 0), 0),
        checkedIn: filtered.filter((p) => p.checkedIn).length,
      };

      const doc = (
        <EventAttendeesPDF
          eventTitle={event.title}
          eventDate={formatDate(event.date)}
          eventTime={event.time + (event.endTime ? ` – ${event.endTime}` : '')}
          eventLocation={event.location}
          generatedAt={new Date().toLocaleString()}
          rows={rows}
          totals={totals}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (event.title || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      a.href = url;
      a.download = `attendees-${safeTitle}-${event.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('PDF downloaded');
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast(err?.message || 'PDF export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Event not found.</p>
        <Button variant="secondary" onClick={() => router.push('/portal/events')}>
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-enter pb-20">
      {/* Back */}
      <button
        onClick={() => router.push(`/portal/events/${id}`)}
        className="group text-sm text-gray-500 hover:text-cranberry transition-colors flex items-center gap-1.5"
      >
        <svg
          aria-hidden="true"
          className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to event
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-cranberry mb-1.5">
              Attendee Roster
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white leading-tight">
              {event.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              {formatDate(event.date)}
              {event.time ? ` · ${event.time}` : ''}
              {event.location ? ` · ${event.location}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportCSV}
              loading={exporting === 'csv'}
              disabled={!!exporting}
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                />
              </svg>
              Excel (CSV)
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              loading={exporting === 'pdf'}
              disabled={!!exporting}
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Branded PDF
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <Stat label="Total" value={summary.memberCount + summary.guestCount} />
            <Stat label="Members" value={summary.memberCount} />
            <Stat label="Guests" value={summary.guestCount} />
            <Stat label="Tickets" value={summary.totalTickets} />
            <Stat label="Checked In" value={summary.checkedInCount} accent="green" />
            <Stat
              label="Revenue"
              value={formatCurrency(summary.totalRevenueCents)}
              accent="cranberry"
            />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry/30 focus:border-cranberry"
            />
          </div>
          <Select
            value={filterKind}
            onChange={(v) => setFilterKind(v as FilterKind)}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'member', label: 'Members' },
              { value: 'guest', label: 'Guests' },
            ]}
          />
          <Select
            value={filterPay}
            onChange={(v) => setFilterPay(v as FilterPay)}
            options={[
              { value: 'all', label: 'All payments' },
              { value: 'paid', label: 'Paid' },
              { value: 'free', label: 'Free' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
          <Select
            value={filterCheck}
            onChange={(v) => setFilterCheck(v as FilterCheck)}
            options={[
              { value: 'all', label: 'All check-in' },
              { value: 'checked_in', label: 'Checked in' },
              { value: 'not_checked_in', label: 'Not checked in' },
            ]}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Showing <strong className="text-gray-900 dark:text-white">{filtered.length}</strong> of{' '}
          {purchasers.length} attendees. Exports use the current filtered view.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title={purchasers.length === 0 ? 'No attendees yet' : 'No matches'}
              description={
                purchasers.length === 0
                  ? 'Once members RSVP or guests buy tickets, they will appear here.'
                  : 'Try adjusting your search or filters.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">#</th>
                  <th className="text-left font-semibold px-4 py-3">Attendee</th>
                  <th className="text-left font-semibold px-4 py-3">Type</th>
                  <th className="text-left font-semibold px-4 py-3">Contact</th>
                  <th className="text-right font-semibold px-4 py-3">Qty</th>
                  <th className="text-right font-semibold px-4 py-3">Paid</th>
                  <th className="text-center font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((p, i) => {
                  const isPaid = p.paymentStatus === 'paid';
                  const isPending = p.paymentStatus === 'pending' || p.paymentStatus === 'pending_offline';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                        {tierLabel(p.tierId) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {tierLabel(p.tierId)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            p.kind === 'member'
                              ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                              : 'text-azure-700 bg-azure-50 dark:bg-azure-900/20'
                          }`}
                        >
                          {p.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        <p className="truncate max-w-[220px]">{p.email || '—'}</p>
                        {p.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {p.quantity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                        {p.amountCents > 0 ? formatCurrency(p.amountCents) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {isPaid ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                              Paid
                            </span>
                          ) : isPending ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                              Free
                            </span>
                          )}
                          {p.checkedIn && (
                            <span
                              title={
                                p.checkedInAt
                                  ? `Checked in at ${new Date(p.checkedInAt).toLocaleString()}`
                                  : 'Checked in'
                              }
                              className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full"
                            >
                              ✓ In
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tiny UI helpers (kept local to avoid extra files) ── */
function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: 'green' | 'cranberry';
}) {
  const color =
    accent === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'cranberry'
      ? 'text-cranberry'
      : 'text-gray-900 dark:text-white';
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/60">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className={`text-xl font-display font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cranberry/30 focus:border-cranberry"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
