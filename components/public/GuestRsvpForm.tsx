'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import Modal from '@/components/ui/Modal';
import CardPaymentForm from '@/components/ui/CardPaymentForm';
import { SITE } from '@/lib/constants';
import type { TicketTier } from '@/types';

// ── Inline waitlist widget ─────────────────────────────────────
function WaitlistForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [wlEmail, setWlEmail] = useState('');
  const [wlStatus, setWlStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [wlMsg, setWlMsg] = useState('');

  async function handleWaitlist(e: FormEvent) {
    e.preventDefault();
    if (!wlEmail) return;
    setWlStatus('loading');
    try {
      const res = await fetch('/api/events/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, email: wlEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setWlStatus('done');
      setWlMsg(data.message || "You're on the waitlist! We'll notify you if a spot opens.");
    } catch (err: any) {
      setWlStatus('error');
      setWlMsg(err.message || 'Something went wrong. Please try again.');
    }
  }

  if (wlStatus === 'done') {
    return (
      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center">
        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-3">✓ {wlMsg}</p>
        <Link href={`/events/${eventSlug}`} className="text-xs text-green-600 dark:text-green-400 underline hover:no-underline">
          View event details
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">🎟️ Sold Out</p>
      <p className="text-xs text-red-600 dark:text-red-400 mb-3">All ticket tiers have been claimed. Join the waitlist and we&apos;ll notify you if a spot opens up.</p>
      <form onSubmit={handleWaitlist} className="flex gap-2">
        <input
          type="email"
          required
          value={wlEmail}
          onChange={(e) => setWlEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 min-w-0 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
        />
        <button
          type="submit"
          disabled={wlStatus === 'loading'}
          className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {wlStatus === 'loading' ? '…' : 'Join Waitlist'}
        </button>
      </form>
      {wlStatus === 'error' && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{wlMsg}</p>}
    </div>
  );
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const stripeAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#b7324a',
    colorBackground: '#ffffff',
    borderRadius: '8px',
    fontSizeBase: '14px',
  },
};

interface GuestRsvpFormProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  isPaid: boolean;
  /**
   * True only when a signed-in member actually pays less than a guest for this
   * event. Free and service events have no pricing, so the membership pitch
   * must not promise "discounted tickets" there.
   */
  hasMemberDiscount?: boolean;
  guestPrice?: number;
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;
  tiers?: TicketTier[];
}

export default function GuestRsvpForm({
  eventId,
  eventSlug,
  eventTitle,
  isPaid,
  hasMemberDiscount = false,
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
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Whether the confirmation email actually went out. The free-RSVP endpoint
  // reports this per registration; `null` means we don't know (paid checkout,
  // or a Stripe redirect return) and we fall back to neutral wording. Claiming
  // "a confirmation email has been sent" when the send failed is why missing
  // confirmations went unnoticed for so long.
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState('');

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  // Handle return from a Stripe-hosted redirect (rare — only for bank-auth flows)
  useEffect(() => {
    const status = searchParams.get('redirect_status');
    if (status === 'succeeded' || searchParams.get('rsvp') === 'success') {
      setSuccess(true);
    }
  }, [searchParams]);

  const hasTierPricing = tiers && tiers.length > 0;
  const now = new Date();
  const availableTiers = hasTierPricing
    ? tiers
        .filter((t) => {
          if (t.deadline && new Date(t.deadline) < now) return false;
          if (t.capacity != null && (t.soldCount ?? 0) >= t.capacity) return false;
          return true;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const isEarlyBird =
    !hasTierPricing && earlyBirdPrice != null && earlyBirdDeadline && new Date(earlyBirdDeadline) > now;

  const unitPrice = hasTierPricing
    ? selectedTierId
      ? (tiers.find((t) => t.id === selectedTierId)?.guestPrice ?? null)
      : (availableTiers[0]?.guestPrice ?? null)
    : isEarlyBird
    ? earlyBirdPrice!
    : guestPrice;

  const totalPrice = unitPrice != null ? unitPrice * quantity : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Determine tierId: selected tier, or first available tier (only for tier-based pricing)
      const tierId = hasTierPricing ? (selectedTierId || availableTiers[0]?.id || undefined) : undefined;
      const body = { eventId, name, email, phone: phone || undefined, tierId, promoCode: promoCode || undefined };

      const rsvpRes = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const rsvpData = await rsvpRes.json();
      if (!rsvpRes.ok) throw new Error(rsvpData.error || 'Something went wrong. Please try again.');

      if (rsvpData.requiresPayment) {
        const checkoutRes = await fetch('/api/events/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, quantity, embedded: Boolean(publishableKey) }),
        });
        const checkoutData = await checkoutRes.json();
        if (!checkoutRes.ok) throw new Error(checkoutData.error || 'Payment setup failed. Please try again.');

        if (checkoutData.clientSecret && publishableKey) {
          setCheckoutClientSecret(checkoutData.clientSecret);
          setShowPaymentModal(true);
          return;
        }

        // No publishable key — fall back to Stripe-hosted redirect
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }

        if (checkoutData.free) {
          setSuccess(true);
          return;
        }
      }

      if (typeof rsvpData.emailSent === 'boolean') setEmailSent(rsvpData.emailSent);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setCheckoutClientSecret('');
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setCheckoutClientSecret('');
    setSuccess(true);
  };

  // ── Success state ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="mt-10 p-6 bg-cranberry-50 dark:bg-cranberry-900/10 rounded-2xl border border-cranberry-100 dark:border-cranberry-900/30 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-2">You&rsquo;re registered!</h3>
        {emailSent === false ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-6">
            Your spot is saved, but we couldn&rsquo;t send your confirmation email
            {email ? <> to <span className="font-medium">{email}</span></> : null}. Nothing else is
            needed from you — email{' '}
            <a href={`mailto:${SITE.email}`} className="underline hover:no-underline">{SITE.email}</a>{' '}
            if you&rsquo;d like the details resent.
          </p>
        ) : email ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            A confirmation email has been sent to{' '}
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>. If it
            doesn&rsquo;t arrive in a few minutes, check your spam folder.
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Check your email for confirmation details.</p>
        )}
        <div className="p-4 bg-white/60 dark:bg-gray-900/40 rounded-xl">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            💡{' '}
            <strong>
              {hasMemberDiscount
                ? 'Members get discounted tickets and exclusive events.'
                : 'Members get exclusive events, service opportunities, and a community of driven young professionals.'}
            </strong>
          </p>
          <Link href="/membership" className="mt-2 inline-block text-sm font-semibold text-cranberry hover:underline">
            Learn about membership →
          </Link>
        </div>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────────
  return (
    <div className="mt-10 p-6 bg-cranberry-50 dark:bg-cranberry-900/10 rounded-2xl border border-cranberry-100 dark:border-cranberry-900/30">
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-1">Want to attend?</h3>

      {hasTierPricing ? (
        <div className="mb-5 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Select your ticket tier:</p>
          {availableTiers.length === 0 ? (
            <WaitlistForm eventId={eventId} eventSlug={eventSlug} />
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
      ) : isPaid && unitPrice != null ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Guest ticket:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(unitPrice)}</span>
          {isEarlyBird && <span className="ml-2 text-green-700 dark:text-green-400 font-medium">🐦 Early bird</span>}
        </p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Register below to reserve your spot — it&rsquo;s free!
        </p>
      )}

      {/* Quantity selector — available for all event types */}
      <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isPaid ? 'Number of Tickets' : 'Number of Guests'}
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              disabled={quantity >= 10}
              className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
            >
              +
            </button>
            {quantity > 1 && unitPrice != null && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                = <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(unitPrice * quantity)}</span> total
              </span>
            )}
          </div>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-cranberry">*</span>
          </label>
          <input
            id="guest-name" type="text" required value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Your full name"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-cranberry">*</span>
          </label>
          <input
            id="guest-email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="guest-phone" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
          />
        </div>

        {/* Promo code */}
        {isPaid && unitPrice != null && unitPrice > 0 && (
          <div>
            <label htmlFor="guest-promo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Promo Code
            </label>
            <input
              id="guest-promo" type="text" value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-cranberry focus:ring-2 focus:ring-cranberry/20 outline-none transition"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

        <button
          type="submit" disabled={loading}
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
          ) : isPaid
            ? quantity > 1
              ? `Get ${quantity} Tickets`
              : 'Get Your Ticket'
            : quantity > 1
              ? `Register ${quantity} Guests`
              : 'Register as Guest'}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-cranberry-100 dark:border-cranberry-900/30">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          💡{' '}
          <strong>
            {hasMemberDiscount
              ? 'Members get discounted tickets and exclusive events.'
              : 'Members get exclusive events, service opportunities, and a community of driven young professionals.'}
          </strong>{' '}
          <Link href="/membership" className="text-cranberry hover:underline font-medium">Learn more →</Link>
        </p>
      </div>

      {/* Payment modal */}
      <Modal
        open={showPaymentModal}
        onClose={handleClosePaymentModal}
        title="Complete your payment"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-cranberry-50 dark:bg-cranberry-900/10 border border-cranberry-100 dark:border-cranberry-900/30 px-4 py-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{eventTitle}</p>
            {totalPrice != null && (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPrice)}</p>
                {quantity > 1 && unitPrice != null && (
                  <p className="text-xs text-gray-500 mt-0.5">{quantity} × {formatCurrency(unitPrice)}</p>
                )}
              </>
            )}
          </div>

          {checkoutClientSecret && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: checkoutClientSecret, appearance: stripeAppearance }}
            >
              <CardPaymentForm
                amount={totalPrice != null ? formatCurrency(totalPrice) : ''}
                onSuccess={handlePaymentSuccess}
                onBack={handleClosePaymentModal}
                accentClass="bg-cranberry hover:bg-cranberry-800 focus-visible:outline-cranberry"
              />
            </Elements>
          )}
        </div>
      </Modal>
    </div>
  );
}
