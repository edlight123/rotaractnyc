'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const MESSAGES: Record<string, { text: string; tone: 'success' | 'error' }> = {
  '1': { text: "You're subscribed! Thanks for joining our newsletter. 🎉", tone: 'success' },
  invalid: { text: 'That confirmation link is invalid or has already been used.', tone: 'error' },
  error: { text: 'Something went wrong confirming your subscription. Please try again.', tone: 'error' },
};

function Banner() {
  const params = useSearchParams();
  const key = params.get('subscribed');
  const [dismissed, setDismissed] = useState(false);

  if (!key || dismissed) return null;
  const msg = MESSAGES[key];
  if (!msg) return null;

  const styles =
    msg.tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';

  return (
    <div className={`border-b ${styles}`} role="status">
      <div className="container-page py-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{msg.text}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-current/70 hover:text-current transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function NewsletterConfirmBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}
