'use client'

import Link from 'next/link'
import { RCUN_NEWS } from '@/lib/rcunNews'
import { useEffect, useState } from 'react'
import Image from 'next/image'

type PostsResponseRow = Record<string, unknown>

interface NewsArticle {
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

function formatTrendingRank(n: number) {
  return String(n).padStart(2, '0')
}

// Category color mapping for visual distinction
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Service: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  Leadership: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  International: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  Professional: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
  Social: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
  Fundraising: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
}

function getCategoryStyle(category: string) {
  return categoryColors[category] || { bg: 'bg-gray-50 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' }
}

export default function NewsPage() {
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(RCUN_NEWS)
  const [displayedCount, setDisplayedCount] = useState(6)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/posts')
        if (!res.ok) {
          setIsLoading(false)
          return
        }
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
                const imageUrl = String(obj.imageUrl ?? '')
                return {
                  slug,
                  title: String(obj.title ?? ''),
                  date: String(obj.date ?? ''),
                  author: String(obj.author ?? 'Rotaract NYC'),
                  category: String(obj.category ?? 'News'),
                  excerpt: String(obj.excerpt ?? ''),
                  content: Array.isArray(contentRaw) ? contentRaw.map((x) => String(x)) : [],
                  imageUrl: imageUrl || undefined,
                  readTime: String(obj.readTime ?? '5 min read'),
                }
              })
              .filter((p) => p.slug)
          )
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredArticles = selectedCategory
    ? newsArticles.filter((a) => a.category === selectedCategory)
    : newsArticles

  const featuredArticle = filteredArticles[0]
  const editorsPicks = filteredArticles.slice(1, 4)
  const feedArticles = filteredArticles.slice(4, displayedCount)
  const hasMore = filteredArticles.length > displayedCount
  const trendingArticles = newsArticles.slice(0, 5)
  const categories = Array.from(new Set(newsArticles.map((a) => a.category).filter(Boolean))).slice(0, 12)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-text-main dark:text-gray-100">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">The Official Blog</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
                RCUN
              </span>
              <span className="block mt-2 bg-gradient-to-r from-primary via-primary to-amber-500 bg-clip-text text-transparent italic">
                Chronicles
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-text-muted dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Stories of service, leadership, and community impact from the Rotaract Club at the United Nations in New York City.
            </p>

            {/* Stats row */}
            <div className="mt-10 flex flex-wrap justify-center gap-8 sm:gap-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{newsArticles.length}+</div>
                <div className="text-sm text-text-muted dark:text-gray-400 mt-1">Articles</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{categories.length}</div>
                <div className="text-sm text-text-muted dark:text-gray-400 mt-1">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Weekly</div>
                <div className="text-sm text-text-muted dark:text-gray-400 mt-1">Updates</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Category Filter Pills */}
        <div className="mb-12 -mt-4">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === null
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white dark:bg-slate-800 text-text-muted dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              All Stories
            </button>
            {categories.map((cat) => {
              const style = getCategoryStyle(cat)
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border ${
                    selectedCategory === cat
                      ? `${style.bg} ${style.text} ${style.border} shadow-md`
                      : 'bg-white dark:bg-slate-800 text-text-muted dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-text-muted dark:text-gray-400">Loading stories...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Featured Article - Full Width Hero Card */}
            {featuredArticle && (
              <section className="mb-16">
                <article className="group relative">
                  <Link
                    href={`/rcun-news/${featuredArticle.slug}`}
                    className="block relative overflow-hidden rounded-3xl bg-slate-900"
                  >
                    {/* Background Image with Overlay */}
                    <div className="relative aspect-[21/9] sm:aspect-[21/8]">
                      {featuredArticle.imageUrl ? (
                        <Image
                          src={featuredArticle.imageUrl}
                          alt={featuredArticle.title}
                          fill
                          sizes="100vw"
                          className="object-cover transition-transform duration-1000 group-hover:scale-105"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/80 to-slate-900" />
                      )}
                      {/* Gradient Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-transparent" />
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-14">
                      <div className="max-w-3xl">
                        {/* Category & Meta */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider">
                            Featured
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getCategoryStyle(featuredArticle.category).bg} ${getCategoryStyle(featuredArticle.category).text}`}>
                            {featuredArticle.category}
                          </span>
                          <span className="text-white/70 text-sm">{featuredArticle.date}</span>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 group-hover:text-primary transition-colors duration-300">
                          {featuredArticle.title}
                        </h2>

                        {/* Excerpt */}
                        <p className="text-lg text-white/80 line-clamp-2 mb-6 leading-relaxed max-w-2xl">
                          {featuredArticle.excerpt}
                        </p>

                        {/* Author & CTA */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white font-bold">
                              {(featuredArticle.author || 'R')[0]}
                            </div>
                            <div>
                              <p className="text-white font-medium">{featuredArticle.author || 'Rotaract NYC'}</p>
                              <p className="text-white/60 text-sm">{featuredArticle.readTime || '5 min read'}</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-2 text-white font-semibold group-hover:gap-4 transition-all duration-300">
                            Read Full Story
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              </section>
            )}

            {/* Editor's Picks Section */}
            {editorsPicks.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-primary to-amber-500 rounded-full" />
                    <h2 className="text-2xl font-bold">Editor&apos;s Picks</h2>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {editorsPicks.map((article, idx) => (
                    <article
                      key={article.slug}
                      className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-500 ${
                        idx === 0 ? 'md:col-span-1 md:row-span-2' : ''
                      }`}
                    >
                      <Link href={`/rcun-news/${article.slug}`} className="block h-full">
                        <div className={`relative overflow-hidden ${idx === 0 ? 'aspect-[3/4]' : 'aspect-video'}`}>
                          {article.imageUrl ? (
                            <Image
                              src={article.imageUrl}
                              alt={article.title}
                              fill
                              sizes={idx === 0 ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 768px) 100vw, 25vw'}
                              className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          {/* Category Badge */}
                          <div className="absolute top-4 left-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm ${getCategoryStyle(article.category).bg} ${getCategoryStyle(article.category).text}`}>
                              {article.category}
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          <h3 className={`font-bold leading-tight mb-2 group-hover:text-primary transition-colors ${
                            idx === 0 ? 'text-xl' : 'text-lg'
                          }`}>
                            {article.title}
                          </h3>
                          <p className="text-text-muted dark:text-gray-400 text-sm line-clamp-2 mb-4">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-text-muted dark:text-gray-500">
                            <span>{article.author}</span>
                            <span>{article.readTime}</span>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Articles Feed */}
              <div className="lg:col-span-8">
                {feedArticles.length > 0 && (
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 bg-gradient-to-b from-primary to-amber-500 rounded-full" />
                        <h2 className="text-2xl font-bold">Latest Stories</h2>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                    </div>

                    <div className="space-y-8">
                      {feedArticles.map((article) => (
                        <article
                          key={article.slug}
                          className="group flex flex-col sm:flex-row gap-6 p-4 -mx-4 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800/50 transition-all duration-300"
                        >
                          <Link href={`/rcun-news/${article.slug}`} className="w-full sm:w-56 shrink-0">
                            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shadow-sm group-hover:shadow-lg transition-shadow">
                              {article.imageUrl ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={article.imageUrl}
                                    alt={article.title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, 224px"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800" />
                              )}
                            </div>
                          </Link>

                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getCategoryStyle(article.category).bg} ${getCategoryStyle(article.category).text}`}>
                                {article.category}
                              </span>
                              <span className="text-xs text-text-muted dark:text-gray-500">{article.readTime}</span>
                            </div>

                            <Link href={`/rcun-news/${article.slug}`}>
                              <h3 className="text-xl font-bold leading-tight mb-2 group-hover:text-primary transition-colors">
                                {article.title}
                              </h3>
                            </Link>

                            <p className="text-text-muted dark:text-gray-400 text-sm line-clamp-2 leading-relaxed mb-4">
                              {article.excerpt}
                            </p>

                            <div className="flex items-center gap-3 text-sm">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center text-primary font-bold text-xs">
                                {(article.author || 'R')[0]}
                              </div>
                              <div className="text-text-muted dark:text-gray-400">
                                <span className="font-medium text-text-main dark:text-gray-200">{article.author}</span>
                                <span className="mx-2">·</span>
                                <span>{article.date}</span>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    {hasMore && (
                      <div className="mt-12 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setDisplayedCount((c) => c + 4)}
                          className="group px-8 py-4 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-text-main dark:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 font-medium text-sm tracking-wide flex items-center gap-3"
                        >
                          Load More Stories
                          <svg className="w-4 h-4 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {filteredArticles.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No stories found</h3>
                    <p className="text-text-muted dark:text-gray-400">
                      {selectedCategory ? `No articles in "${selectedCategory}" category yet.` : 'Check back soon for new content!'}
                    </p>
                  </div>
                )}
              </div>

              {/* Premium Sidebar */}
              <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">
                {/* Newsletter Card - Premium */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-blue-700 p-[1px]">
                  <div className="relative bg-gradient-to-br from-primary via-primary to-blue-700 rounded-2xl p-6 text-white overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl" />
                    
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2">The Weekly Digest</h3>
                      <p className="text-white/80 text-sm mb-5 leading-relaxed">
                        Get curated stories about service, events, and member spotlights delivered to your inbox.
                      </p>
                      <form className="space-y-3" action="/newsletter-sign-up" method="get">
                        <input
                          className="w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur border border-white/30 placeholder-white/60 text-white focus:bg-white/30 focus:border-white/50 outline-none text-sm transition-all"
                          placeholder="Enter your email"
                          required
                          type="email"
                          name="email"
                        />
                        <button
                          className="w-full bg-white text-primary font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors text-sm shadow-lg"
                          type="submit"
                        >
                          Subscribe Now
                        </button>
                      </form>
                      <p className="text-xs text-white/60 mt-3 text-center">Join 500+ subscribers · Unsubscribe anytime</p>
                    </div>
                  </div>
                </div>

                {/* Trending Section */}
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-lg">Trending Now</h4>
                  </div>
                  
                  <ul className="space-y-5">
                    {trendingArticles.map((a, idx) => (
                      <li key={a.slug} className="group">
                        <Link href={`/rcun-news/${a.slug}`} className="flex gap-4 items-start">
                          <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-400 dark:from-slate-600 dark:to-slate-700 group-hover:from-primary group-hover:to-amber-500 transition-all leading-none">
                            {formatTrendingRank(idx + 1)}
                          </span>
                          <div className="flex-1 pt-1">
                            <h5 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {a.title}
                            </h5>
                            <div className="flex items-center gap-2 mt-2 text-xs text-text-muted dark:text-gray-500">
                              <span>{a.date}</span>
                              <span>·</span>
                              <span>{a.readTime}</span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Join CTA Card */}
                <div className="relative overflow-hidden rounded-2xl bg-slate-900 dark:bg-slate-800 p-6 text-white">
                  {/* Pattern overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                  </div>
                  
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/30">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold mb-2">Join Our Community</h4>
                    <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                      Be part of a global network dedicated to service and leadership.
                    </p>
                    <Link
                      href="/membership-requirements"
                      className="inline-flex items-center justify-center w-full gap-2 bg-gradient-to-r from-primary to-amber-500 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                    >
                      Become a Member
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                  <h4 className="font-bold text-lg mb-4">Quick Links</h4>
                  <nav className="space-y-2">
                    {[
                      { label: 'Upcoming Events', href: '/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                      { label: 'Our Mission', href: '/mission', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { label: 'Leadership', href: '/leadership', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                      { label: 'Gallery', href: '/gallery', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    ].map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <svg className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={link.icon} />
                          </svg>
                        </div>
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">{link.label}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
