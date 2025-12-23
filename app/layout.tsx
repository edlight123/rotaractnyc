import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Rotaract Club at the United Nations',
  description: 'Rotaract Club of New York at the United Nations - Service, Fellowship, Diversity',
  keywords: ['rotaract', 'united nations', 'new york', 'service club', 'volunteer', 'leadership'],
  openGraph: {
    title: 'Rotaract Club at the United Nations',
    description: 'Rotaract Club of New York at the United Nations',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
