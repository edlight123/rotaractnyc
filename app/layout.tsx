import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SITE } from '@/lib/constants';
import { ToastProvider } from '@/components/ui/Toast';
import PWARegister from '@/components/PWARegister';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const viewport: Viewport = {
  themeColor: '#9B1B30',
};

export const metadata: Metadata = {
  title: {
    default: `${SITE.shortName} — Service Above Self`,
    template: `%s | ${SITE.shortName}`,
  },
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: SITE.shortName,
    description: SITE.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
        <PWARegister />
        <Analytics />
      </body>
    </html>
  );
}
