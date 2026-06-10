import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { EventDonation, DonationSummary } from './types';

interface EventDonationsPanelProps {
  acceptsDonations?: boolean;
  donations: EventDonation[];
  summary: DonationSummary | null;
}

/**
 * Admin-only "Donations Received" panel. Hidden when the event doesn't accept
 * donations or there are none yet, keeping the page clean for ticket-only
 * events. Shows total raised (with optional goal progress) and each donation
 * with an optional donor message.
 */
export default function EventDonationsPanel({ acceptsDonations, donations, summary }: EventDonationsPanelProps) {
  if (!acceptsDonations || donations.length === 0 || !summary) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white text-lg">
          Donations Received
          <span className="text-gray-400 dark:text-gray-500 font-normal text-base ml-2">
            ({summary.eventTotalCount} {summary.eventTotalCount === 1 ? 'donation' : 'donations'})
          </span>
        </h3>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Raised</p>
          <p className="text-2xl font-display font-bold text-cranberry">
            {formatCurrency(summary.eventTotalCents)}
          </p>
          {summary.fundraisingGoalCents && summary.fundraisingGoalCents > 0 && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              of {formatCurrency(summary.fundraisingGoalCents)} goal
              {' · '}
              {Math.min(100, Math.round((summary.eventTotalCents / summary.fundraisingGoalCents) * 100))}%
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {donations.map((d) => (
          <div key={d.id} className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.donorName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {d.donorEmail || 'No email'}
                  {d.createdAt ? ` · ${formatDate(d.createdAt)}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(d.amountCents)}
              </span>
            </div>
            {d.message && (
              <blockquote className="text-xs italic text-gray-600 dark:text-gray-400 border-l-2 border-cranberry/40 pl-3 py-0.5">
                &ldquo;{d.message}&rdquo;
              </blockquote>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
