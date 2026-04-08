export default function PublicLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="relative py-20 sm:py-28 bg-gradient-to-br from-cranberry-900 via-cranberry to-cranberry-800 overflow-hidden">
        <div className="container-page">
          <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />
          <div className="h-10 w-80 bg-white/10 rounded-lg animate-pulse mb-3" />
          <div className="h-5 w-64 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden">
                <div className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
