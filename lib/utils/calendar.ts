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
