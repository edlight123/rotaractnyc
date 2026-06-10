import Avatar from '@/components/ui/Avatar';
import type { RSVP } from '@/types';
import type { GuestRsvpLite } from './types';

interface EventAttendeesPanelProps {
  rsvps: RSVP[];
  guestRsvps: GuestRsvpLite[];
  distinctAttendeeCount: number;
  goingCount: number;
}

/**
 * Attendee chip list — one badge per person who's going (members first, then
 * guests). Shows a per-person count plus a ticket count when seats exceed the
 * number of distinct attendees. Renders nothing when no one is going.
 */
export default function EventAttendeesPanel({
  rsvps,
  guestRsvps,
  distinctAttendeeCount,
  goingCount,
}: EventAttendeesPanelProps) {
  if (distinctAttendeeCount <= 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
      <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4 text-lg">
        Attendees <span className="text-gray-400 dark:text-gray-500 font-normal text-base">({distinctAttendeeCount})</span>
        {goingCount > distinctAttendeeCount && (
          <span className="text-gray-400 dark:text-gray-500 font-normal text-sm ml-1">
            · {goingCount} ticket{goingCount !== 1 ? 's' : ''}
          </span>
        )}
      </h3>
      <div className="flex flex-wrap gap-2">
        {rsvps
          .filter((r) => r.status === 'going')
          .map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full pl-1 pr-3 py-1 border border-gray-100 dark:border-gray-700 group/attendee relative">
              <Avatar src={r.memberPhoto} alt={r.memberName} size="sm" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.memberName}</span>
              {r.checkedIn && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40" title={`Checked in${r.checkedInAt ? ` at ${new Date(r.checkedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`}>
                  <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        {guestRsvps
          .filter((r) => r.status === 'going')
          .map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full pl-1 pr-3 py-1 border border-gray-100 dark:border-gray-700">
              <Avatar src={undefined} alt={r.name} size="sm" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-azure-700 bg-azure-50 dark:bg-azure-900/20">guest</span>
            </div>
          ))}
      </div>
    </div>
  );
}
