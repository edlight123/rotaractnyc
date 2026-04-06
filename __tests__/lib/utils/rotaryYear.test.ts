/**
 * Tests for lib/utils/rotaryYear.ts
 */

import { getCurrentRotaryYear, getRotaryYearDates } from '@/lib/utils/rotaryYear';

describe('getCurrentRotaryYear', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns next cycle format when date is July 1 (start of new Rotary year)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 6, 1)); // July 1, 2025
    expect(getCurrentRotaryYear()).toBe('2025-2026');
    jest.useRealTimers();
  });

  it('returns current cycle format when date is June 30 (end of Rotary year)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 5, 30)); // June 30, 2025
    expect(getCurrentRotaryYear()).toBe('2024-2025');
    jest.useRealTimers();
  });

  it('returns correct cycle for a mid-year date in January', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 15)); // January 15, 2026
    expect(getCurrentRotaryYear()).toBe('2025-2026');
    jest.useRealTimers();
  });

  it('returns correct cycle for a date in December', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 11, 31)); // December 31, 2025
    expect(getCurrentRotaryYear()).toBe('2025-2026');
    jest.useRealTimers();
  });

  it('returns correct cycle for a date in early June', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 5, 1)); // June 1, 2025
    expect(getCurrentRotaryYear()).toBe('2024-2025');
    jest.useRealTimers();
  });

  it('returns format "YYYY-YYYY" with consecutive years', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 8, 1)); // September 1, 2025
    const result = getCurrentRotaryYear();
    expect(result).toMatch(/^\d{4}-\d{4}$/);
    const [startYear, endYear] = result.split('-').map(Number);
    expect(endYear - startYear).toBe(1);
    jest.useRealTimers();
  });
});

describe('getRotaryYearDates', () => {
  it('returns July 1 as start date', () => {
    const { start } = getRotaryYearDates('2025-2026');
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(6); // July (0-indexed)
    expect(start.getDate()).toBe(1);
  });

  it('returns June 30 as end date', () => {
    const { end } = getRotaryYearDates('2025-2026');
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(5); // June (0-indexed)
    expect(end.getDate()).toBe(30);
  });

  it('handles different year strings correctly', () => {
    const { start, end } = getRotaryYearDates('2023-2024');
    expect(start.getFullYear()).toBe(2023);
    expect(end.getFullYear()).toBe(2024);
  });

  it('end date is after start date', () => {
    const { start, end } = getRotaryYearDates('2025-2026');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});
