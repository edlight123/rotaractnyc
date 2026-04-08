'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { TicketTier } from '@/types';

interface GuestRsvpFormProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  isPaid: boolean;
  guestPrice?: number; // in cents
  earlyBirdPrice?: number; // in cents
  earlyBirdDeadline?: string; // ISO date
  tiers?: TicketTier[]; // tier-based pricing
}

export default function GuestRsvpForm({
  eventId,
  eventSlug,
  eventTitle,
  isPaid,
  guestPrice,
  earlyBirdPrice,
  earlyBirdDeadline,
  tiers,
}: GuestRsvpFormProps) {
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Handle return from Stripe checkout
  useEffect(() => {
    if (searchParams.get('rsvp') === 'success') {
      setSuccess(true);
    }
  }, [searchParams]);

  const hasTierPricing = tiers && tiers.length > 0;
  const now = new Date();
  const availableTiers = hasTierPricing
    ? tiers.filter((t) => {
        if (t.deadline && new Date(t.deadline) < now) return false;
        if (t.capacity != null && (t.soldCount ?? 0) >= t.capacity) return false;
        return true;
      }).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const isEarlyBird =
    !hasTierPricing &&
    earlyBirdPrice != null &&
    earlyBirdDeadline &&
    new Date(earlyBirdDeadline) > now;

  const displayPrice = hasTierPricing
    ? (selectedTierId
      ? (tiers.find((t) => t.id === selectedTierId)?.guestPrice ?? null)
      : (availableTiers[0]?.guestPrice ?? null))
    : isEarlyBird
    ? earlyBirdPrice!
    : guestPrice;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body = { eventId, name, email, phone: phone || undefined, tierId: selectedTierId || undefined };

      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      if (data.requiresPayment) {
        // Redirect to Stripe checkout
        const checkoutRes = await fetch('/api/events/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const checkoutData = await checkoutRes.json();

        if (!checkoutRes.ok) {
          throw new Error(checkoutData.error || 'Payment setup failed. Please try again.');
        }

        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return; // keep loading state while redirecting
        }

        if (checkoutData.free) {
          setSuccess(true);
          setLoading(false);
          return;
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="mt-10 p-6 bg-cranberry-50 dark:bg-cranberry-900/10 rounded-2xl border border-cranberry-100 dark:border-cranberry-900/30 text-center">
        {/* Checkmark */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-7 w-7 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-2">
          You&rsquo;re registered!
        </h3>

        {email ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            A confirmation email has been sent to{' '}
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>.
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Check your email for confirmation details.
          </p>
        )}

        <div className="p-4 bg-white/60 dark:bg-gray-900/40 rounded-xl">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            💡 <strong>Members get discounted tickets and exclusive events.</strong>
          </p>
          <Link
            href="/membership"
            className="mt-2 inline-block text-sm font-semibold text-cranberry hover:underline"
          >
            Learn about membership →
          </Link>
        </div>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────────
  return (
    <div className="mt-10 p-6 bg-cranberry-50 dark:bg-cranberry-900/10 rounded-2xl border border-cranberry-100 dark:border-cranberry-900/30">
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-1">
        Want to attend?
      </h3>

      {hasTierPricing ? (
        /* ── Tier selector for guests ── */
        <div className="mb-5 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Select your ticket tier:
          </p>
          {availableTiers.length === 0 ? (
            <p className="text-sm text-red-500 font-medium">All ticket tiers are sold out or expired.</p>
          ) : (
            availableTiers.map((tier) => {
              const selected = selectedTierId === tier.id;
              const spots = tier.capacity != null ? Math.max(0, tier.capacity - (tier.soldCount ?? 0)) : null;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                    selected
                      ? 'border-cranberry bg-white dark:bg-gray-900 shadow-sm'
                      : 'border-cranberry-200/60 dark:border-cranberry-900/40 hover:border-cranberry/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-semibold text-sm ${selected ? 'text-cranberry' : 'text-gray-900 dark:text-white'}`}>{tier.label}</span>
                      {tier.description && <p className="text-xs text-gray-500 mt-0.5">{tier.description}</p>}
                      {tier.deadline && <p className="text-[10px] text-green-600 mt-0.5">Until {formatDate(tier.deadline)}</p>}
                      {spots !== null && <p className={`text-[10px] mt-0.5 ${spots <= 5 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{spots} left</p>}
                    </div>
                    <p className="text-lg font-display font-bold text-gray-900 dark:text-white">{formatCurrency(tier.guestPrice)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : isPaid && displayPrice != null ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Guest ticket:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(displayPrice)}
          </span>
          {isEarlyBird && (
            <span className="ml-2 text-green-700 dark:text-green-400 font-medium">
              🐦 Early bird
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Register below to reserve your spot — it&rsquo;s free!
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-cranberry">*</span>
          </label>
          <input
            id="guest-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-cranberry">*</span>
          </label>
          <input
            id="guest-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
          />
        </div>

        {/* Phone (optional) */}
        <div>
          <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="guest-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cranberry px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cranberry-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cranberry disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : isPaid ? (
            'Get Your Ticket'
          ) : (
            'Register as Guest'
          )}
        </button>
      </form>

      {/* Membership pitch */}
      <div className="mt-5 pt-4 border-t border-cranberry-100 dark:border-cranberry-900/30">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          💡 <strong>Members get discounted tickets and exclusive events.</strong>{' '}
          <Link href="/membership" className="text-cranberry hover:underline font-medium">
            Learn more →
          </Link>
        </p>
      </div>
    </div>
  );
}
