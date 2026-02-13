import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug } from '@/lib/firebase/queries';
import { formatDate } from '@/lib/utils/format';
import Badge from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

const categoryColors: Record<string, 'cranberry' | 'azure' | 'green' | 'gold' | 'gray'> = {
  Service: 'azure',
  Leadership: 'cranberry',
  International: 'green',
  Fellowship: 'gold',
};

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  return (
    <>
      {/* Hero with optional cover image */}
      <section className="relative py-28 sm:py-36 bg-gradient-to-br from-cranberry-900 via-cranberry to-cranberry-800 text-white overflow-hidden">
        {article.coverImage && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.coverImage} alt="" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-cranberry-900/90 via-cranberry-900/60 to-cranberry-900/80" />
          </div>
        )}
        <div className="container-page relative z-10">
          <Link href="/news" className="inline-flex items-center gap-1 text-cranberry-200 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to News
          </Link>
          <Badge variant={categoryColors[article.category] || 'gold'} className="mb-4">{article.category}</Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold max-w-3xl">{article.title}</h1>
          <div className="mt-4 flex items-center gap-4 text-cranberry-200 text-sm">
            {article.author.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={article.author.photoURL} alt={article.author.name} className="w-8 h-8 rounded-full border-2 border-cranberry-300" />
            )}
            <span>By {article.author.name}</span>
            {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
            {article.viewCount != null && article.viewCount > 0 && <span>· {article.viewCount} views</span>}
          </div>
        </div>
      </section>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="container-page py-3 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <article
            className="max-w-3xl mx-auto prose prose-lg dark:prose-invert prose-headings:font-display prose-a:text-cranberry hover:prose-a:text-cranberry-700 prose-img:rounded-xl prose-img:shadow-lg"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Share & engagement */}
          <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {article.likeCount != null && article.likeCount > 0 && (
                <span>❤️ {article.likeCount} likes</span>
              )}
              {article.viewCount != null && article.viewCount > 0 && (
                <span>👁 {article.viewCount} views</span>
              )}
            </div>
            <Link href="/news" className="text-sm text-cranberry hover:text-cranberry-700 font-medium transition-colors">
              ← More articles
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
