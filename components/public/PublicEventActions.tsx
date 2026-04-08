'use client';

import { useState } from 'react';
import { generateCalendarURL, downloadICSFile, getGoogleMapsUrl } from '@/lib/utils/calendar';

interface PublicEventActionsProps {
  event: {
    title: string;
    slug: string;
    date: string;
    endDate?: string;
    time: string;
    endTime?: string;
    location?: string;
    address?: string;
    description?: string;
  };
}

/**
 * Client-side action buttons for the public event detail page.
 * Add to Calendar (Google + iCal), Share, Directions.
 */
export default function PublicEventActions({ event }: PublicEventActionsProps) {
  const [calOpen, setCalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const googleCalUrl = generateCalendarURL({
    title: event.title,
    date: event.date,
    endDate: event.endDate,
    time: event.time,
    endTime: event.endTime,
    location: event.location,
    description: event.description,
  });

  const mapsUrl = getGoogleMapsUrl(event.location, event.address);

  const handleICS = () => {
    downloadICSFile({
      title: event.title,
      date: event.date,
      endDate: event.endDate,
      time: event.time,
      endTime: event.endTime,
      location: event.location,
      address: event.address,
      description: event.description,
    });
    setCalOpen(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/events/${event.slug}`;
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
        return;
      } catch {}
    }
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const btnClass =
    'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ' +
    'bg-white/10 backdrop-blur-sm border border-white/20 text-white ' +
    'hover:bg-white/20 transition-all duration-200';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Add to Calendar */}
      <div className="relative">
        <button onClick={() => setCalOpen((v) => !v)} className={btnClass}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Add to Calendar
        </button>

        {calOpen && (
          <div className="absolute left-0 top-full mt-2 z-50 w-56 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="p-1.5">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setCalOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span>📅</span> Google Calendar
              </a>
              <button
                onClick={handleICS}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span>🍎</span> Apple / Outlook (.ics)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share */}
      <button onClick={handleShare} className={btnClass}>
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </>
        )}
      </button>

      {/* Directions */}
      {mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Directions
        </a>
      )}
    </div>
  );
}
