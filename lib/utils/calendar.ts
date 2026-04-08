export function generateCalendarURL(event: {
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: string;
  description?: string;
}): string {
  const startDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  // Format as YYYYMMDDTHHmmss (local time, no trailing Z) — timezone is
  // specified via the ctz parameter so Google Calendar interprets the times
  // in America/New_York rather than UTC.
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatGoogleDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description || '',
    location: event.location || '',
    ctz: 'America/New_York',
    sf: 'true',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an .ics file content for Apple Calendar / Outlook
 */
export function generateICSContent(event: {
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: string;
  address?: string;
  description?: string;
}): string {
  const startDate = new Date(event.date);
  const endDate = event.endDate
    ? new Date(event.endDate)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toICSDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  const loc = [event.location, event.address].filter(Boolean).join(', ');
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@rotaractnyc.org`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rotaract NYC//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;TZID=America/New_York:${toICSDate(startDate)}`,
    `DTEND;TZID=America/New_York:${toICSDate(endDate)}`,
    `SUMMARY:${(event.title || '').replace(/[,;\\]/g, '\\$&')}`,
    ...(event.description
      ? [`DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, '\\$&')}`]
      : []),
    ...(loc ? [`LOCATION:${loc.replace(/[,;\\]/g, '\\$&')}`] : []),
    `DTSTAMP:${toICSDate(new Date())}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Download a .ics file for the event
 */
export function downloadICSFile(event: Parameters<typeof generateICSContent>[0]): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(event.title || 'event').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a Google Maps directions URL
 */
export function getGoogleMapsUrl(location?: string, address?: string): string | null {
  const query = [location, address].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Copy the event's public share URL to clipboard
 */
export async function copyEventLink(slug: string): Promise<boolean> {
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/events/${slug}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return true;
  }
}
