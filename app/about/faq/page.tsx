'use client'

import { motion } from 'framer-motion'
import { FaQuestionCircle } from 'react-icons/fa'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGES, type FaqItem } from '@/lib/content/pages'

type FaqRow = {
  question: string
  answer: string
}

export default function FAQPage() {
  const defaults = DEFAULT_PAGES.faq
  const defaultFaqs = useMemo(() => {
    const data = defaults.data as { faqs?: FaqItem[] } | undefined
    return (data?.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer }))
  }, [defaults.data])

  const [heroTitle, setHeroTitle] = useState(defaults.heroTitle)
  const [heroSubtitle, setHeroSubtitle] = useState(defaults.heroSubtitle)
  const [faqs, setFaqs] = useState<FaqRow[]>(defaultFaqs)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/pages/faq')
        if (!res.ok) return
        const json: unknown = await res.json()
        const page =
          typeof json === 'object' &&
          json &&
          typeof (json as { page?: unknown }).page === 'object' &&
          (json as { page?: unknown }).page
            ? ((json as { page: unknown }).page as Record<string, unknown>)
            : null

        if (!page) return

        const newHeroTitle = String(page.heroTitle ?? defaults.heroTitle)
        const newHeroSubtitle = String(page.heroSubtitle ?? defaults.heroSubtitle)

        const data = (page.data as unknown) ?? {}
        const faqsRaw =
          typeof data === 'object' && data && Array.isArray((data as { faqs?: unknown }).faqs)
            ? ((data as { faqs: unknown[] }).faqs as unknown[])
            : []

        const mapped = faqsRaw
          .map((x): FaqRow => {
            const obj = typeof x === 'object' && x ? (x as Record<string, unknown>) : {}
            return {
              question: String(obj.question ?? ''),
              answer: String(obj.answer ?? ''),
            }
          })
          .filter((f) => f.question && f.answer)

        if (cancelled) return
        setHeroTitle(newHeroTitle)
        setHeroSubtitle(newHeroSubtitle)
        if (mapped.length > 0) setFaqs(mapped)
      } catch {
        // keep defaults
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [defaults.heroSubtitle, defaults.heroTitle])

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

      {/* FAQ List */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <FaQuestionCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">{faq.question}</h3>
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Still Have Questions?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            We&apos;re here to help! Reach out to us and we&apos;ll be happy to answer any other questions you may have.
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  )
}
