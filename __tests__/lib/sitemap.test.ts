/**
 * Tests for app/sitemap.ts
 */

import sitemap from '@/app/sitemap';

describe('sitemap', () => {
  it('returns an array of sitemap entries', async () => {
    const entries = await sitemap();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('includes the homepage', async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === 'https://rotaractnyc.org');
    expect(home).toBeDefined();
    expect(home!.priority).toBe(1);
    expect(home!.changeFrequency).toBe('weekly');
  });

  it('includes key public pages', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://rotaractnyc.org/events');
    expect(urls).toContain('https://rotaractnyc.org/about');
    expect(urls).toContain('https://rotaractnyc.org/news');
    expect(urls).toContain('https://rotaractnyc.org/contact');
    expect(urls).toContain('https://rotaractnyc.org/donate');
    expect(urls).toContain('https://rotaractnyc.org/membership');
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
