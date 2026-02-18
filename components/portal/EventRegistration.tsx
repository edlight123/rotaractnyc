'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';
import type { RotaractEvent } from '@/types';

interface EventRegistrationProps {
  event: RotaractEvent;
  currentRSVP?: 'going' | 'maybe' | 'not' | null;
  onRSVP: (status: 'going' | 'maybe' | 'not') => Promise<void>;
  onPurchaseTicket?: (ticketType: 'member' | 'guest') => Promise<void>;
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
  const isPast = new Date(event.date) < new Date();
  const now = new Date();
  const isPaid = (event.type === 'paid' || event.type === 'hybrid') && event.pricing;
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - attendeeCount) : null;
  const capacityPct = event.capacity ? Math.min(100, Math.round((attendeeCount / event.capacity) * 100)) : 0;
  const hasEarlyBird =
    event.pricing?.earlyBirdPrice != null &&
    event.pricing?.earlyBirdDeadline &&
    new Date(event.pricing.earlyBirdDeadline) > now;

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header accent */}
      <div className={`px-5 py-3 ${isPaid ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cranberry to-cranberry-800'}`}>
        <h3 className="font-display font-bold text-white text-sm tracking-wide">
          {isPaid ? '🎟️ Ticketed Event' : '✓ Free Event'}
        </h3>
      </div>

      <div className="p-5 space-y-5">
        {isPast ? (
          <div className="text-center py-4">
            <Badge variant="gray" className="text-sm px-4 py-1">Event has ended</Badge>
          </div>
        ) : (
          <>
            {/* ── Pricing tiers ── */}
            {isPaid && event.pricing && (
              <div className="grid grid-cols-2 gap-3">
                {/* Member tier */}
                <div className="relative border-2 border-cranberry-200 dark:border-cranberry-800 rounded-xl p-3 text-center bg-cranberry-50/50 dark:bg-cranberry-900/10">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-cranberry text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Member
                  </span>
                  <p className="text-2xl font-display font-extrabold text-cranberry mt-1">
                    {event.pricing.memberPrice === 0 ? 'Free' : formatCurrency(event.pricing.memberPrice)}
                  </p>
                  {hasEarlyBird && event.pricing.earlyBirdPrice != null && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      🐦 Early bird: {formatCurrency(event.pricing.earlyBirdPrice)}
                    </p>
                  )}
                </div>
                {/* Guest tier */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center bg-gray-50 dark:bg-gray-800/50">
                  <span className="absolute-ish text-[10px] font-bold text-gray-500 uppercase tracking-wider">
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
                  {currentRSVP === 'going' ? '✓ Going' : currentRSVP === 'maybe' ? '🤔 Maybe' : 'Not going'}
                </Badge>
              </div>
            )}

            {/* ── Actions ── */}
            {isPaid && event.pricing && event.pricing.memberPrice > 0 ? (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="gold"
                  size="lg"
                  loading={loading}
                  disabled={spotsLeft === 0}
                  onClick={() => handleAction(() => onPurchaseTicket?.('member') || Promise.resolve())}
                >
                  {spotsLeft === 0 ? 'Sold Out' : '🎟️ Buy Member Ticket'}
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
                  🎫 Get Free Ticket
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
                  onClick={() => handleAction(() => onRSVP(currentRSVP === 'going' ? 'not' : 'going'))}
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
  );
}
