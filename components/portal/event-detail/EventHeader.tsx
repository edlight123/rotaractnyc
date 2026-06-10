import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EventActionBar from '@/components/portal/EventActionBar';
import { formatDate } from '@/lib/utils/format';
import type { RotaractEvent } from '@/types';
import { colorFor } from './meta';

interface EventHeaderProps {
  event: RotaractEvent;
  canManageEvents: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopiedLink: () => void;
}

type MetaItem = { icon: string; label: string; text: string };

/**
 * Title card: type/status badges, admin action buttons, the event title,
 * the calendar/share/directions action bar, and the date/time/location/
 * capacity meta grid.
 */
export default function EventHeader({
  event,
  canManageEvents,
  onEdit,
  onDuplicate,
  onDelete,
  onCopiedLink,
}: EventHeaderProps) {
  const metaItems: MetaItem[] = [
    {
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      label: 'Date',
      text: formatDate(event.date),
    },
    {
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      label: 'Time',
      text: event.time + (event.endTime ? ` – ${event.endTime}` : ''),
    },
    ...(event.location
      ? [{
          icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
          label: 'Location',
          text: event.location,
        }]
      : []),
    ...(event.capacity
      ? [{
          icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
          label: 'Capacity',
          text: `${event.capacity} spots`,
        }]
      : []),
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={colorFor(event.type)} className="capitalize">{event.type}</Badge>
          {(event as RotaractEvent & { isFeatured?: boolean }).isFeatured && <Badge variant="gold">⭐ Featured</Badge>}
          {event.status === 'draft' && <Badge variant="gray">Draft</Badge>}
          {event.status === 'cancelled' && <Badge variant="cranberry">Cancelled</Badge>}
          {event.isRecurring && !event.recurrenceParentId && <Badge variant="azure">🔁 Recurring</Badge>}
          {event.recurrenceParentId && <Badge variant="azure">🔁 Series #{(event.occurrenceIndex ?? 0) + 1}</Badge>}
        </div>
        {canManageEvents && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onDuplicate} title="Duplicate this event">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Duplicate
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">Delete</Button>
          </div>
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white leading-tight break-words">{event.title}</h1>

      {/* ── Action Bar: Calendar, Share, Directions ── */}
      <EventActionBar event={event} onCopied={onCopiedLink} />

      {/* Meta grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {metaItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center shrink-0">
              <svg aria-hidden="true" className="w-4 h-4 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-0.5">{item.label}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
