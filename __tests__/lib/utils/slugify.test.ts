/**
 * Tests for lib/utils/slugify.ts
 */

import { slugify } from '@/lib/utils/slugify';

describe('slugify', () => {
  it('converts a basic string to lowercase with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles already-lowercase input', () => {
    expect(slugify('already lowercase')).toBe('already-lowercase');
  });

  it('removes special characters', () => {
    expect(slugify('hello! @world# $test%')).toBe('hello-world-test');
  });

  it('strips accented / unicode characters (NFD normalization)', () => {
    expect(slugify('café')).toBe('cafe');
    expect(slugify('résumé')).toBe('resume');
    expect(slugify('naïve')).toBe('naive');
    expect(slugify('über cool')).toBe('uber-cool');
    expect(slugify('piñata')).toBe('pinata');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(slugify('too   many    spaces')).toBe('too-many-spaces');
  });

  it('collapses multiple consecutive hyphens into one', () => {
    expect(slugify('a---b---c')).toBe('a-b-c');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--leading')).toBe('leading');
    expect(slugify('trailing--')).toBe('trailing');
    expect(slugify('--both--')).toBe('both');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  padded  ')).toBe('padded');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(slugify('   ')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Event 2025')).toBe('event-2025');
    expect(slugify('100 days')).toBe('100-days');
  });

  it('converts underscores to hyphens', () => {
    expect(slugify('some_text_here')).toBe('some-text-here');
  });

  it('handles a realistic event title', () => {
    expect(slugify('Annual Gala: Service Above Self — 2025!')).toBe(
      'annual-gala-service-above-self-2025',
    );
  });
});
