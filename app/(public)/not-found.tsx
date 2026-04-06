import Link from 'next/link';
import { SITE } from '@/lib/constants';

export default function PublicNotFound() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 bg-white dark:bg-gray-950">
      <div className="text-center max-w-lg">
        {/* Illustration / Icon */}
        <div className="mx-auto mb-8 w-32 h-32 rounded-full bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-cranberry"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <p className="text-7xl font-display font-bold text-cranberry mb-4" aria-hidden="true">
          404
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
          If you think this is a mistake, feel free to{' '}
          <Link href="/contact" className="text-cranberry hover:text-cranberry-800 underline underline-offset-2 transition-colors">
            contact us
          </Link>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cranberry text-white font-semibold shadow-sm hover:bg-cranberry-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cranberry focus-visible:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
            </svg>
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cranberry focus-visible:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Us
          </Link>
        </div>

        <p className="mt-12 text-xs text-gray-400 dark:text-gray-500">
          {SITE.shortName} &middot; {SITE.motto}
        </p>
      </div>
    </section>
  );
}
