'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import Button from '@/components/ui/Button';
import { SITE } from '@/lib/constants';

/**
 * Shared chrome for the public account auth pages (login / signup / verify).
 * Lighter than the member PortalShell — a centered brand card on a soft
 * background, with a link back to the public site.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 sm:p-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/rotaract-logo.png"
                alt="Rotaract NYC"
                width={180}
                height={45}
                className="h-11 w-auto mx-auto mb-5"
                priority
              />
            </Link>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-cranberry transition-colors"
          >
            ← Back to {SITE.shortName} website
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Alert({
  kind = 'error',
  children,
}: {
  kind?: 'error' | 'success';
  children: ReactNode;
}) {
  const styles =
    kind === 'error'
      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
      : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400';
  return (
    <div className={`mb-4 p-3 rounded-xl border text-sm ${styles}`} role="alert">
      {children}
    </div>
  );
}

export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-200 dark:border-gray-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white dark:bg-gray-900 px-3 text-xs uppercase tracking-wide text-gray-400">
          {label}
        </span>
      </div>
    </div>
  );
}

export function GoogleButton({
  onClick,
  loading,
  disabled,
  label = 'Continue with Google',
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-gray-700" />
      ) : (
        <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      {label}
    </Button>
  );
}

export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-cranberry" />
    </div>
  );
}
