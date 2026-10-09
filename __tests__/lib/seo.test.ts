/**
 * Tests for lib/seo.ts
 */

import { generateMeta } from '@/lib/seo';

describe('generateMeta', () => {
  it('returns default title when no title is provided', () => {
    const meta = generateMeta({});
    expect(meta.title).toEqual({ absolute: 'Rotaract NYC' });
  });

  it('appends shortName to provided title', () => {
    const meta = generateMeta({ title: 'About' });
    // Absolute, so the root layout's `%s | Rotaract NYC` template can't add it again
    expect(meta.title).toEqual({ absolute: 'About | Rotaract NYC' });
  });

  it('does not repeat shortName when the title already has it', () => {
    const meta = generateMeta({ title: 'Rotaract NYC — Service Above Self' });
    expect(meta.title).toEqual({ absolute: 'Rotaract NYC — Service Above Self' });
  });

  it('falls back to the site share image', () => {
    const meta = generateMeta({});
    expect((meta.openGraph as any).images[0].url).toMatch(/\/og-image\.jpg$/);
    expect((meta.twitter as any).images[0].url).toMatch(/\/og-image\.jpg$/);
  });

  it('uses a provided image', () => {
    const meta = generateMeta({ image: 'https://example.com/x.jpg' });
    expect((meta.openGraph as any).images).toEqual([{ url: 'https://example.com/x.jpg' }]);
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
