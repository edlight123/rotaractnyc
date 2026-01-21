import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <span className="material-symbols-outlined text-accent text-8xl">search_off</span>
        </div>
        
        <h1 className="text-6xl font-black text-text-main dark:text-white mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-bold text-text-main dark:text-white mb-4">
          Page Not Found
        </h2>
        
        <p className="text-text-muted dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors"
          >
            Go home
          </Link>
          
          <Link
            href="/events"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-text-main dark:text-white font-bold rounded-lg transition-colors"
          >
            View events
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 text-sm">
          <Link href="/about" className="text-primary hover:underline">
            About Us
          </Link>
          <Link href="/membership-requirements" className="text-primary hover:underline">
            Join Us
          </Link>
          <Link href="/rcun-news" className="text-primary hover:underline">
            News
          </Link>
          <Link href="/contact-us" className="text-primary hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </div>
  )
}
