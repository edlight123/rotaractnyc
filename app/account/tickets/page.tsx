'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import AccountShell from '@/components/account/AccountShell';

interface Ticket {
  id: string;
  kind: 'member' | 'guest';
  eventId: string;
  eventTitle: string;
  eventSlug?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  quantity: number;
  status: string;
  paymentStatus?: string;
  checkedIn?: boolean;
  isPast: boolean;
  qrUrls: string[];
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AccountTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/account/login?redirect=/account/tickets');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/tickets');
        if (!res.ok) throw new Error('Failed to load tickets');
        const data = await res.json();
        if (!cancelled) setTickets(data.tickets || []);
      } catch {
        if (!cancelled) setError('We couldn’t load your tickets. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const upcoming = tickets?.filter((t) => !t.isPast) ?? [];
  const past = tickets?.filter((t) => t.isPast) ?? [];

  return (
    <AccountShell
      title="My tickets"
      subtitle="Show a QR code at the door for fast entry."
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {tickets === null && !error && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-cranberry" />
        </div>
      )}

      {tickets !== null && tickets.length === 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 font-medium">No tickets yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            When you register for an event, your tickets and QR codes appear here.
          </p>
          <Link href="/events" className="btn-md btn-primary mt-4 inline-flex">
            Browse events
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-4">
          {upcoming.map((t) => (
            <TicketCard key={`${t.kind}-${t.id}`} ticket={t} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Past events
          </h2>
          <div className="space-y-3">
            {past.map((t) => (
              <div
                key={`${t.kind}-${t.id}`}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t.eventTitle}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(t.eventDate)}
                    {t.quantity > 1 ? ` · ${t.quantity} tickets` : ''}
                  </p>
                </div>
                {t.checkedIn && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    Attended
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </AccountShell>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-gray-900 dark:text-white">
            {ticket.eventTitle}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {formatDate(ticket.eventDate)}
            {ticket.eventTime ? ` · ${ticket.eventTime}` : ''}
          </p>
          {ticket.eventLocation && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {ticket.eventLocation}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry text-xs font-semibold px-3 py-1">
          {ticket.quantity > 1 ? `${ticket.quantity} tickets` : '1 ticket'}
        </span>
      </div>

      {ticket.checkedIn ? (
        <div className="px-5 py-6 text-center">
          <p className="text-green-600 dark:text-green-400 font-semibold">
            ✓ Checked in
          </p>
        </div>
      ) : ticket.qrUrls.length > 0 ? (
        <div className="px-5 py-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
            Present at entry
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            {ticket.qrUrls.map((url, i) => (
              <figure key={url} className="text-center">
                {ticket.qrUrls.length > 1 && (
                  <figcaption className="text-xs font-semibold text-cranberry mb-1.5">
                    Ticket {i + 1} of {ticket.qrUrls.length}
                  </figcaption>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Check-in QR code (ticket ${i + 1} of ${ticket.qrUrls.length})`}
                  width={170}
                  height={170}
                  className="rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </figure>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          QR code unavailable. Please contact us if you need help at the door.
        </div>
      )}
    </div>
  );
}
