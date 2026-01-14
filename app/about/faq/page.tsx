'use client'

import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGES, type FaqItem } from '@/lib/content/pages'

type FaqRow = {
  question: string
  answer: string
  category?: string
}

type FaqCategory = {
  name: string
  icon: string
  faqs: FaqRow[]
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className="group bg-gray-50 dark:bg-gray-800/50 rounded-md overflow-hidden transition-all duration-300 open:bg-white dark:open:bg-gray-800 open:shadow-sm open:ring-1 open:ring-black/5 dark:open:ring-white/10"
    >
      <summary className="flex cursor-pointer items-center justify-between p-5 list-none select-none">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 group-hover:text-rotaract-pink transition-colors pr-4">
          {question}
        </h3>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-5 pb-5 pt-0">
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm md:text-base">
          {answer}
        </p>
      </div>
    </details>
  )
}

export default function FAQPage() {
  const defaults = DEFAULT_PAGES.faq
  const defaultFaqs = useMemo(() => {
    const data = defaults.data as { faqs?: FaqItem[] } | undefined
    return (data?.faqs ?? []).map((f) => ({ 
      question: f.question, 
      answer: f.answer,
      category: (f as { category?: string }).category || 'General'
    }))
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
              category: String(obj.category ?? 'General')
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

  // Group FAQs by category
  const categories: FaqCategory[] = useMemo(() => {
    const categoryMap = new Map<string, FaqRow[]>()
    
    faqs.forEach((faq) => {
      const cat = faq.category || 'General'
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, [])
      }
      categoryMap.get(cat)!.push(faq)
    })

    // Define category icons and order
    const categoryConfig: Record<string, { icon: string; order: number }> = {
      'Joining the Club': { icon: '👥', order: 1 },
      'Events & Meetings': { icon: '📅', order: 2 },
      'Rotary International': { icon: '🌍', order: 3 },
      'General': { icon: '❓', order: 99 }
    }

    return Array.from(categoryMap.entries())
      .map(([name, faqs]) => ({
        name,
        icon: categoryConfig[name]?.icon || '❓',
        faqs,
      }))
      .sort((a, b) => {
        const orderA = categoryConfig[a.name]?.order || 99
        const orderB = categoryConfig[b.name]?.order || 99
        return orderA - orderB
      })
  }, [faqs])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 px-6 md:px-12 lg:px-40 py-12 md:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-16">
          {/* Page Heading */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {heroTitle}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              {heroSubtitle}
            </p>
          </div>

          {/* Accordion Groups */}
          <div className="space-y-12">
            {categories.map((category, catIndex) => (
              <section
                key={catIndex}
                className="bg-white dark:bg-gray-900 rounded-lg p-6 md:p-8 shadow-soft border border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-3xl">{category.icon}</span>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {category.name}
                  </h2>
                </div>
                <div className="flex flex-col gap-4">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      question={faq.question}
                      answer={faq.answer}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 md:p-12 text-center shadow-card border border-rotaract-pink/10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rotaract-pink to-transparent opacity-50"></div>
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-rotaract-pink/5 rounded-full blur-3xl group-hover:bg-rotaract-pink/10 transition-colors"></div>
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="size-14 rounded-full bg-rotaract-pink/10 flex items-center justify-center text-rotaract-pink mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Still have questions?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                We&apos;re here to help. If you couldn&apos;t find what you were looking for, reach out to our membership chair directly.
              </p>
              <a
                href="/contact"
                className="bg-rotaract-pink hover:bg-rotaract-darkpink text-white text-base font-bold py-3 px-8 rounded-sm transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <span>Contact Support</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
