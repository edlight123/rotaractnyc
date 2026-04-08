'use client';

import { useState, useRef, useEffect } from 'react';
import { generateCalendarURL, downloadICSFile, getGoogleMapsUrl, copyEventLink } from '@/lib/utils/calendar';
import type { RotaractEvent } from '@/types';

interface EventActionBarProps {
  event: RotaractEvent;
  onCopied?: () => void;
  className?: string;
}

/**
 * Premium action bar: Add to Calendar, Share, Directions
 * Renders elegant icon buttons that expand on hover/tap.
 */
export default function EventActionBar({ event, onCopied, className = '' }: EventActionBarProps) {
  const [calOpen, setCalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    if (calOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calOpen]);

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

  const handleCopy = async () => {
    if (event.slug) {
      await copyEventLink(event.slug);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Add to Calendar */}
      <div className="relative" ref={calRef}>
        <button
          onClick={() => setCalOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium 
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
            text-gray-700 dark:text-gray-300 
            hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
            transition-all duration-200 shadow-sm hover:shadow"
          aria-label="Add to calendar"
        >
          <svg className="w-4 h-4 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Add to Calendar</span>
        </button>

        {calOpen && (
          <div className="absolute left-0 top-full mt-2 z-50 w-56 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-1.5">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setCalOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect width="20" height="20" x="2" y="2" rx="4" fill="#4285F4" opacity="0.1" />
                  <path d="M18 3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V6a3 3 0 00-3-3z" stroke="#4285F4" strokeWidth="1.5" />
                  <path d="M8 2v4M16 2v4M3 10h18" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Google Calendar</span>
              </a>
              <button
                onClick={handleICS}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect width="20" height="20" x="2" y="2" rx="4" fill="#333" opacity="0.1" />
                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 14l-3 3m3-3l3 3m-3-3v-4" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Apple / Outlook (.ics)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share / Copy Link */}
      {event.slug && (
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            text-gray-700 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
            transition-all duration-200 shadow-sm hover:shadow"
          aria-label="Copy event link"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>
      )}

      {/* Directions */}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            text-gray-700 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
            transition-all duration-200 shadow-sm hover:shadow"
          aria-label="Get directions"
        >
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="hidden sm:inline">Directions</span>
        </a>
      )}
    </div>
  );
}
