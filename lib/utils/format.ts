export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString, { month: 'short', day: 'numeric' });
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Reduce Markdown-ish text to clean plain text for previews (cards, teasers).
 * Strips emphasis, headings, code, list markers, and turns [text](url) into
 * just the text — so authored Markdown never shows raw `**` on the site.
 */
export function toPlainText(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')     // links → link text
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')       // inline / fenced code
    .replace(/(\*\*|__)(.*?)\1/g, '$2')          // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')             // italic
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')          // headings
    .replace(/^\s*[-*+]\s+/gm, '')               // bullet markers
    .replace(/\*\*|__/g, '')                     // any stray emphasis markers
    .replace(/\s+/g, ' ')                        // collapse whitespace for 1–2 line previews
    .trim();
}
