import { Metadata } from 'next'

export const defaultMetadata: Metadata = {
  metadataBase: new URL('https://rotaractnyc.org'),
  title: {
    default: 'Rotaract Club at the United Nations | NYC Service Organization',
    template: '%s | Rotaract NYC',
  },
  description: 'Rotaract Club of New York at the United Nations - Join young professionals ages 18-30 for service, leadership, and fellowship in NYC. Making a difference through community action.',
  keywords: [
    'rotaract',
    'united nations',
    'new york',
    'nyc',
    'service club',
    'volunteer',
    'leadership',
    'community service',
    'young professionals',
    'rotary',
    'nonprofit',
    'philanthropy',
  ],
  authors: [{ name: 'Rotaract Club at the United Nations' }],
  creator: 'Rotaract Club at the United Nations',
  publisher: 'Rotaract Club at the United Nations',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rotaractnyc.org',
    siteName: 'Rotaract Club at the United Nations',
    title: 'Rotaract Club at the United Nations | NYC Service Organization',
    description: 'Join young professionals ages 18-30 for service, leadership, and fellowship in NYC. Making a difference through community action.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Rotaract Club at the United Nations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rotaract Club at the United Nations | NYC Service Organization',
    description: 'Join young professionals ages 18-30 for service, leadership, and fellowship in NYC.',
    images: ['/og-image.jpg'],
    creator: '@rotaractnyc',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export function generatePageMetadata({
  title,
  description,
  path = '',
  image,
}: {
  title: string
  description: string
  path?: string
  image?: string
}): Metadata {
  const url = `https://rotaractnyc.org${path}`
  const ogImage = image || '/og-image.jpg'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  }
}
