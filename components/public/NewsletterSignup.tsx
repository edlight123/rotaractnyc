'use client';

import { useState } from 'react';

interface NewsletterSignupProps {
  /** Where the signup happened — stored on the subscriber record. */
  source?: 'footer' | 'event' | 'donate' | 'account';
  className?: string;
}

/**
 * Compact newsletter email-capture form. Posts to /api/newsletter/subscribe,
 * which sends a double opt-in confirmation email. Styled for the dark footer.
 */
export default function NewsletterSignup({ source = 'footer', className = '' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('done');
      setMessage(data.message || 'Check your inbox to confirm your subscription.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'done') {
    return (
      <p className={`text-sm text-gold ${className}`} role="status">
        ✓ {message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'sending'}
          className="flex-1 min-w-0 rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cranberry focus:border-transparent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-md bg-cranberry hover:bg-cranberry-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
