'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { DEFAULT_GALLERY } from '@/lib/content/gallery'
import { useEffect, useState } from 'react'

type GalleryResponseRow = Record<string, unknown>

export default function GalleryPage() {
  const [images, setImages] = useState([...DEFAULT_GALLERY].sort((a, b) => a.order - b.order))

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/gallery')
        if (!res.ok) return
        const json: unknown = await res.json()
        const rows =
          typeof json === 'object' &&
          json &&
          Array.isArray((json as { items?: unknown }).items)
            ? ((json as { items: unknown[] }).items as unknown[])
            : []

        if (!cancelled && rows.length > 0) {
          const mapped = rows
            .map((g) => {
              const obj: GalleryResponseRow = typeof g === 'object' && g ? (g as GalleryResponseRow) : {}
              const order = Number(obj.order)
              return {
                id: String(obj.id ?? ''),
                title: String(obj.title ?? ''),
                alt: String(obj.alt ?? ''),
                imageUrl: String(obj.imageUrl ?? ''),
                order: Number.isFinite(order) ? order : 1,
              }
            })
            .filter((g) => g.id)
          setImages(mapped.sort((a, b) => a.order - b.order))
        }
      } catch {
        // ignore and keep defaults
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Gallery</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Moments from our events, service projects, and social gatherings
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {images.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow"
              >
                <div className="relative h-80">
                  <Image
                    src={image.imageUrl}
                    alt={image.alt}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-rotaract-darkpink/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <div className="p-6 text-white">
                      <h3 className="text-xl font-bold">{image.title}</h3>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Gallery Sections */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">More Photos Coming Soon</h2>
            <p className="text-lg text-gray-700 mb-8">
              We&apos;re constantly updating our gallery with new photos from our events and activities. Follow us on social media to see the latest updates!
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="https://www.facebook.com/rotaractnewyorkcity/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-rotaract-pink font-semibold px-6 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
              >
                Facebook
              </a>
              <a
                href="http://instagram.com/rotaractnyc"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-rotaract-pink font-semibold px-6 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Want to Be in Our Next Photo?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Join us at our next event and become part of our story
          </p>
          <a
            href="/events"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            View Upcoming Events
          </a>
        </div>
      </section>
    </div>
  )
}
