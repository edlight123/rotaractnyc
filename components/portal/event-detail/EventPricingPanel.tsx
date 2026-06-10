import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { RotaractEvent } from '@/types';

interface EventPricingPanelProps {
  event: RotaractEvent;
}

/**
 * Pricing card for paid/hybrid events. Renders tier-based pricing when tiers
 * are present, otherwise the legacy member/guest grid with optional early
 * bird callout. Renders nothing for free/service events or when pricing is
 * absent.
 */
export default function EventPricingPanel({ event }: EventPricingPanelProps) {
  if (!event.pricing || (event.type !== 'paid' && event.type !== 'hybrid')) return null;
  const { pricing } = event;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
      <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 text-lg">Pricing</h3>

      {pricing.tiers?.length ? (
        /* ── Tier grid ── */
        <div className="space-y-3">
          {[...pricing.tiers].sort((a, b) => a.sortOrder - b.sortOrder).map((tier) => {
            const expired = tier.deadline && new Date(tier.deadline) < new Date();
            const soldOut = tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity;
            const spots = tier.capacity != null ? Math.max(0, tier.capacity - (tier.soldCount ?? 0)) : null;

            return (
              <div
                key={tier.id}
                className={`rounded-xl p-4 border ${expired || soldOut ? 'opacity-60 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30' : 'border-cranberry-100 dark:border-cranberry-900/40 bg-cranberry-50/30 dark:bg-cranberry-900/10'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate min-w-0">{tier.label}</h4>
                      {expired && <Badge variant="gray">Expired</Badge>}
                      {soldOut && <Badge variant="cranberry">Sold Out</Badge>}
                    </div>
                    {tier.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">{tier.description}</p>
                    )}
                    {tier.deadline && !expired && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Available until {formatDate(tier.deadline)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs font-bold text-cranberry uppercase tracking-wider">Member</p>
                        <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                          {tier.memberPrice === 0 ? 'Free' : formatCurrency(tier.memberPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Guest</p>
                        <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                          {formatCurrency(tier.guestPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {spots !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${spots <= 5 ? 'bg-red-500' : spots <= 15 ? 'bg-amber-500' : 'bg-cranberry'}`}
                        style={{ width: `${Math.min(100, Math.round(((tier.soldCount ?? 0) / tier.capacity!) * 100))}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${spots <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                      {spots === 0 ? 'Sold out' : `${spots}/${tier.capacity} left`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Legacy member/guest grid ── */
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-cranberry-50 dark:bg-cranberry-900/20 rounded-xl p-4 border border-cranberry-100 dark:border-cranberry-900/40">
              <p className="text-xs font-bold text-cranberry uppercase tracking-wider mb-1.5">Member Price</p>
              <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">
                {pricing.memberPrice === 0 ? 'Free' : formatCurrency(pricing.memberPrice)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Guest Price</p>
              <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{formatCurrency(pricing.guestPrice)}</p>
            </div>
          </div>
          {pricing.earlyBirdPrice != null && pricing.earlyBirdDeadline && (
            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center shrink-0">
                <svg aria-hidden="true" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Early Bird: {formatCurrency(pricing.earlyBirdPrice)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Available until {formatDate(pricing.earlyBirdDeadline)}
                  {new Date(pricing.earlyBirdDeadline) < new Date() && ' — expired'}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
