import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { Purchaser, PurchaserSummary } from './types';

interface EventPurchasersPanelProps {
  eventId: string;
  purchasers: Purchaser[];
  summary: PurchaserSummary | null;
}

/**
 * Admin-only "Ticket Purchasers" panel: order/ticket counts, total revenue,
 * a members/guests/tickets summary, and a per-purchaser list with payment
 * status. Renders nothing when there's no purchaser data yet.
 */
export default function EventPurchasersPanel({ eventId, purchasers, summary }: EventPurchasersPanelProps) {
  if (purchasers.length === 0 && !summary) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white text-lg">
          Ticket Purchasers
          {summary && (
            <span className="text-gray-400 dark:text-gray-500 font-normal text-base ml-2">
              ({summary.orderCount ?? purchasers.length} order{(summary.orderCount ?? purchasers.length) !== 1 ? 's' : ''}
              {' · '}
              {summary.totalTickets} ticket{summary.totalTickets !== 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          <a
            href={`/portal/events/${eventId}/attendees`}
            className="text-xs font-semibold text-cranberry hover:text-cranberry/80 inline-flex items-center gap-1"
          >
            Open full roster
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          {summary && summary.totalRevenueCents > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-display font-bold text-cranberry">
                {formatCurrency(summary.totalRevenueCents)}
              </p>
            </div>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Members</p>
            <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{summary.memberCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Guests</p>
            <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{summary.guestCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tickets</p>
            <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{summary.totalTickets}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {purchasers.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                  p.kind === 'member'
                    ? 'text-cranberry bg-cranberry-50 dark:bg-cranberry-900/20'
                    : 'text-azure-700 bg-azure-50 dark:bg-azure-900/20'
                }`}>
                  {p.kind}
                </span>
                {p.source === 'offline_payment' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-amber-700 bg-amber-50 dark:bg-amber-900/20">
                    offline
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {p.email}{p.phone ? ` · ${p.phone}` : ''}
                {p.createdAt ? ` · ${formatDate(p.createdAt)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {p.quantity > 1 && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  ×{p.quantity}
                </span>
              )}
              {p.amountCents > 0 && (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(p.amountCents)}
                </span>
              )}
              {p.paymentStatus === 'paid' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Paid</span>
              ) : p.paymentStatus === 'free' ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Free</span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Pending</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
