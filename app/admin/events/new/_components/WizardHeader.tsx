import Link from 'next/link'

export default function WizardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-4 sticky top-0 z-[60]">
      <div className="flex items-center gap-4">
        <div className="text-primary">
          <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"></path>
          </svg>
        </div>
        <div>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-none">
            Rotaract Club of NYC
          </h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
            Admin Portal
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/admin/dashboard" className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link href="/admin/events" className="text-slate-900 dark:text-white text-sm font-bold border-b-2 border-primary pb-1">
            Events
          </Link>
          <Link href="/admin/members" className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors">
            Members
          </Link>
        </nav>
      </div>
    </header>
  )
}
