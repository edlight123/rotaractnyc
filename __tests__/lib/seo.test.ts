/**
 * Tests for lib/seo.ts
 */

import { generateMeta } from '@/lib/seo';

describe('generateMeta', () => {
  it('returns default title when no title is provided', () => {
    const meta = generateMeta({});
    expect(meta.title).toContain('Rotaract NYC');
  });

  it('appends shortName to provided title', () => {
    const meta = generateMeta({ title: 'About' });
    expect(meta.title).toBe('About | Rotaract NYC');
  });

  it('uses provided description', () => {
    const meta = generateMeta({ description: 'Custom description' });
    expect(meta.description).toBe('Custom description');
  });

  it('falls back to SITE description when none provided', () => {
    const meta = generateMeta({});
    expect(meta.description).toBeTruthy();
    expect(typeof meta.description).toBe('string');
  });

  it('sets openGraph metadata', () => {
    const meta = generateMeta({ title: 'Events', path: '/events' });
    expect(meta.openGraph).toBeDefined();
    expect((meta.openGraph as any).title).toBe('Events | Rotaract NYC');
    expect((meta.openGraph as any).url).toMatch(/\/events$/);
  });

  it('sets twitter card metadata', () => {
    const meta = generateMeta({});
    expect(meta.twitter).toBeDefined();
    expect((meta.twitter as any).card).toBe('summary_large_image');
  });
});
