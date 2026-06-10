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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-4 sm:p-6">
      <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-3 text-base">
        Attendees <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({distinctAttendeeCount})</span>
        {goingCount > distinctAttendeeCount && (
          <span className="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1">
            · {goingCount} ticket{goingCount !== 1 ? 's' : ''}
          </span>
        )}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {rsvps
          .filter((r) => r.status === 'going')
          .map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
              <Avatar src={r.memberPhoto} alt={r.memberName} size="sm" />
              <span className="font-medium">{r.memberName}</span>
              {r.checkedIn && (
                <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-label="Checked in">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        {guestRsvps
          .filter((r) => r.status === 'going')
          .map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
              <Avatar src={undefined} alt={r.name} size="sm" />
              <span className="font-medium">{r.name}</span>
              <span className="w-4 h-4 rounded-full bg-azure-50 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400 text-[9px] font-bold flex items-center justify-center" title="Guest">G</span>
            </div>
          ))}
      </div>
    </div>
  );
}
