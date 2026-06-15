'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  Users,
  Repeat,
  Check,
  HelpCircle,
  X,
  ArrowRight,
  User,
  UserPlus,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/format';
import type { RotaractEvent, RSVPStatus, EventType } from '@/types';

/* Gradient placeholder colours per event type (no-image fallback). */
const typeGradients: Record<EventType, string> = {
  free: 'from-emerald-500/80 to-teal-600/80',
  paid: 'from-amber-500/80 to-orange-600/80',
  service: 'from-azure to-azure-800',
  hybrid: 'from-cranberry to-cranberry-800',
};

const typeBadge: Record<EventType, 'green' | 'gold' | 'azure' | 'cranberry'> = {
  free: 'green',
  paid: 'gold',
  service: 'azure',
  hybrid: 'cranberry',
};

/* RSVP status pill — lucide icon + label + colour. */
const rsvpDisplay: Record<
  RSVPStatus,
  { label: string; color: string; Icon: typeof Check }
> = {
  going: {
    label: 'Going',
    color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30',
    Icon: Check,
  },
  maybe: {
    label: 'Maybe',
    color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
    Icon: HelpCircle,
  },
  not_going: {
    label: 'Not going',
    color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
    Icon: X,
  },
};

function formatEventDay(d: string) {
  const date = new Date(d);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
  };
}

function recurrenceLabel(freq?: string): string | null {
  switch (freq) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Biweekly';
    case 'monthly':
      return 'Monthly';
    default:
      return null;
  }
}

export interface EventCardProps {
  event: RotaractEvent;
  /** `list` = horizontal scannable row (default); `grid` = vertical card. */
  variant?: 'grid' | 'list';
  /** The current viewer's RSVP status for this event, if any. */
  myRsvp?: RSVPStatus;
  /** True when the viewer holds a confirmed/paid ticket that can't be self-cancelled. */
  ticketLocked?: boolean;
  /** This event's RSVP/purchase action is in flight. */
  loading?: boolean;
  /** Any RSVP action across the list is in flight (disables secondary buttons). */
  anyLoading?: boolean;
  /** Event date is in the past — renders a recap link instead of RSVP actions. */
  isPast?: boolean;
  /** Stagger index for the entrance animation. */
  index?: number;
  onRSVP?: (status: RSVPStatus) => void;
  onPurchase?: (ticketType?: 'member' | 'guest') => void;
}

/**
 * EventCard — the single event card used across the portal Events views.
 *
 * Accessible by design: a stretched <Link> overlay (z-10) makes the whole
 * card navigate to the event, while RSVP/ticket actions sit above it (z-20)
 * and handle their own clicks — no nested-button `stopPropagation` hacks.
 */
