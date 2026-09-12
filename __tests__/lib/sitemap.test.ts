/**
 * Tests for app/sitemap.ts
 */

import sitemap from '@/app/sitemap';
import { SITE } from '@/lib/constants';

// Derived from SITE.url rather than hardcoded: these assertions previously
// pinned the bare apex host while the sitemap (correctly) emits the canonical
// www host, so the whole suite went red on a constant it wasn't testing.

describe('sitemap', () => {
  it('returns an array of sitemap entries', async () => {
    const entries = await sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('includes the homepage', async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === SITE.url);
    expect(home).toBeDefined();
    expect(home!.priority).toBe(1);
    expect(home!.changeFrequency).toBe('weekly');
  });

  it('includes key public pages', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${SITE.url}/events`);
    expect(urls).toContain(`${SITE.url}/about`);
    expect(urls).toContain(`${SITE.url}/news`);
    expect(urls).toContain(`${SITE.url}/contact`);
    expect(urls).toContain(`${SITE.url}/donate`);
    expect(urls).toContain(`${SITE.url}/membership`);
  });

  it('does not include portal routes', async () => {
    const entries = await sitemap();
    const portalEntries = entries.filter((e) => e.url.includes('/portal'));
    expect(portalEntries).toHaveLength(0);
  });

  it('sets lastModified as a Date', async () => {
    const entries = await sitemap();
    entries.forEach((entry) => {
      expect(entry.lastModified).toBeInstanceOf(Date);
    });
  });
});
