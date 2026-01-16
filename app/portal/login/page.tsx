'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FcGoogle } from 'react-icons/fc';

export default function PortalLoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !loading) {
      router.push('/portal');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-blue/10 blur-3xl" />
      <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-blue/10 blur-3xl" />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-8">
        <div className="text-center">
          <Image
            src="/Rotaract%20Logo%20(1).png"
            alt="Rotaract NYC Member Portal"
            width={120}
            height={48}
            className="mx-auto h-12 w-auto"
            priority
          />
          <h1 className="mt-6 text-3xl font-bold text-primary">Member Login</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to access the member portal</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FcGoogle className="text-2xl" />
            {signingIn ? 'Signing in...' : 'Continue with Google'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Only active members can access the portal. Contact an administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
