'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import AccountShell from '@/components/account/AccountShell';

interface DonationItem {
  amountCents: number;
  date: string | null;
  description: string;
  status: string;
}

interface DonationSummary {
  totalDonatedCents: number;
  totalDonationCount: number;
  lastDonationDate: string | null;
}

interface DonationsResponse {
  verified: boolean;
  summary: DonationSummary | null;
  donations: DonationItem[];
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function DonationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DonationsResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/account/login?redirect=/account/donations');
      return;
    }
    let cancelled = false;
    (async () => {
      setFetching(true);
      setError(null);
      try {
        const res = await fetch('/api/account/donations', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load donations');
        const json = (await res.json()) as DonationsResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('We couldn’t load your donation history. Please try again.');
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  return (
    <AccountShell title="My donations">
      {fetching ? (
        <div className="py-16 text-center text-gray-500">Loading your donations…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : !data?.verified ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="font-medium">Verify your email to see your giving history</p>
          <p className="mt-1">
            Once your email is verified we’ll show every gift tied to{' '}
            <span className="font-medium">{user?.email}</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.summary && data.summary.totalDonationCount > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total given</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(data.summary.totalDonatedCents)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="text-sm text-gray-500 dark:text-gray-400">Gifts</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.summary.totalDonationCount}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="text-sm text-gray-500 dark:text-gray-400">Last gift</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatDate(data.summary.lastDonationDate) || '—'}
                </div>
              </div>
            </div>
          )}

          {data.donations.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300">You haven’t made any donations yet.</p>
              <a href="/donate" className="btn-md btn-primary mt-4 inline-flex">
                Support our cause
              </a>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Description
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.donations.map((d, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(d.date) || '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-900 dark:text-white">{d.description}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(d.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AccountShell>
  );
}
