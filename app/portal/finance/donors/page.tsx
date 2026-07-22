'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { apiGet } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils/format';

/**
 * Donors CRM — board, president, treasurer.
 *
 * Aggregates the global `donors` collection (one row per donor email,
 * maintained by the Stripe webhook). For per-event donation breakdowns,
 * see the event detail page's "Donations Received" panel.
 */

interface DonorRow {
  id: string;
  name: string;
  email: string;
  totalDonatedCents: number;
  totalDonationCount: number;
  lastDonationDate: string;
  lastDonationAmountCents: number;
  createdAt: string;
}

interface DonorsSummary {
  donorCount: number;
  totalRaisedCents: number;
  totalDonationCount: number;
}

const ALLOWED_ROLES = ['board', 'president', 'treasurer'];

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function exportCsv(rows: DonorRow[]) {
  const headers = ['Name', 'Email', 'Total Donated', 'Donation Count', 'Last Donation', 'Last Amount', 'First Seen'];
  const lines = [headers.join(',')];
  for (const d of rows) {
    const cells = [
      d.name,
      d.email,
      (d.totalDonatedCents / 100).toFixed(2),
      String(d.totalDonationCount),
      d.lastDonationDate || '',
      (d.lastDonationAmountCents / 100).toFixed(2),
      d.createdAt || '',
    ].map((v) => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(cells.join(','));
  }
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `donors-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DonorsPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [summary, setSummary] = useState<DonorsSummary | null>(null);
  const [search, setSearch] = useState('');

  const hasAccess = !!member && ALLOWED_ROLES.includes(member.role);

  useEffect(() => {
    if (!member) return; // wait for auth resolution
    if (!hasAccess) { setForbidden(true); setLoading(false); return; }
    apiGet('/api/portal/donors')
      .then((data) => {
        setDonors(Array.isArray(data?.donors) ? data.donors : []);
        if (data?.summary) setSummary(data.summary);
      })
      .catch((err: any) => {
        toast(err?.message || 'Failed to load donors', 'error');
        setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, [member, hasAccess, toast]);

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  if (forbidden) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg aria-hidden="true" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-gray-500 dark:text-gray-400">Donor records are visible to board members, the president, and the treasurer only.</p>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? donors.filter((d) => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q))
    : donors;

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/portal/finance" className="hover:text-cranberry">Finance</Link>
            <span>/</span>
            <span>Donors</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Donors</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Everyone who has donated to Rotaract NYC, aggregated by email.
          </p>
        </div>
        {donors.length > 0 && (
          <button
            onClick={() => exportCsv(filtered)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cranberry hover:text-cranberry/80 border border-cranberry/30 rounded-xl px-3 py-2"
          >
            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M4 6h16M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-card p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total Raised</p>
            <p className="mt-1 text-2xl font-display font-bold text-cranberry">{formatCurrency(summary.totalRaisedCents)}</p>
          </div>
          <div className="p-card p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Donors</p>
            <p className="mt-1 text-2xl font-display font-bold text-gray-900 dark:text-white">{summary.donorCount}</p>
          </div>
          <div className="p-card p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Donations</p>
            <p className="mt-1 text-2xl font-display font-bold text-gray-900 dark:text-white">{summary.totalDonationCount}</p>
          </div>
        </div>
      )}

      {/* Search */}
      {donors.length > 0 && (
        <div>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-sm text-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cranberry/40"
          />
        </div>
      )}

      {/* Table */}
      {donors.length === 0 ? (
        <EmptyState
          title="No donors yet"
          description="Donations made through the website will appear here once received."
        />
      ) : (
        <div className="p-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Donor</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider text-right hidden sm:table-cell">Gifts</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell">Last Donation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{d.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(d.totalDonatedCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      {d.totalDonationCount}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      <span>{formatDate(d.lastDonationDate)}</span>
                      <span className="text-xs text-gray-400 ml-2">{formatCurrency(d.lastDonationAmountCents)}</span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No donors match &ldquo;{search}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
