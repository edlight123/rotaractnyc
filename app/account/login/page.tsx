'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { mapAuthError } from '@/lib/firebase/authErrors';
import { AuthCard, Alert, OrDivider, GoogleButton, AuthLoading } from '@/components/account/authUi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';

type Mode = 'password' | 'magic';

function LoginForm() {
  const {
    user,
    loading,
    sessionReady,
    signInWithGoogle,
    signInWithEmail,
    sendMagicLink,
    sendPasswordReset,
  } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/account';

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Once signed in AND the session cookie is set, head to the destination.
  // Waiting for sessionReady avoids the middleware bouncing us back to login.
  useEffect(() => {
    if (!loading && user && sessionReady) {
      router.replace(redirect);
      router.refresh();
    }
  }, [loading, user, sessionReady, redirect, router]);

  const handlePasswordSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
      // redirect handled by the effect once sessionReady flips true
    } catch (err: any) {
      setError(mapAuthError(err?.code));
      setBusy(false);
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await sendMagicLink(email.trim(), redirect);
      setNotice(
        `We've emailed a secure sign-in link to ${email.trim()}. Open it on this device to finish signing in.`,
      );
    } catch (err: any) {
      setError(mapAuthError(err?.code));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setNotice('');
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        setError(mapAuthError(err?.code));
      }
      setGoogleBusy(false);
    }
  };

  const handleForgot = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email above first, then tap “Forgot password?”');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      setNotice(
        `If an account exists for ${email.trim()}, a password reset link is on its way.`,
      );
    } catch (err: any) {
      setError(mapAuthError(err?.code));
    }
  };

  const signupHref =
    redirect !== '/account'
      ? `/account/signup?redirect=${encodeURIComponent(redirect)}`
      : '/account/signup';

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your Rotaract NYC account">
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <GoogleButton onClick={handleGoogle} loading={googleBusy} disabled={busy} />
      <OrDivider />

      <div
        role="tablist"
        aria-label="Sign-in method"
        className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4 text-sm font-medium"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'password'}
          onClick={() => {
            setMode('password');
            setError('');
            setNotice('');
          }}
          className={cn(
            'flex-1 rounded-lg py-1.5 transition-colors',
            mode === 'password'
              ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          )}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'magic'}
          onClick={() => {
            setMode('magic');
            setError('');
            setNotice('');
          }}
          className={cn(
            'flex-1 rounded-lg py-1.5 transition-colors',
            mode === 'magic'
              ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          )}
        >
          Email link
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <div>
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={handleForgot}
              className="mt-1.5 text-xs font-medium text-cranberry hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Sign in
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            helperText="We'll email you a secure link — no password needed."
          />
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send sign-in link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        New to Rotaract NYC?{' '}
        <Link href={signupHref} className="font-semibold text-cranberry hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-gray-400">
        Club member?{' '}
        <Link href="/portal/login" className="hover:underline">
          Use the member portal →
        </Link>
      </p>
    </AuthCard>
  );
}

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LoginForm />
    </Suspense>
  );
}
