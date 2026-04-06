'use client';

import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

interface SafeHtmlProps {
  /** Raw HTML string to sanitize and render */
  html: string;
  /** Additional CSS classes for the wrapper element */
  className?: string;
  /** HTML tag for the wrapper element (default: 'div') */
  as?: 'div' | 'article' | 'section' | 'span';
}

/**
 * Client component that safely renders user-generated HTML content.
 *
 * Sanitizes the HTML via DOMPurify in the browser before rendering,
 * preventing stored XSS attacks. Use this in server components where
 * you need to render untrusted HTML (e.g., article content from Firestore).
 *
 * @example
 * ```tsx
 * // In a server component:
 * <SafeHtml
 *   html={article.content}
 *   as="article"
 *   className="prose prose-lg dark:prose-invert"
 * />
 * ```
 */
export default function SafeHtml({ html, className, as: Tag = 'div' }: SafeHtmlProps) {
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
