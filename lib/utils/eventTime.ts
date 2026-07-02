/**
 * Shared "has this event ended?" rule — used by the public event page and the
 * checkout/RSVP APIs so ticket sales close consistently everywhere.
 *
 * An event counts as ended once the calendar day of its end (endDate when set,
 * otherwise its start date) has fully passed. Using end-of-day keeps same-day
 * door sales working while the event is running.
 */
export function eventHasEnded(event: { date?: string | null; endDate?: string | null }): boolean {
  const basis = event?.endDate || event?.date;
  if (!basis) return false;
  const end = new Date(basis);
  if (isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}
