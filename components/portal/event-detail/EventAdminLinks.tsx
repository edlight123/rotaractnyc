interface EventAdminLinksProps {
  eventId: string;
}

/**
 * Board-only quick actions beneath the event body: jump to the full attendee
 * roster (with PDF/Excel export) and the live camera ticket scanner for
 * door check-in.
 */
export default function EventAdminLinks({ eventId }: EventAdminLinksProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <a
        href={`/portal/events/${eventId}/attendees`}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 flex items-center justify-between gap-4 hover:border-cranberry/40 hover:shadow-sm transition-all group"
      >
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">View All Attendees</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Full roster · export PDF or Excel</p>
        </div>
        <div className="shrink-0 w-9 h-9 rounded-xl bg-cranberry/10 text-cranberry flex items-center justify-center group-hover:bg-cranberry group-hover:text-white transition-colors">
          <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
      </a>
      <div className="bg-cranberry/5 dark:bg-cranberry/10 rounded-2xl border border-cranberry/20 p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-cranberry text-sm">Scan Attendee Tickets</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Camera scanner for door check-in</p>
        </div>
        <a
          href={`/portal/events/${eventId}/scan`}
          className="shrink-0 inline-flex items-center gap-2 bg-cranberry text-white text-sm font-semibold rounded-xl px-3 py-2 hover:bg-cranberry/90 transition-colors"
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan
        </a>
      </div>
    </div>
  );
}
