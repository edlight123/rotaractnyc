'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { hasTiers, getAvailableTiers, getAllTiers, isTierAvailable, tierSpotsLeft } from '@/lib/utils/pricing';
import type { RotaractEvent } from '@/types';

interface EventRegistrationProps {
  event: RotaractEvent;
  currentRSVP?: 'going' | 'maybe' | 'not_going' | null;
  onRSVP: (status: 'going' | 'maybe' | 'not_going') => Promise<void>;
  onPurchaseTicket?: (ticketType: 'member' | 'guest', tierId?: string) => Promise<void>;
  attendeeCount?: number;
}

export default function EventRegistration({
  event,
  currentRSVP,
  onRSVP,
  onPurchaseTicket,
  attendeeCount = 0,
}: EventRegistrationProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const isPast = new Date(event.date) < new Date();
  const now = new Date();
  const isPaid = (event.type === 'paid' || event.type === 'hybrid') && event.pricing;
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - attendeeCount) : null;
  const capacityPct = event.capacity ? Math.min(100, Math.round((attendeeCount / event.capacity) * 100)) : 0;
  const hasEarlyBird =
    event.pricing?.earlyBirdPrice != null &&
    event.pricing?.earlyBirdDeadline &&
    new Date(event.pricing.earlyBirdDeadline) > now;
  const tierPricing = isPaid && event.pricing && hasTiers(event.pricing);
  const allTiers = tierPricing ? getAllTiers(event.pricing!) : [];
  const availTiers = tierPricing ? getAvailableTiers(event.pricing!) : [];

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card padding="none" className="overflow-hidden">
        {/* Header accent */}
        <div className={`px-5 py-3 ${isPaid ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cranberry to-cranberry-800'}`}>
          <h3 className="font-display font-bold text-white text-sm tracking-wide">
            {isPaid ? '🎟 Ticketed Event' : '✓ Free Event'}
          </h3>
        </div>

        {/* Quick event info */}
        <div className="px-5 pt-4 pb-4 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            <svg aria-hidden="true" className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            <svg aria-hidden="true" className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{event.time}{event.endTime ? ` – ${event.endTime}` : ''}</span>
          </div>
          {event.location && (
            <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
              <svg aria-hidden="true" className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>{event.location}</span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {isPast ? (
            <div className="text-center py-4">
              <Badge variant="gray" className="text-sm px-4 py-1">Event has ended</Badge>
            </div>
          ) : (
            <>
              {/* ── Pricing tiers ── */}
              {tierPricing ? (
                /* ── Tier-based pricing ── */
                <div className="space-y-2">
                  {allTiers.map((tier) => {
                    const available = isTierAvailable(tier);
                    const spots = tierSpotsLeft(tier);
                    const selected = selectedTierId === tier.id;
                    const expired = tier.deadline && new Date(tier.deadline) < now;
                    const soldOut = tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity;

                    return (
                      <button
                        key={tier.id}
                        type="button"
                        disabled={!available}
                        onClick={() => setSelectedTierId(selected ? null : tier.id)}
                        className={`w-full text-left rounded-xl p-3.5 border-2 transition-all duration-200 ${
                          !available
                            ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30'
                            : selected
                            ? 'border-cranberry bg-cranberry-50/50 dark:bg-cranberry-900/20 ring-1 ring-cranberry/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-cranberry/50 bg-white dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${selected ? 'text-cranberry' : 'text-gray-900 dark:text-white'}`}>
                                {tier.label}
                              </span>
                              {expired && <Badge variant="gray" className="text-[10px]">Expired</Badge>}
                              {soldOut && <Badge variant="cranberry" className="text-[10px]">Sold Out</Badge>}
                              {!expired && !soldOut && tier.deadline && (
                                <Badge variant="green" className="text-[10px]">
                                  Until {formatDate(tier.deadline)}
                                </Badge>
                              )}
                            </div>
                            {tier.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tier.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-display font-bold text-cranberry leading-tight">
                              {tier.memberPrice === 0 ? 'Free' : formatCurrency(tier.memberPrice)}
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase font-semibold">member</p>
                            {tier.guestPrice !== tier.memberPrice && (
                              <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(tier.guestPrice)} guest</p>
                            )}
                          </div>
                        </div>
                        {available && spots !== null && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${spots <= 5 ? 'bg-red-500' : spots <= 15 ? 'bg-amber-500' : 'bg-cranberry'}`}
                                style={{ width: `${Math.min(100, Math.round(((tier.soldCount ?? 0) / tier.capacity!) * 100))}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-medium whitespace-nowrap ${spots <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                              {spots} left
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : isPaid && event.pricing && (
                /* ── Legacy member/guest pricing ── */
                <div className="grid grid-cols-2 gap-3">
                  {/* Member tier */}
                  <div className="relative border-2 border-cranberry-200 dark:border-cranberry-800 rounded-xl p-3 text-center bg-cranberry-50/50 dark:bg-cranberry-900/10">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cranberry text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                      Member
                    </span>
                    <p className="text-2xl font-display font-extrabold text-cranberry mt-1">
                      {event.pricing.memberPrice === 0 ? 'Free' : formatCurrency(event.pricing.memberPrice)}
                    </p>
                    {hasEarlyBird && event.pricing.earlyBirdPrice != null && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                        Early: {formatCurrency(event.pricing.earlyBirdPrice)}
                      </p>
                    )}
                  </div>
                  {/* Guest tier */}
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center bg-gray-50 dark:bg-gray-800/50">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                      Guest
                    </span>
                    <p className="text-2xl font-display font-extrabold text-gray-700 dark:text-gray-200 mt-1">
                      {formatCurrency(event.pricing.guestPrice)}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Current RSVP status ── */}
              {currentRSVP && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-500">Your status:</span>
                  <Badge variant={currentRSVP === 'going' ? 'green' : currentRSVP === 'maybe' ? 'gold' : 'gray'}>
                    {currentRSVP === 'going' ? '✓ Going' : currentRSVP === 'maybe' ? 'Maybe' : 'Not going'}
                  </Badge>
                </div>
              )}

              {/* ── Actions ── */}
              {tierPricing ? (
                /* Tier-based action */
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    variant={selectedTierId ? 'gold' : 'secondary'}
                    size="lg"
                    loading={loading}
                    disabled={spotsLeft === 0 || (!selectedTierId && availTiers.length > 0)}
                    onClick={() => {
                      if (selectedTierId) {
                        handleAction(() => onPurchaseTicket?.(
                          'member',
                          selectedTierId,
                        ) || Promise.resolve());
                      }
                    }}
                  >
                    {spotsLeft === 0
                      ? 'Sold Out'
                      : !selectedTierId
                      ? '↑ Select a tier above'
                      : `Buy ${allTiers.find((t) => t.id === selectedTierId)?.label} Ticket`}
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => handleAction(() => onRSVP('maybe'))}>
                    Maybe
                  </Button>
                </div>
              ) : isPaid && event.pricing && event.pricing.memberPrice > 0 ? (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    variant="gold"
                    size="lg"
                    loading={loading}
                    disabled={spotsLeft === 0}
                    onClick={() => handleAction(() => onPurchaseTicket?.('member') || Promise.resolve())}
                  >
                    {spotsLeft === 0 ? 'Sold Out' : 'Buy Member Ticket'}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant="outline"
                      size="sm"
                      loading={loading}
                      disabled={spotsLeft === 0}
                      onClick={() => handleAction(() => onPurchaseTicket?.('guest') || Promise.resolve())}
                    >
                      Buy Guest Ticket
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleAction(() => onRSVP('maybe'))}>
                      Maybe
                    </Button>
                  </div>
                </div>
              ) : isPaid && event.pricing && event.pricing.memberPrice === 0 ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    onClick={() => handleAction(() => onPurchaseTicket?.('member') || Promise.resolve())}
                  >
                    Get Free Ticket
                  </Button>
                  <Button variant="ghost" onClick={() => handleAction(() => onRSVP('maybe'))}>
                    Maybe
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={currentRSVP === 'going' ? 'secondary' : 'primary'}
                    size="lg"
                    loading={loading}
                    onClick={() => handleAction(() => onRSVP(currentRSVP === 'going' ? 'not_going' : 'going'))}
                  >
                    {currentRSVP === 'going' ? '✓ Going' : "I'm Going"}
                  </Button>
                  <Button variant="ghost" onClick={() => handleAction(() => onRSVP('maybe'))}>
                    Maybe
                  </Button>
                </div>
              )}

              {/* ── Capacity bar ── */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{attendeeCount} {attendeeCount === 1 ? 'person' : 'people'} going</span>
                  {spotsLeft !== null && (
                    <span className={`font-medium ${spotsLeft <= 5 ? 'text-red-500' : spotsLeft <= 15 ? 'text-amber-500' : ''}`}>
                      {spotsLeft === 0 ? 'Sold out' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                    </span>
                  )}
                </div>
                {event.capacity && (
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 70 ? 'bg-amber-500' : 'bg-cranberry'
                      }`}
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Mobile sticky CTA */}
      {!isPast && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-lg mx-auto">
            {tierPricing && selectedTierId ? (
              <Button
                className="w-full"
                variant="gold"
                size="lg"
                loading={loading}
                onClick={() => handleAction(() => onPurchaseTicket?.('member', selectedTierId) || Promise.resolve())}
              >
                Buy {allTiers.find((t) => t.id === selectedTierId)?.label} Ticket
              </Button>
            ) : tierPricing ? (
              <Button className="w-full" variant="secondary" size="lg" disabled>
                Select a tier above
              </Button>
            ) : isPaid && event.pricing && event.pricing.memberPrice > 0 ? (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="gold"
                  size="lg"
                  loading={loading}
                  disabled={spotsLeft === 0}
                  onClick={() => handleAction(() => onPurchaseTicket?.('member') || Promise.resolve())}
                >
                  {spotsLeft === 0 ? 'Sold Out' : `Buy Ticket · ${formatCurrency(event.pricing!.memberPrice)}`}
                </Button>
                <Button variant="ghost" size="lg" onClick={() => handleAction(() => onRSVP('maybe'))}>Maybe</Button>
              </div>
            ) : isPaid && event.pricing && event.pricing.memberPrice === 0 ? (
              <Button
                className="w-full"
                variant="primary"
                size="lg"
                loading={loading}
                onClick={() => handleAction(() => onPurchaseTicket?.('member') || Promise.resolve())}
              >
                Get Free Ticket
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant={currentRSVP === 'going' ? 'secondary' : 'primary'}
                  size="lg"
                  loading={loading}
                  onClick={() => handleAction(() => onRSVP(currentRSVP === 'going' ? 'not_going' : 'going'))}
                >
                  {currentRSVP === 'going' ? '✓ Going' : "I'm Going"}
                </Button>
                {currentRSVP !== 'going' && (
                  <Button variant="ghost" size="lg" onClick={() => handleAction(() => onRSVP('maybe'))}>Maybe</Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
