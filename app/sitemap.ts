import { SITE } from '@/lib/constants';
import { getPublicEvents, getPublishedArticles } from '@/lib/firebase/queries';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;

  const staticRoutes = [
    '',
    '/about',
    '/events',
    '/news',
    '/gallery',
    '/leadership',
    '/faq',
    '/membership',
    '/contact',
    '/donate',
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));

  // Fetch dynamic slugs from Firestore
  let eventEntries: MetadataRoute.Sitemap = [];
  let articleEntries: MetadataRoute.Sitemap = [];

  try {
    const [events, articles] = await Promise.all([
      getPublicEvents(),
      getPublishedArticles(),
    ]);

    eventEntries = events
      .filter((e) => e.slug)
      .map((e) => ({
        url: `${base}/events/${e.slug}`,
        lastModified: new Date(e.date || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

    articleEntries = articles
      .filter((a) => a.slug)
      .map((a) => ({
        url: `${base}/news/${a.slug}`,
        lastModified: new Date(a.publishedAt || Date.now()),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
  } catch (e) {
    console.error('Sitemap dynamic route error:', e);
  }

  return [...staticEntries, ...eventEntries, ...articleEntries];
}
