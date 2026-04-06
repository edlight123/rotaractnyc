'use client';

import Link from 'next/link';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-cranberry-50 dark:bg-cranberry-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-cranberry" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          We encountered an error loading this page. Please try again or return to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-md btn-primary">
            Try again
          </button>
          <Link href="/portal" className="btn-md btn-ghost">
            Dashboard
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <pre className="mt-6 text-xs text-left bg-gray-100 dark:bg-gray-800 rounded-xl p-4 overflow-auto max-h-40 text-red-600 dark:text-red-400">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
