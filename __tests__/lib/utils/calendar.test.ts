/**
 * Tests for lib/utils/calendar.ts
 */

import { generateCalendarURL } from '@/lib/utils/calendar';

describe('generateCalendarURL', () => {
  const baseEvent = {
    title: 'Service Project',
    date: '2025-07-15T18:00:00',
    location: 'Central Park, NYC',
    description: 'Monthly community clean-up',
  };

  it('returns a Google Calendar URL', () => {
    const url = generateCalendarURL(baseEvent);
    expect(url).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  });

  it('includes the action=TEMPLATE param', () => {
    const url = generateCalendarURL(baseEvent);
    expect(url).toContain('action=TEMPLATE');
  });

  it('includes the event title as text param', () => {
    const url = generateCalendarURL(baseEvent);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('Service Project');
  });

  it('includes dates param with start/end separated by /', () => {
    const url = generateCalendarURL(baseEvent);
    const parsed = new URL(url);
    const dates = parsed.searchParams.get('dates');
    expect(dates).toBeTruthy();
    expect(dates).toContain('/');
  });

  it('formats dates without trailing Z (local time)', () => {
    const url = generateCalendarURL(baseEvent);
    const parsed = new URL(url);
    const dates = parsed.searchParams.get('dates')!;
    const [start, end] = dates.split('/');
    // Should look like YYYYMMDDTHHmmss (no Z suffix)
    expect(start).toMatch(/^\d{8}T\d{6}$/);
    expect(end).toMatch(/^\d{8}T\d{6}$/);
  });

  it('includes timezone parameter as America/New_York', () => {
    const url = generateCalendarURL(baseEvent);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('ctz')).toBe('America/New_York');
  });

  it('includes details and location params', () => {
    const url = generateCalendarURL(baseEvent);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('details')).toBe('Monthly community clean-up');
    expect(parsed.searchParams.get('location')).toBe('Central Park, NYC');
  });

  it('defaults to empty string when location and description are omitted', () => {
    const url = generateCalendarURL({ title: 'Quick Meeting', date: '2025-08-01T12:00:00' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('details')).toBe('');
    expect(parsed.searchParams.get('location')).toBe('');
  });

  it('defaults endDate to 2 hours after startDate when not provided', () => {
    const url = generateCalendarURL({
      title: 'Short Event',
      date: '2025-09-10T10:00:00',
    });
    const parsed = new URL(url);
    const dates = parsed.searchParams.get('dates')!;
    const [startStr, endStr] = dates.split('/');
    // End should be 2 hours after start
    // Start: 10:00:00 → End: 12:00:00 on same day
    expect(startStr).toContain('T100000');
    expect(endStr).toContain('T120000');
  });

  it('uses provided endDate when given', () => {
    const url = generateCalendarURL({
      title: 'Long Event',
      date: '2025-09-10T10:00:00',
      endDate: '2025-09-10T17:00:00',
    });
    const parsed = new URL(url);
    const dates = parsed.searchParams.get('dates')!;
    const [, endStr] = dates.split('/');
    expect(endStr).toContain('T170000');
  });

  it('URL-encodes special characters in title', () => {
    const url = generateCalendarURL({
      title: 'Gala & Awards Night',
      date: '2025-12-01T19:00:00',
    });
    // The URL should be valid and contain the encoded ampersand
    expect(() => new URL(url)).not.toThrow();
    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe('Gala & Awards Night');
  });

  it('includes sf=true param', () => {
    const url = generateCalendarURL(baseEvent);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('sf')).toBe('true');
  });
});
