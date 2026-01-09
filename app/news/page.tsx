'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaCalendar, FaUser } from 'react-icons/fa'
import { RCUN_NEWS } from '@/lib/rcunNews'
import { useEffect, useState } from 'react'

type PostsResponseRow = Record<string, unknown>

export default function NewsPage() {
  const [newsArticles, setNewsArticles] = useState(RCUN_NEWS)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/posts')
        if (!res.ok) return
        const json: unknown = await res.json()
        const rows =
          typeof json === 'object' &&
          json &&
          Array.isArray((json as { posts?: unknown }).posts)
            ? ((json as { posts: unknown[] }).posts as unknown[])
            : []

        if (!cancelled && rows.length > 0) {
          setNewsArticles(
            rows
              .map((p) => {
                const obj: PostsResponseRow = typeof p === 'object' && p ? (p as PostsResponseRow) : {}
                const slug = String(obj.slug ?? obj.id ?? '')
                const contentRaw = obj.content
                return {
                  slug,
                  title: String(obj.title ?? ''),
                  date: String(obj.date ?? ''),
                  author: String(obj.author ?? 'Rotaract NYC'),
                  category: String(obj.category ?? 'News'),
                  excerpt: String(obj.excerpt ?? ''),
                  content: Array.isArray(contentRaw) ? contentRaw.map((x) => String(x)) : [],
                }
              })
              .filter((p) => p.slug)
          )
        }
      } catch {
        // ignore
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">News & Updates</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Stay informed about our latest activities, events, and achievements
            </p>
          </motion.div>
        </div>
      </section>

      {/* News Articles */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {newsArticles.map((article, index) => (
              <motion.article
                key={article.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <span className="bg-rotaract-pink text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {article.category}
                  </span>
                  <div className="flex items-center text-gray-600 text-sm">
                    <FaCalendar className="mr-2" />
                    <span>{article.date}</span>
                  </div>
                </div>
                <Link href={`/rcun-news/${article.slug}`} className="group inline-block">
                  <h2 className="text-2xl font-bold mb-3 text-rotaract-darkpink group-hover:text-rotaract-pink transition-colors">
                    {article.title}
                  </h2>
                </Link>
                <div className="flex items-center text-gray-600 text-sm mb-4">
                  <FaUser className="mr-2" />
                  <span>{article.author}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{article.excerpt}</p>

                <div className="mt-6">
                  <Link
                    href={`/rcun-news/${article.slug}`}
                    className="inline-flex items-center font-semibold text-rotaract-pink hover:text-rotaract-darkpink transition-colors"
                  >
                    Read more
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Stay Updated</h2>
              <p className="text-lg text-gray-700 mb-8">
                Subscribe to our newsletter to receive the latest news and updates directly in your inbox
              </p>
              <a
                href="/contact/newsletter"
                className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
              >
                Subscribe to Newsletter
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Follow Us on Social Media</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Get real-time updates and see what we&apos;re up to
          </p>
          <a
            href="/contact/follow"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            View Social Media Links
          </a>
        </div>
      </section>
    </div>
  )
}
