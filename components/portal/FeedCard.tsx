'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/utils/format';
import type { CommunityPost } from '@/types';

interface FeedCardProps {
  post: CommunityPost;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
}

/** Max characters to show before collapsing. */
const COLLAPSE_CHARS = 280;
/** Max newlines to show before collapsing. */
const COLLAPSE_LINES = 5;

export default function FeedCard({ post, onLike, onComment }: FeedCardProps) {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const likeDisplayCount = (post.likeCount || 0) + (liked ? 1 : 0);
  const commentDisplayCount = post.commentCount || 0;

  const handleLike = () => {
    setLiked(!liked);
    onLike?.(post.id);
  };

  /* ── Truncation logic ── */
  const { needsTruncation, visibleContent } = useMemo(() => {
    const text = String(post.content ?? '');
    const lines = text.split('\n');
    const tooLong = text.length > COLLAPSE_CHARS;
    const tooManyLines = lines.length > COLLAPSE_LINES;

    if (!tooLong && !tooManyLines) return { needsTruncation: false, visibleContent: text };

    // Truncate by whichever limit is hit first
    let truncated: string;
    if (tooManyLines && lines.slice(0, COLLAPSE_LINES).join('\n').length <= COLLAPSE_CHARS) {
      truncated = lines.slice(0, COLLAPSE_LINES).join('\n');
    } else {
      // Truncate to COLLAPSE_CHARS at last word boundary
      const raw = text.slice(0, COLLAPSE_CHARS);
      const lastSpace = raw.lastIndexOf(' ');
      truncated = lastSpace > COLLAPSE_CHARS * 0.6 ? raw.slice(0, lastSpace) : raw;
    }
    return { needsTruncation: true, visibleContent: truncated };
  }, [post.content]);

  const displayContent = expanded ? post.content : visibleContent;

  return (
    <article className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300/80 dark:hover:border-gray-700 transition-all duration-200 overflow-hidden">
      {/* Announcement accent bar */}
      {post.type === 'announcement' && (
        <div className="h-1 bg-gradient-to-r from-cranberry-600 via-cranberry to-cranberry-600" />
      )}
      {post.type === 'spotlight' && (
        <div className="h-1 bg-gradient-to-r from-gold-500 via-gold to-gold-500" />
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <Avatar src={post.authorPhoto} alt={post.authorName || 'Member'} size="md" className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{post.authorName}</p>
              {post.type === 'announcement' && <Badge variant="cranberry">📢 Announcement</Badge>}
              {post.type === 'spotlight' && <Badge variant="gold">⭐ Spotlight</Badge>}
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 tabular-nums">{formatRelativeTime(post.createdAt)}</span>
            </div>

            {/* Content with smart truncation */}
            <div className="mt-3 text-gray-700 dark:text-gray-300 text-[14px] leading-relaxed whitespace-pre-wrap break-words">
              {displayContent}
              {needsTruncation && !expanded && (
                <span className="text-gray-400">… </span>
              )}
            </div>
            {needsTruncation && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1.5 text-sm font-semibold text-cranberry hover:text-cranberry-800 dark:text-cranberry-400 dark:hover:text-cranberry-300 transition-colors"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}

            {/* Images */}
            {post.imageURLs && post.imageURLs.length > 0 && (
              <div className={`mt-4 rounded-xl overflow-hidden ${post.imageURLs.length === 1 ? '' : 'grid grid-cols-2 gap-1'}`}>
                {post.imageURLs.map((url, i) => (
                  <Image
                    key={i}
                    src={url}
                    alt=""
                    className="object-cover w-full h-52 hover:scale-[1.02] transition-transform duration-300"
                    width={400}
                    height={208}
                  />
                ))}
              </div>
            )}

            {/* Link preview */}
            {post.linkURL && (
              <a
                href={post.linkURL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group/link"
              >
                <div className="w-9 h-9 rounded-lg bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <span className="text-sm text-cranberry group-hover/link:text-cranberry-800 dark:group-hover/link:text-cranberry-300 font-medium truncate transition-colors">{post.linkURL}</span>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}

            {/* Engagement summary (above actions) */}
            {(likeDisplayCount > 0 || commentDisplayCount > 0) && (
              <div className="flex items-center gap-3 mt-3.5 px-0.5 text-xs text-gray-400 dark:text-gray-500">
                {likeDisplayCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-gradient-to-br from-red-400 to-red-500 text-white">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </span>
                    <span className="tabular-nums">{likeDisplayCount}</span>
                  </span>
                )}
                {commentDisplayCount > 0 && (
                  <span className="tabular-nums">
                    {commentDisplayCount} {commentDisplayCount === 1 ? 'comment' : 'comments'}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/60 -mx-1">
              <button
                type="button"
                onClick={handleLike}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  liked
                    ? 'text-red-500 bg-red-50/60 dark:bg-red-900/15'
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50/60 dark:hover:bg-red-900/10'
                }`}
              >
                <svg className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={liked ? 0 : 1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <span className="hidden xs:inline">Like</span>
              </button>
              <div className="w-px h-5 bg-gray-100 dark:bg-gray-800/60" />
              <button
                type="button"
                onClick={() => onComment?.(post.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-cranberry hover:bg-cranberry-50/60 dark:hover:bg-cranberry-900/10 transition-all duration-200"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                <span className="hidden xs:inline">Comment</span>
              </button>
              <div className="w-px h-5 bg-gray-100 dark:bg-gray-800/60" />
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-azure hover:bg-azure-50/60 dark:hover:bg-azure-900/10 transition-all duration-200"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0-12.814a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0 12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                <span className="hidden xs:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
