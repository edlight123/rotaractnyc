import { getRcunNewsArticleBySlug } from '@/lib/rcunNews'
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { ArticleView } from './_components/ArticleView'

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

  return <ArticleView article={article} slug={slug} />
}