export default function EventCard({
  event,
  variant = 'list',
  myRsvp,
  ticketLocked = false,
  loading = false,
  anyLoading = false,
  isPast = false,
  index = 0,
  onRSVP,
  onPurchase,
}: EventCardProps) {
  const d = formatEventDay(event.date);
  const paid = (event.type === 'paid' || event.type === 'hybrid') && !!event.pricing;
  const spots = event.capacity ? Math.max(0, event.capacity - (event.attendeeCount ?? 0)) : null;
  const now = new Date();
  const hasEarlyBird =
    event.pricing?.earlyBirdPrice != null &&
    !!event.pricing?.earlyBirdDeadline &&
    new Date(event.pricing.earlyBirdDeadline) > now;
  const recurLabel =
    (event.isRecurring || event.recurrenceParentId) && event.recurrence
      ? recurrenceLabel(event.recurrence.frequency)
      : null;
  const href = `/portal/events/${event.id}`;
  const isGrid = variant === 'grid';

  /* ── Date / image block ──────────────────────────────────────────────── */
  const dateBlock = (
    <div
      className={
        isGrid ? 'relative w-full shrink-0 overflow-hidden' : 'relative md:w-52 shrink-0 overflow-hidden'
      }
    >
      {event.imageURL ? (
        <div className={isGrid ? 'relative h-44 w-full' : 'relative h-40 md:h-full w-full'}>
          <Image
            src={event.imageURL}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-3 py-2 text-center shadow-sm">
            <p className="text-[10px] font-bold text-cranberry leading-none">{d.month}</p>
            <p className="text-xl font-display font-bold text-gray-900 dark:text-white leading-tight">
              {d.day}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`${
            isGrid ? 'h-44' : 'h-32 md:h-full min-h-[8rem]'
          } bg-gradient-to-br ${typeGradients[event.type]} flex flex-col items-center justify-center gap-0.5 text-white`}
        >
          <p className="text-xs font-bold uppercase tracking-wider opacity-90">{d.weekday}</p>
          <p className="text-4xl font-display font-extrabold leading-none">{d.day}</p>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{d.month}</p>
        </div>
      )}
      <span className="absolute bottom-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-semibold rounded-full px-2.5 py-1 shadow-sm capitalize text-gray-700 dark:text-gray-300">
        {event.type}
      </span>
    </div>
  );

  /* ── Pricing summary ─────────────────────────────────────────────────── */
  const pricingBlock =
    paid && event.pricing ? (
      event.pricing.tiers?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {[...event.pricing.tiers]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((tier) => {
              const expired = tier.deadline && new Date(tier.deadline) < now;
              const soldOut = tier.capacity != null && (tier.soldCount ?? 0) >= tier.capacity;
              return (
                <span
                  key={tier.id}
                  className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg text-sm font-semibold ${
                    expired || soldOut
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through'
                      : 'bg-cranberry-50 dark:bg-cranberry-900/30 text-cranberry-700 dark:text-cranberry-300'
                  }`}
                >
                  {tier.memberPrice === 0 ? 'Free' : formatCurrency(tier.memberPrice)}
                  <span className="text-[10px] uppercase font-semibold opacity-70">{tier.label}</span>
                </span>
              );
            })}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-cranberry-50 dark:bg-cranberry-900/30 text-cranberry-700 dark:text-cranberry-300 pl-1.5 pr-2.5 py-1 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cranberry-100 dark:bg-cranberry-800/50">
              <User className="w-3 h-3 text-cranberry-600 dark:text-cranberry-300" />
            </span>
            <span className="text-sm font-bold">
              {event.pricing.memberPrice === 0 ? 'Free' : formatCurrency(event.pricing.memberPrice)}
            </span>
            <span className="text-[10px] uppercase font-semibold text-cranberry-500 dark:text-cranberry-400">
              Member
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 pl-1.5 pr-2.5 py-1 rounded-lg">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700">
              <UserPlus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </span>
            <span className="text-sm font-bold">{formatCurrency(event.pricing.guestPrice)}</span>
            <span className="text-[10px] uppercase font-semibold">Guest</span>
          </div>
          {hasEarlyBird && event.pricing.earlyBirdPrice != null && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
              Early bird {formatCurrency(event.pricing.earlyBirdPrice)}
            </span>
          )}
        </div>
      )
    ) : (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
        <Check className="w-4 h-4" />
        Free event
      </span>
    );

  /* ── Action buttons (z-20, above the stretched link) ─────────────────── */
  let actions: React.ReactNode;
  if (isPast) {
    actions = (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-cranberry dark:text-cranberry-400">
        View recap
        <ArrowRight className="w-4 h-4" />
      </span>
    );
  } else if (paid && event.pricing && event.pricing.memberPrice > 0) {
    actions = (
      <div className="relative z-20 flex gap-2 w-full sm:w-auto">
        <Button
          size="sm"
          variant={myRsvp === 'going' ? 'secondary' : 'gold'}
          loading={loading}
          onClick={() => {
            if (myRsvp === 'going') {
              if (ticketLocked) {
                onPurchase?.('member');
                return;
              }
              onRSVP?.('not_going');
            } else {
              onPurchase?.('member');
            }
          }}
          className="flex-1 sm:flex-initial"
        >
          {myRsvp === 'going' ? (
            ticketLocked ? (
              'Buy Another Ticket'
            ) : (
              <>
                <Check className="w-4 h-4 mr-1.5 inline" />
                Ticket Purchased
              </>
            )
          ) : (
            `Buy Ticket · ${formatCurrency(event.pricing.memberPrice)}`
          )}
        </Button>
        {myRsvp !== 'going' && (
          <Button
            size="sm"
            variant={myRsvp === 'maybe' ? 'secondary' : 'ghost'}
            disabled={anyLoading}
            onClick={() => onRSVP?.(myRsvp === 'maybe' ? 'not_going' : 'maybe')}
          >
            Maybe
          </Button>
        )}
      </div>
    );
  } else if (paid && event.pricing && event.pricing.memberPrice === 0) {
    actions = (
      <div className="relative z-20 flex gap-2 w-full sm:w-auto">
        <Button
          size="sm"
          variant={myRsvp === 'going' ? 'secondary' : 'primary'}
          loading={loading}
          disabled={myRsvp === 'going' && ticketLocked}
          onClick={() => {
            if (myRsvp === 'going') {
              if (ticketLocked) return;
              onRSVP?.('not_going');
            } else {
              onPurchase?.('member');
            }
          }}
          className="flex-1 sm:flex-initial"
        >
          {myRsvp === 'going' ? (
            <>
              <Check className="w-4 h-4 mr-1.5 inline" />
              Registered
            </>
          ) : (
            'Get Free Ticket'
          )}
        </Button>
        {myRsvp !== 'going' && (
          <Button
            size="sm"
            variant={myRsvp === 'maybe' ? 'secondary' : 'ghost'}
            disabled={anyLoading}
            onClick={() => onRSVP?.(myRsvp === 'maybe' ? 'not_going' : 'maybe')}
          >
            Maybe
          </Button>
        )}
      </div>
    );
  } else {
    actions = (
      <div className="relative z-20 flex gap-2 w-full sm:w-auto">
        <Button
          size="sm"
          variant={myRsvp === 'going' ? 'secondary' : 'primary'}
          loading={loading}
          onClick={() => onRSVP?.(myRsvp === 'going' ? 'not_going' : 'going')}
          className="flex-1 sm:flex-initial"
        >
          {myRsvp === 'going' ? (
            <>
              <Check className="w-4 h-4 mr-1.5 inline" />
              Going
            </>
          ) : (
            "I'm Going"
          )}
        </Button>
        <Button
          size="sm"
          variant={myRsvp === 'maybe' ? 'secondary' : 'ghost'}
          disabled={anyLoading}
          onClick={() => onRSVP?.(myRsvp === 'maybe' ? 'not_going' : 'maybe')}
        >
          Maybe
        </Button>
      </div>
    );
  }

  /* ── Content column ──────────────────────────────────────────────────── */
  const content = (
    <div className="flex-1 p-5 md:p-6 flex flex-col justify-between gap-4 min-w-0">
      <div>
        {/* Title + badges */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors">
            {event.title}
          </h3>
          <Badge variant={typeBadge[event.type]}>{event.type}</Badge>
          {event.isRecurring && !event.recurrenceParentId && (
            <Badge variant="azure">
              <Repeat className="w-3 h-3 mr-1 inline" />
              Recurring
            </Badge>
          )}
          {event.recurrenceParentId && (
            <Badge variant="azure">
              <Repeat className="w-3 h-3 mr-1 inline" />
              Series #{(event.occurrenceIndex ?? 0) + 1}
            </Badge>
          )}
          {event.status === 'draft' && <Badge variant="gray">Draft</Badge>}
          {event.status === 'cancelled' && <Badge variant="red">Cancelled</Badge>}
          {myRsvp && rsvpDisplay[myRsvp] && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${rsvpDisplay[myRsvp].color}`}
            >
              {(() => {
                const Icon = rsvpDisplay[myRsvp].Icon;
                return <Icon className="w-3 h-3" />;
              })()}
              {rsvpDisplay[myRsvp].label}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            {event.time}
            {event.endTime ? ` – ${event.endTime}` : ''}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              {event.location.split(',')[0]}
            </span>
          )}
          {spots !== null && (
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                spots <= 5 ? 'text-red-500' : spots <= 15 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Users className="w-4 h-4" />
              {spots === 0 ? 'Sold out' : `${spots} spot${spots !== 1 ? 's' : ''} left`}
            </span>
          )}
          {recurLabel && (
            <span className="inline-flex items-center gap-1.5 text-azure-600 dark:text-azure-400">
              <Repeat className="w-4 h-4" />
              {recurLabel}
            </span>
          )}
        </div>
      </div>

      {/* Pricing + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        {pricingBlock}
        {actions}
      </div>
    </div>
  );

  return (
    <div
      className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {/* Coloured top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${typeGradients[event.type]}`} />

      {/* Stretched link overlay — makes the whole card navigable (z-10). */}
      <Link href={href} className="absolute inset-0 z-10" aria-label={`View ${event.title}`} />

      <div className={isGrid ? 'flex flex-col' : 'flex flex-col md:flex-row'}>
        {dateBlock}
        {content}
      </div>
    </div>
  );
}
