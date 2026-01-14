'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FaArrowLeft, FaClock, FaUser, FaCalendar, FaShareAlt, FaPrint } from 'react-icons/fa'
import Image from 'next/image'

interface Article {
  slug: string
  title: string
  date: string
  author: string
  category: string
  excerpt: string
  content: string[]
  imageUrl?: string
  readTime?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Service: 'bg-green-500 text-white',
  Social: 'bg-rotaract-gold text-white',
  Professional: 'bg-rotaract-blue text-white',
  International: 'bg-purple-600 text-white',
  Leadership: 'bg-purple-700 text-white',
  Fundraising: 'bg-red-500 text-white',
  Charity: 'bg-red-500 text-white',
  Internal: 'bg-gray-700 text-white',
  News: 'bg-rotaract-pink text-white',
}

interface ArticleViewProps {
  article: Article | null
  slug: string
}

export function ArticleView({ article: initialArticle, slug }: ArticleViewProps) {
  const [article, setArticle] = useState<Article | null>(initialArticle)
  const [readingProgress, setReadingProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = (scrollTop / docHeight) * 100
      setReadingProgress(scrollPercent)
    }

    window.addEventListener('scroll', updateProgress)
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt,
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || 'bg-gray-600 text-white'
  }

  const title = article?.title ?? slug.split('/').pop()?.replace(/-/g, ' ') ?? 'Article'

  return (
    <div className="min-h-screen bg-white">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-100 z-50 no-print">
        <motion.div
          className="h-full bg-gradient-to-r from-rotaract-blue to-rotaract-pink"
          style={{ width: `${readingProgress}%` }}
          initial={{ width: 0 }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Back Button */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 no-print">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <Link
            href="/rcun-news"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-rotaract-blue transition-colors"
          >
            <FaArrowLeft /> Back to News
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <article className="container mx-auto px-4 lg:px-8 max-w-4xl pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Category Badge */}
          {article && (
            <div className="mb-6">
              <span className={`${getCategoryColor(article.category)} px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm`}>
                {article.category}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 capitalize">
            {title}
          </h1>

          {/* Meta Information */}
          {article && (
            <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8 pb-8 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FaUser className="text-gray-400" />
                <span className="font-medium">{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCalendar className="text-gray-400" />
                <span>{article.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaClock className="text-gray-400" />
                <span>{article.readTime || '5 min read'}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-12 no-print">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-rotaract-blue hover:text-rotaract-blue transition-colors text-sm font-medium"
            >
              <FaShareAlt /> Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-rotaract-blue hover:text-rotaract-blue transition-colors text-sm font-medium"
            >
              <FaPrint /> Print
            </button>
          </div>

          {/* Featured Image */}
          {article?.imageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-lg mb-12">
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Article Content */}
          {article ? (
            <div className="prose prose-lg prose-gray max-w-none">
              {/* Excerpt as lead paragraph */}
              {article.excerpt && (
                <p className="text-xl font-medium text-gray-700 leading-relaxed mb-8 p-6 bg-gray-50 rounded-xl border-l-4 border-rotaract-blue">
                  {article.excerpt}
                </p>
              )}
              
              {/* Main Content */}
              <div className="space-y-6 text-gray-700 leading-relaxed">
                {article.content.map((paragraph, idx) => (
                  <p key={idx} className="text-lg leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {article.content.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                  <p className="text-gray-700 text-lg mb-4">
                    This article is being prepared for publication.
                  </p>
                  <p className="text-gray-600 text-sm">
                    Check back soon for the full content, or{' '}
                    <Link href="/contact-us" className="text-rotaract-blue hover:underline font-medium">
                      contact us
                    </Link>{' '}
                    for more information.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h2>
              <p className="text-gray-600 mb-6">
                The article you&apos;re looking for doesn&apos;t exist yet in our database.
              </p>
              <div className="bg-white rounded-lg p-6 text-left max-w-md mx-auto mb-6">
                <p className="text-sm text-gray-600 mb-2">Requested path:</p>
                <code className="text-sm font-mono bg-gray-100 px-3 py-2 rounded block break-all">
                  /rcun-news/{slug}
                </code>
              </div>
              <p className="text-sm text-gray-500">
                If this article should exist, please let us know and we&apos;ll add it to our content database.
              </p>
            </div>
          )}
        </motion.div>

        {/* Article Footer - Related/Navigation */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <Link
              href="/rcun-news"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-gray-900 text-gray-900 font-bold hover:bg-gray-900 hover:text-white transition-all"
            >
              <FaArrowLeft /> More Articles
            </Link>
            <Link
              href="/contact-us"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-rotaract-blue to-rotaract-pink text-white font-bold hover:shadow-lg transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </article>

      {/* Newsletter CTA */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-16 border-t border-gray-100 no-print">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-rotaract-blue to-rotaract-pink p-8 md:p-12 rounded-2xl shadow-xl text-white text-center"
          >
            <h3 className="text-3xl font-bold mb-4">Stay Updated</h3>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Get the latest stories from RCUN delivered straight to your inbox every week.
            </p>
            <Link
              href="/contact/newsletter"
              className="inline-block bg-white text-rotaract-blue font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Subscribe to Newsletter
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
