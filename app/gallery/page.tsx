'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
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
    <div className="min-h-screen bg-white dark:bg-background-dark">
      {/* Premium Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-800"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <span className="material-symbols-outlined text-accent text-sm">photo_library</span>
              <span className="text-white/90 text-sm font-semibold">Our Memories</span>
            </span>
            <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight">Gallery</h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Moments from our events, service projects, and social gatherings
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {images.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500"
              >
                <div className="relative h-80">
                  <Image
                    src={image.imageUrl}
                    alt={image.alt}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
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

      {/* Social CTA */}
      <section className="py-20 bg-gray-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="material-symbols-outlined text-primary/30 text-7xl mb-4">add_a_photo</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">More Photos Coming Soon</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                We&apos;re constantly updating our gallery with new photos from events and activities. Follow us on social media for the latest!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="https://www.facebook.com/rotaractnewyorkcity/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined">thumb_up</span>
                  Facebook
                </a>
                <a
                  href="http://instagram.com/rotaractnyc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined">photo_camera</span>
                  Instagram
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-6 text-white">Want to Be in Our Next Photo?</h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join us at our next event and become part of our story
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 h-14 px-8 bg-white text-primary font-bold rounded-full transition-all shadow-xl hover:bg-accent hover:text-white hover:scale-105"
          >
            <span className="material-symbols-outlined">event</span>
            View Upcoming Events
          </Link>
        </div>
      </section>
    </div>
  )
}
