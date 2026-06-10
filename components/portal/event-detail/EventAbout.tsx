import EventDescription from '@/components/public/EventDescription';
import type { RotaractEvent } from '@/types';

interface EventAboutProps {
  event: RotaractEvent;
}

/** "About this event" card — formatted description plus optional tag chips. */
export default function EventAbout({ event }: EventAboutProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8">
      <h2 className="font-display font-semibold text-gray-900 dark:text-white mb-4 text-lg">About this event</h2>
      <EventDescription
        text={event.description}
        className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
      />
      {event.tags && event.tags.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
          {event.tags.map((tag) => (
            <span key={tag} className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
