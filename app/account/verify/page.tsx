'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { mapAuthError } from '@/lib/firebase/authErrors';
import { AuthCard, Alert, AuthLoading } from '@/components/account/authUi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

type State = 'working' | 'need-email' | 'error';

function VerifyInner() {
  const { user, sessionReady, completeMagicLink } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/account';

  const [state, setState] = useState<State>('working');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  // Attempt to complete the magic-link sign-in exactly once on mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const ok = await completeMagicLink();
        if (!ok) {
          setState('error');
          setError('This sign-in link is invalid or has already been used.');
        }
        // On success we keep the spinner and let the redirect effect below
        // fire once the session cookie is established.
      } catch (err: any) {
        if (err?.message === 'EMAIL_REQUIRED') {
          setState('need-email');
        } else {
          setState('error');
          setError(mapAuthError(err?.code, 'Could not complete sign-in. Please request a new link.'));
        }
      }
    })();
  }, [completeMagicLink]);

  // Once signed in and the session is ready, continue to the destination.
  useEffect(() => {
    if (user && sessionReady) {
      router.replace(redirect);
      router.refresh();
    }
  }, [user, sessionReady, redirect, router]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const ok = await completeMagicLink(email.trim());
      if (ok) {
        setState('working');
      }
    } catch (err: any) {
      setError(mapAuthError(err?.code, 'Could not complete sign-in. Please request a new link.'));
    }
  };

  if (state === 'need-email') {
    return (
      <AuthCard
        title="Confirm your email"
        subtitle="For your security, re-enter the email you used to request the link."
      >
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="submit" size="lg" className="w-full">
            Finish signing in
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (state === 'error') {
    return (
      <AuthCard title="Sign-in link problem" subtitle={error}>
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.replace('/account/login')}
        >
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Signing you in…" subtitle="One moment while we verify your link.">
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-cranberry" />
      </div>
    </AuthCard>
  );
}

export default function AccountVerifyPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <VerifyInner />
    </Suspense>
  );
}
