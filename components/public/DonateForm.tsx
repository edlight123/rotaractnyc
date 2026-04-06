'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

const STRIPE_CHECKOUT_PREFIX = 'https://checkout.stripe.com/';

const presets = [
  { amount: 25, label: 'Supplies for a service day', emoji: '🎒' },
  { amount: 50, label: 'Meals for 10 families', emoji: '🍽️' },
  { amount: 100, label: 'Full project sponsorship', emoji: '🌍' },
];

export default function DonateForm() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  const sessionId = searchParams.get('session_id');
  const cancelled = searchParams.get('cancelled') === 'true';

  // 5.3 — Verify the Stripe session server-side
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setVerifying(true);
    fetch(`/api/donate/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) setVerified(data.verified === true);
      })
      .catch(() => {
        if (active) setVerified(false);
      })
      .finally(() => {
        if (active) setVerifying(false);
      });
    return () => { active = false; };
  }, [sessionId]);

  useEffect(() => {
    if (verified || cancelled) {
      setSelected(null);
      setCustomAmount('');
    }
  }, [verified, cancelled]);

  const handleDonate = async () => {
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = {};
      if (selected) {
        body.amount = String(selected);
      } else if (customAmount) {
        body.customAmount = customAmount;
      } else {
        setError('Please select or enter an amount.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      // Validate redirect URL is a legitimate Stripe checkout URL
      if (data.url && typeof data.url === 'string' && data.url.startsWith(STRIPE_CHECKOUT_PREFIX)) {
        window.location.href = data.url;
      } else {
        setError('Invalid checkout URL received. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page max-w-3xl text-center">
      {verifying && (
        <div className="mb-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Verifying your donation…</p>
        </div>
      )}

      {verified === true && (
        <div className="mb-8 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-display font-bold text-emerald-800 dark:text-emerald-300 mb-2">Thank You!</h2>
          <p className="text-emerald-700 dark:text-emerald-400">
            Your donation has been received. You&apos;re helping us make a real difference in our community.
          </p>
        </div>
      )}

      {verified === false && (
        <div className="mb-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <p className="text-red-800 dark:text-red-300">
            We could not verify your donation. Please contact us if you believe this is an error.
          </p>
        </div>
      )}

      {cancelled && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <p className="text-amber-800 dark:text-amber-300">
            Donation was cancelled. Feel free to try again whenever you&apos;re ready.
          </p>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10">
        <div className="text-5xl mb-4">💛</div>
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">
          Every Dollar Makes a Difference
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          Donations to Rotaract NYC support our community service projects, including food bank
          drives, park cleanups, educational programs, and international service initiatives.
          100% of donations go directly to our project funds.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-6" role="radiogroup" aria-label="Donation amount presets">
          {presets.map((p) => (
            <button
              key={p.amount}
              type="button"
              role="radio"
              aria-checked={selected === p.amount}
              onClick={() => { setSelected(p.amount); setCustomAmount(''); setError(''); }}
              className={`rounded-xl border-2 p-5 transition-all ${
                selected === p.amount
                  ? 'border-cranberry bg-cranberry/5 ring-2 ring-cranberry/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-cranberry'
              }`}
            >
              <div className="text-2xl mb-1">{p.emoji}</div>
              <p className="text-2xl font-display font-bold text-cranberry">${p.amount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.label}</p>
            </button>
          ))}
        </div>

        <div className="max-w-xs mx-auto mb-8">
          <label htmlFor="custom-amount" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Or enter a custom amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium" aria-hidden="true">$</span>
            <input
              id="custom-amount"
              type="number"
              min="5"
              step="1"
              placeholder="Other amount"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelected(null); setError(''); }}
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center text-lg font-medium focus:ring-2 focus:ring-cranberry/30 focus:border-cranberry outline-none transition-all dark:text-white"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum $5</p>
        </div>

        {error && <p role="alert" aria-live="assertive" className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

        <Button
          variant="primary"
          size="lg"
          onClick={handleDonate}
          disabled={loading || (!selected && !customAmount)}
          className="w-full sm:w-auto min-w-[200px]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : (
            `Donate${selected ? ` $${selected}` : customAmount ? ` $${customAmount}` : ''}`
          )}
        </Button>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          Secure payment powered by Stripe. You&apos;ll be redirected to complete your donation.
        </p>
      </div>
    </div>
  );
}
