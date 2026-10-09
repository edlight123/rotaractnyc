import type { Metadata } from 'next';
import { SITE } from './constants';
import { DEFAULT_OG_IMAGE } from './utils/ogImage';

export function generateMeta(options: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
}): Metadata {
  // Build the full title here and mark it absolute, otherwise the root
  // layout's `%s | Rotaract NYC` template appends the suffix a second time.
  const title = !options.title
    ? SITE.shortName
    : options.title.includes(SITE.shortName)
      ? options.title
      : `${options.title} | ${SITE.shortName}`;
  const description = options.description || SITE.description;
  const url = options.path ? `${SITE.url}${options.path}` : SITE.url;
  const images = options.image ? [{ url: options.image }] : [DEFAULT_OG_IMAGE];

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
    alternates: {
      canonical: url,
    },
  };
}
