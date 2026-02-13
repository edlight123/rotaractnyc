import type { Metadata } from 'next';
import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import Badge from '@/components/ui/Badge';
import { generateMeta } from '@/lib/seo';
import { getPublishedArticles } from '@/lib/firebase/queries';
import { formatDate } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generateMeta({
  title: 'News',
  description: 'Stay updated with the latest news, stories, and announcements from Rotaract NYC.',
  path: '/news',
});

const categoryColors: Record<string, 'cranberry' | 'azure' | 'green' | 'gold' | 'gray'> = {
  Service: 'azure',
  Leadership: 'cranberry',
  International: 'green',
  Fellowship: 'gold',
};

export default async function NewsPage() {
  const articles = await getPublishedArticles();

  return (
    <>
      <HeroSection title="News & Stories" subtitle="Stay updated with the latest from our club — service stories, announcements, and more." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.slug}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-200"
              >
                {/* Cover image or placeholder */}
                <div className="h-48 bg-gradient-to-br from-cranberry-100 to-cranberry-50 dark:from-cranberry-900/20 dark:to-cranberry-950/30 flex items-center justify-center overflow-hidden">
                  {article.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <svg className="w-12 h-12 text-cranberry-300 dark:text-cranberry-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant={categoryColors[article.category] || 'gray'}>{article.category}</Badge>
                    <span className="text-xs text-gray-400">{article.publishedAt ? formatDate(article.publishedAt) : ''}</span>
                  </div>
                  <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {article.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <span>By {article.author.name}</span>
                    {article.viewCount && <span>· {article.viewCount} views</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
