import Link from 'next/link'
import { getRcunNewsArticleBySlug } from '@/lib/rcunNews'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'

type Props = {
  params: { slug: string[] }
}

export default async function NewsArticlePage({ params }: Props) {
  const slug = (params.slug || []).join('/')
  let article = getRcunNewsArticleBySlug(slug)

  if (isFirebaseAdminConfigured()) {
    try {
      const doc = await getFirebaseAdminDb().collection('posts').doc(slug).get()
      if (doc.exists) {
        const data: unknown = doc.data()
        const obj = typeof data === 'object' && data ? (data as Record<string, unknown>) : null
        if (obj && obj.published !== false) {
          article = {
            slug,
            title: String(obj.title ?? slug),
            date: String(obj.date ?? ''),
            author: String(obj.author ?? 'Rotaract NYC'),
            category: String(obj.category ?? 'News'),
            excerpt: String(obj.excerpt ?? ''),
            content: Array.isArray(obj.content) ? obj.content.map((x) => String(x)) : [],
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const title = article?.title ?? slug.split('/').pop()?.replace(/-/g, ' ') ?? 'Article'

  return (
    <div className="min-h-screen bg-white">
      <section className="relative pt-32 pb-12 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />

        <div className="container mx-auto px-4 relative max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-rotaract-darkpink tracking-tight capitalize">
            {title}
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {article ? (
              <>
                <span className="font-semibold text-gray-800">{article.category}</span> · {article.date} · {article.author}
              </>
            ) : (
              <>
                This link is supported, but the article content isn’t in the local dataset yet.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg">
            {article ? (
              <div className="prose prose-gray max-w-none">
                {article.content.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-gray-700 leading-relaxed">
                  If you want this specific article to match the live site more closely, tell me the exact headline,
                  date, and the points you want included—and I’ll add it to our RCUN News dataset.
                </p>
                <div className="mt-6 rounded-xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-600">
                    Requested path: <span className="font-mono">/rcun-news/{slug}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/rcun-news"
                className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
              >
                Back to News
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
