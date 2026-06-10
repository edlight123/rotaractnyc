/**
 * Loading skeleton for the portal event-detail page. Mirrors the real
 * layout (hero + content column + sidebar) so the page doesn't jump when
 * data resolves.
 */
export default function EventDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 space-y-4">
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
            <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800/60 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 space-y-3">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
        <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
}
