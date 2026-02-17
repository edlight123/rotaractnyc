/**
 * Input sanitization utilities.
 *
 * Escapes HTML entities to prevent XSS when user input is rendered
 * in emails or injected into HTML templates.
 */

const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const ENTITY_RE = /[&<>"'`/]/g;

/**
 * Escape a string for safe inclusion in HTML.
 * Use this for any user-provided text rendered in email templates
 * or dangerouslySetInnerHTML.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str).replace(ENTITY_RE, (char) => ENTITY_MAP[char] || char);
}

/**
 * Sanitise an object's string values (shallow).
 * Returns a new object with all string values escaped.
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (typeof out[key] === 'string') {
      (out as Record<string, unknown>)[key] = escapeHtml(out[key] as string);
    }
  }
  return out;
}

/**
 * Strip HTML tags entirely (plain-text extraction).
 */
export function stripHtml(str: string): string {
  if (!str) return '';
  return String(str).replace(/<[^>]*>/g, '');
}

/**
 * Validate email format (RFC 5322 simplified).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Clamp a number between min and max.
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
