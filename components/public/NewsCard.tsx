import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils/format';
import type { Article } from '@/types';

const categoryColors: Record<string, 'cranberry' | 'azure' | 'green' | 'gold' | 'gray'> = {
  Service: 'azure',
  Leadership: 'cranberry',
  International: 'green',
  Fellowship: 'gold',
};

interface NewsCardProps {
  article: Article;
  featured?: boolean;
}

export default function NewsCard({ article, featured = false }: NewsCardProps) {
  return (
    <Link href={`/news/${article.slug}`}>
      <Card interactive padding="none" className="overflow-hidden group h-full">
        {/* Cover image */}
        <div className={`relative bg-gradient-to-br from-cranberry-100 to-cranberry-50 dark:from-cranberry-900/20 dark:to-cranberry-950/30 overflow-hidden ${featured ? 'h-52' : 'h-36'}`}>
          {article.coverImage && (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={categoryColors[article.category] || 'gray'}>{article.category}</Badge>
            {article.publishedAt && (
              <span className="text-xs text-gray-400">{formatDate(article.publishedAt, { month: 'short', day: 'numeric' })}</span>
            )}
          </div>

          <h3 className={`font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors line-clamp-2 ${featured ? 'text-xl' : ''}`}>
            {article.title}
          </h3>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {article.excerpt}
          </p>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            {article.author?.name && <span>By {article.author.name}</span>}
            {article.viewCount != null && (
              <>
                <span>·</span>
                <span>{article.viewCount} views</span>
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
