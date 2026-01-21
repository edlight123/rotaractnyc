'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
        </div>
        
        <h1 className="text-3xl font-bold text-text-main dark:text-white mb-4">
          Something went wrong
        </h1>
        
        <p className="text-text-muted dark:text-gray-400 mb-8">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>

        {error.digest && (
          <p className="text-xs text-text-muted dark:text-gray-500 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors"
          >
            Try again
          </button>
          
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-text-main dark:text-white font-bold rounded-lg transition-colors"
          >
            Go home
          </Link>
        </div>

        <p className="mt-8 text-sm text-text-muted dark:text-gray-500">
          Need help?{' '}
          <Link href="/contact-us" className="text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
}
