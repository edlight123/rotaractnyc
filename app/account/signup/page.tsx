'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth';
import { mapAuthError } from '@/lib/firebase/authErrors';
import { AuthCard, Alert, OrDivider, GoogleButton, AuthLoading } from '@/components/account/authUi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

function SignupForm() {
  const { user, loading, sessionReady, signInWithGoogle, signUpWithEmail } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/account';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Set while a signup is intentionally in progress so the "already signed in"
  // redirect effect doesn't fire and skip the verification interstitial.
  const signingUpRef = useRef(false);

  useEffect(() => {
    if (!loading && user && sessionReady && !signingUpRef.current) {
      router.replace(redirect);
      router.refresh();
    }
  }, [loading, user, sessionReady, redirect, router]);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Please choose a password with at least 6 characters.');
      return;
    }
    signingUpRef.current = true;
    setBusy(true);
    try {
      await signUpWithEmail(email.trim(), password, name);
      setDone(true);
    } catch (err: any) {
      signingUpRef.current = false;
      setError(mapAuthError(err?.code));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
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

  if (done) {
    return (
      <AuthCard
        title="Check your inbox"
        subtitle={`We sent a verification link to ${email.trim()}`}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
          Your account is ready. Verifying your email unlocks receipts and your saved
          history — but you can keep going right now.
        </p>
        <Button
          size="lg"
          className="w-full mt-6"
          onClick={() => {
            router.replace(redirect);
            router.refresh();
          }}
        >
          Continue to my account
        </Button>
      </AuthCard>
    );
  }

  const loginHref =
    redirect !== '/account'
      ? `/account/login?redirect=${encodeURIComponent(redirect)}`
      : '/account/login';

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join the Rotaract NYC community in seconds"
    >
      {error && <Alert kind="error">{error}</Alert>}

      <GoogleButton onClick={handleGoogle} loading={googleBusy} disabled={busy} />
      <OrDivider />

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link href={loginHref} className="font-semibold text-cranberry hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export default function AccountSignupPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <SignupForm />
    </Suspense>
  );
}
