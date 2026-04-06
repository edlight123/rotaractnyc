/**
 * HTML sanitization utility for rendering user-generated content.
 *
 * Uses DOMPurify (browser-native) for client-side sanitization.
 * For server components, use the SafeHtml client component instead
 * to avoid jsdom dependency issues during Next.js builds.
 */
import DOMPurify from 'dompurify';

/** Allowed HTML tags for article / rich-text content. */
const ALLOWED_TAGS = [
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Block
  'p', 'br', 'hr', 'blockquote', 'pre', 'div',
  // Lists
  'ul', 'ol', 'li',
  // Inline
  'a', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'mark', 'span', 'code', 'small',
  // Media
  'img', 'figure', 'figcaption', 'video', 'source',
  // Table
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
];

/** Allowed HTML attributes. */
const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title', 'class',
  'width', 'height', 'style', 'id', 'colspan', 'rowspan',
  'controls', 'autoplay', 'loop', 'muted', 'type', 'loading',
];

/**
 * Sanitize untrusted HTML for safe rendering via dangerouslySetInnerHTML.
 * Only works in the browser (client components).
 *
 * @param dirty - Raw HTML string (e.g., from Firestore)
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  if (typeof window === 'undefined') return dirty; // SSR fallback – should use SafeHtml component instead
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

// Hook: after sanitization, ensure external links are safe
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (href.startsWith('http')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (node.tagName === 'IMG') {
      node.setAttribute('loading', 'lazy');
    }
  });
}
