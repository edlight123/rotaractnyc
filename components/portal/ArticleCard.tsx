import Link from 'next/link';
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

interface ArticleCardProps {
  article: Article;
  onDelete?: (id: string) => void;
  canManage?: boolean;
}

export default function ArticleCard({ article, onDelete, canManage }: ArticleCardProps) {
  return (
    <Card interactive padding="none" className="overflow-hidden group relative h-full flex flex-col">
      <Link href={`/portal/articles/${article.slug}`} className="block flex-1">
        {/* Cover */}
        <div className="h-40 bg-gradient-to-br from-cranberry-100 to-cranberry-50 dark:from-cranberry-900/20 dark:to-cranberry-950/30 overflow-hidden relative">
          {article.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          {!article.isPublished && (
            <div className="absolute top-3 left-3">
              <Badge variant="gold">Draft</Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Badge variant={categoryColors[article.category] || 'gray'}>{article.category}</Badge>
            {article.publishedAt && (
              <span className="text-xs text-gray-400 tabular-nums">{formatDate(article.publishedAt, { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
          <h3 className="font-display font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-cranberry dark:group-hover:text-cranberry-400 transition-colors">{article.title}</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{article.excerpt}</p>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700 dark:text-gray-300">By {article.author?.name || 'Unknown'}</span>
            {article.viewCount != null && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{article.viewCount} views</span></>}
            {article.likeCount != null && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{article.likeCount} likes</span></>}
          </div>
        </div>
      </Link>

      {canManage && onDelete && (
        <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(article.id); }}
            className="p-2 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-red-600 hover:bg-red-600 hover:text-white shadow-sm transition-all duration-150"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )}
    </Card>
  );
}
