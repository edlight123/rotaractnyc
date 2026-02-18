'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/auth';
import Button from '@/components/ui/Button';
import { SITE } from '@/lib/constants';

export default function PortalLoginPage() {
  const { user, member, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/portal';
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user && member) {
      // If onboarding isn't complete, redirect to onboarding wizard
      if (member.onboardingComplete === false) {
        router.push('/portal/onboarding');
      } else {
        router.push(redirect);
      }
    }
  }, [loading, user, member, redirect, router]);

  const handleSignIn = async () => {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for sign-in. Please contact an administrator.');
      } else if (code === 'auth/internal-error') {
        setError('Google sign-in is not configured. Please contact an administrator.');
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(err?.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cranberry-950 via-cranberry-900 to-cranberry-800 px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src="/rotaract-logo.png"
              alt="Rotaract NYC"
              width={200}
              height={50}
              className="h-12 w-auto mx-auto mb-4"
              priority
            />
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Member Portal</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-cranberry" />
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-400 text-center">{error}</p>
                </div>
              )}

              <Button
                onClick={handleSignIn}
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={signingIn}
              >
                {signingIn ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-gray-700" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {signingIn ? 'Signing in…' : 'Sign in with Google'}
              </Button>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                  Sign in with your Google account. If you&apos;re a new member, your account will be created automatically and pending approval.
                </p>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-gray-500 hover:text-cranberry transition-colors">
              ← Back to {SITE.shortName} website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
