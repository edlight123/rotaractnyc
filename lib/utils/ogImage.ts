/**
 * Build the Open Graph image for a page that has its own photo.
 *
 * This used to route photos through `/_next/image` to get a resized
 * 1200×630 JPEG. Image optimization is switched off in next.config.js
 * (the Vercel quota ran out), and with it off `/_next/image` returns 404,
 * so every event, article and album preview went out with a dead image.
 * Scrapers get the source URL instead; no width/height is claimed because
 * the original's size is unknown here.
 *
 * Usage:
 *   openGraph: {
 *     images: ogImage(event.imageURL, { alt: event.title }),
 *   }
 *
 * Falls back to the site-wide share image when there is no source, so link
 * previews never go blank.
 */

import { SITE } from '@/lib/constants';

/** Site-wide share image (1200×630, public/og-image.jpg). */
export const DEFAULT_OG_IMAGE = {
  url: `${SITE.url.replace(/\/$/, '')}/og-image.jpg`,
  width: 1200,
  height: 630,
  alt: SITE.name,
};

export function ogImage(
  src: string | undefined | null,
  opts: { alt?: string } = {},
): Array<{ url: string; width?: number; height?: number; alt?: string }> {
  if (!src) return [DEFAULT_OG_IMAGE];
  return [{ url: src, ...(opts.alt ? { alt: opts.alt } : {}) }];
}
