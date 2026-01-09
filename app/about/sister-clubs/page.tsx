'use client'

import { motion } from 'framer-motion'
import { FaGlobeAmericas, FaHandshake } from 'react-icons/fa'
import { useEffect, useState } from 'react'
import {
  DEFAULT_PAGES,
  type SisterClubBenefit,
  type SisterClubItem,
  type SisterClubsData,
} from '@/lib/content/pages'

function coerceSisterClubsData(input: unknown, fallback: SisterClubsData): SisterClubsData {
  const obj = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}

  const introRaw = obj.introParagraphs
  const introParagraphs = Array.isArray(introRaw)
    ? introRaw.map((p) => String(p ?? '')).filter(Boolean)
    : fallback.introParagraphs

  const clubsRaw = obj.clubs
  const clubs: SisterClubItem[] = Array.isArray(clubsRaw)
    ? clubsRaw
        .map((c) => {
          const cc = typeof c === 'object' && c ? (c as Record<string, unknown>) : {}
          return {
            name: String(cc.name ?? ''),
            sinceYear: String(cc.sinceYear ?? ''),
            location: String(cc.location ?? ''),
            presidents: String(cc.presidents ?? ''),
          }
        })
        .filter((c) => c.name)
    : fallback.clubs

  const benefitsRaw = obj.benefits
  const benefits: SisterClubBenefit[] = Array.isArray(benefitsRaw)
    ? benefitsRaw
        .map((b) => {
          const bb = typeof b === 'object' && b ? (b as Record<string, unknown>) : {}
          return {
            title: String(bb.title ?? ''),
            description: String(bb.description ?? ''),
          }
        })
        .filter((b) => b.title)
    : fallback.benefits

  return {
    introParagraphs,
    clubs,
    benefits,
  }
}

export default function SisterClubsPage() {
  const defaults = DEFAULT_PAGES.sisterclubs
  const fallbackData = defaults.data as SisterClubsData
  const [heroTitle, setHeroTitle] = useState(defaults.heroTitle)
  const [heroSubtitle, setHeroSubtitle] = useState(defaults.heroSubtitle)
  const [data, setData] = useState<SisterClubsData>(fallbackData)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/pages/sisterclubs')
        if (!res.ok) return

        const json: unknown = await res.json()
        const page =
          typeof json === 'object' &&
          json &&
          typeof (json as { page?: unknown }).page === 'object' &&
          (json as { page?: unknown }).page
            ? ((json as { page: unknown }).page as Record<string, unknown>)
            : null

        if (!page || cancelled) return

        setHeroTitle(String(page.heroTitle ?? defaults.heroTitle))
        setHeroSubtitle(String(page.heroSubtitle ?? defaults.heroSubtitle))

        const nextData = coerceSisterClubsData(page.data, fallbackData)
        setData(nextData)
      } catch {
        // keep defaults
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [defaults.heroSubtitle, defaults.heroTitle, fallbackData])

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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">{heroTitle}</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">{heroSubtitle}</p>
          </motion.div>
        </div>
      </section>

      {/* International Network */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <FaGlobeAmericas className="text-6xl text-rotaract-pink mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink">Part of a Global Network</h2>
              {data.introParagraphs.map((p, idx) => (
                <p
                  key={idx}
                  className={
                    'text-lg text-gray-700 leading-relaxed' + (idx === 0 ? ' mb-6' : '')
                  }
                >
                  {p}
                </p>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Sister Clubs */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Our Sister Clubs</h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {data.clubs.map((club, idx) => (
                <motion.div
                  key={club.name + idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 p-8 rounded-lg shadow-lg"
                >
                  <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">{club.name}</h3>
                  <div className="space-y-3 text-gray-700">
                    <p className="flex items-start">
                      <span className="font-semibold min-w-[140px]">Sister-Club since:</span>
                      <span>{club.sinceYear}</span>
                    </p>
                    <p className="flex items-start">
                      <span className="font-semibold min-w-[140px]">Location:</span>
                      <span>{club.location}</span>
                    </p>
                    <p className="flex items-start">
                      <span className="font-semibold min-w-[140px]">{club.sinceYear} Presidents:</span>
                      <span>{club.presidents}</span>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Sister Club Benefits</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {data.benefits.map((b, idx) => {
              const Icon = idx % 2 === 0 ? FaHandshake : FaGlobeAmericas
              return (
                <motion.div
                  key={b.title + idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <Icon className="text-4xl text-rotaract-pink mb-4" />
                  <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">{b.title}</h3>
                  <p className="text-gray-700">{b.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Interested in Sister Club Partnerships?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            If your Rotaract club is interested in establishing a sister club relationship with us, we&apos;d love to hear from you!
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  )
}
