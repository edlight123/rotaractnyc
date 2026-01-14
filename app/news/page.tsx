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

export default function NewsPage() {
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(RCUN_NEWS)
  const [displayedCount, setDisplayedCount] = useState(4)

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
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const featuredArticle = newsArticles[0]
  const feedArticles = newsArticles.slice(1, displayedCount)
  const hasMore = newsArticles.length > displayedCount
  const trendingArticles = newsArticles.slice(0, 3)
  const categories = Array.from(new Set(newsArticles.map((a) => a.category).filter(Boolean))).slice(0, 12)

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main dark:text-gray-100">
      <main className="flex-grow w-full max-w-[1140px] mx-auto px-4 md:px-8 pt-24 pb-10">
        <div className="mb-12 border-b border-gray-200/70 dark:border-gray-800 pb-6">
          <p className="text-primary text-sm font-bold uppercase tracking-widest mb-2">The Blog</p>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tight italic">RCUN Chronicles</h1>
          <p className="mt-4 text-xl text-text-muted dark:text-gray-400 max-w-2xl">
            Exploring stories of service, community leadership, and the impact of Rotaract in New York City.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: News Feed */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            {featuredArticle ? (
              <article className="group">
                <Link
                  href={`/rcun-news/${featuredArticle.slug}`}
                  className="block relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark shadow-soft border border-gray-100 dark:border-gray-800 transition-all hover:shadow-soft-hover"
                >
                  <div className="w-full aspect-video bg-gray-200 overflow-hidden">
                    {featuredArticle.imageUrl ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={featuredArticle.imageUrl}
                          alt={featuredArticle.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 740px"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          priority
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-3 text-xs font-bold uppercase tracking-wider">
                      <span className="text-primary">Featured</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-text-muted dark:text-gray-400">{featuredArticle.date}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-lg text-text-muted dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                      {featuredArticle.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200" />
                        <span className="text-sm font-medium text-text-main dark:text-gray-200">
                          {featuredArticle.author || 'Rotaract NYC'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary group-hover:translate-x-1 transition-transform">
                        Read Full Story →
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ) : (
              <div className="rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 p-8 text-text-muted dark:text-gray-400">
                No articles yet.
              </div>
            )}

            <div className="flex flex-col gap-8">
              {feedArticles.map((article) => (
                <article
                  key={article.slug}
                  className="group flex flex-col sm:flex-row gap-6 items-start pb-8 border-b border-gray-200/70 dark:border-gray-800 last:border-0"
                >
                  <Link href={`/rcun-news/${article.slug}`} className="w-full sm:w-48 sm:shrink-0">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                      {article.imageUrl ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={article.imageUrl}
                            alt={article.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 192px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">
                          {article.category || 'News'}
                        </span>
                        <span className="text-xs text-text-muted dark:text-gray-400">• {article.readTime || '5 min read'}</span>
                      </div>

                      <Link href={`/rcun-news/${article.slug}`}>
                        <h3 className="text-xl md:text-2xl font-bold leading-tight mb-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                      </Link>

                      <p className="text-text-muted dark:text-gray-400 text-sm md:text-base line-clamp-2 leading-relaxed">
                        {article.excerpt}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center text-xs text-text-muted dark:text-gray-400 font-medium">
                      <span>{article.date}</span>
                      <span className="mx-2">·</span>
                      <span>By {article.author || 'Rotaract NYC'}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-2 flex justify-center">
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => setDisplayedCount((c) => c + 3)}
                  className="px-8 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-text-main dark:text-white hover:border-primary hover:text-primary transition-all font-medium text-sm tracking-wide"
                >
                  Load More Articles
                </button>
              ) : null}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <aside className="lg:col-span-4 space-y-10 lg:sticky lg:top-24">
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-soft border border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold mb-2">The Weekly Rotaract</h3>
              <p className="text-text-muted dark:text-gray-400 text-sm mb-4 leading-relaxed">
                Get the latest updates on service projects, social events, and member spotlights directly to your inbox.
              </p>
              <form className="flex flex-col gap-3" action="/newsletter-sign-up" method="get">
                <input
                  className="w-full px-4 py-2.5 rounded-lg bg-background-light dark:bg-background-dark border border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
                  placeholder="Your email address"
                  required
                  type="email"
                  name="email"
                />
                <button
                  className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-lg transition-colors text-sm shadow-sm"
                  type="submit"
                >
                  Subscribe
                </button>
              </form>
              <p className="text-xs text-text-muted dark:text-gray-400 mt-3 text-center">No spam, unsubscribe anytime.</p>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-text-muted dark:text-gray-400 mb-6 border-b border-gray-200/70 dark:border-gray-800 pb-2">
                Trending Now
              </h4>
              <ul className="flex flex-col gap-5">
                {trendingArticles.map((a, idx) => (
                  <li key={a.slug} className="group">
                    <Link href={`/rcun-news/${a.slug}`} className="flex gap-4 items-start">
                      <span className="text-3xl font-light text-gray-300 group-hover:text-primary transition-colors -mt-2">
                        {formatTrendingRank(idx + 1)}
                      </span>
                      <div>
                        <h5 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors">{a.title}</h5>
                        <span className="text-xs text-text-muted dark:text-gray-400 mt-1 block">
                          {a.date}{a.readTime ? ` · ${a.readTime}` : ''}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-text-muted dark:text-gray-400 mb-6 border-b border-gray-200/70 dark:border-gray-800 pb-2">
                Categories
              </h4>
              <div className="flex flex-wrap gap-2">
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-main dark:text-gray-300 text-sm"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-text-muted dark:text-gray-400">No categories yet.</span>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-primary text-white p-6 text-center">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 bg-black opacity-10 rounded-full blur-2xl" />
              <h4 className="text-xl font-bold mb-2 relative z-10">Become a Member</h4>
              <p className="text-sm opacity-90 mb-4 relative z-10">Join a network of young professionals dedicated to service.</p>
              <Link
                href="/membership-requirements"
                className="bg-white text-primary text-sm font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors relative z-10 w-full inline-flex justify-center"
              >
                Apply Now
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
