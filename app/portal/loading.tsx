export default function PortalLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading portal content" role="status">
      <span className="sr-only">Loading…</span>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
