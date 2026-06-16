'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/auth';

/**
 * Lightweight chrome for inner supporter-hub pages (tickets, donations,
 * profile). A branded header with a back link to the hub and a sign-out
 * control, on the soft public background. Intentionally simpler than the
 * members-only PortalShell.
 */
export default function AccountShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/account" className="flex items-center gap-3">
            <Image
              src="/rotaract-logo.png"
              alt="Rotaract NYC"
              width={160}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>
          <button
            onClick={() => signOut()}
            className="text-sm font-medium text-gray-500 hover:text-cranberry transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/account"
            className="text-sm font-medium text-gray-500 hover:text-cranberry transition-colors"
          >
            ← Back to account
          </Link>
          <h1 className="mt-2 text-2xl font-display font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
