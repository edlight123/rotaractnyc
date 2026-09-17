/**
 * The admin-editable WhatsApp community link.
 *
 * WhatsApp invite links are meant to be rotated — resetting the link is the
 * remedy when one leaks or starts attracting spam. That is why this is
 * editable from Site Settings rather than living only in code: a safety
 * valve that needs a deploy to operate is one nobody pulls.
 *
 * Being editable is also why it is parsed rather than trusted. The value is
 * rendered straight into an href on a public page, which is the same
 * exposure externalRegistrationUrl already exists to defend against in this
 * codebase: admin-entered free text becoming a script-injection vector. A
 * value that is not an https invite to chat.whatsapp.com is refused
 * outright — not coerced into something that looks safe, because a mangled
 * link that silently does nothing is worse than a rejected one.
 */
import { SITE } from '@/lib/constants';

const INVITE_HOST = 'chat.whatsapp.com';

/**
 * The link if it is a usable WhatsApp invite, otherwise null.
 * Returns the original string, untouched apart from trimming, so the stored
 * value and the published value are always the same text.
 */
export function parseCommunityInviteUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Published link, so https only — and an exact host match, since
  // `chat.whatsapp.com.evil.test` ends with the same characters.
  if (url.protocol !== 'https:') return null;
  if (url.hostname.toLowerCase() !== INVITE_HOST) return null;

  // "/" alone is the app, not an invitation to anything.
  if (url.pathname.replace(/\/+$/, '').length === 0) return null;

  return trimmed;
}

/**
 * The link to publish: the stored one when it is valid, otherwise the
 * built-in. Validates on the way out as well as on the way in, so a value
 * written by an older build, a script, or the Firestore console cannot
 * reach a public href unchecked.
 */
export function communityLinkOrDefault(stored: string | null | undefined): string {
  return parseCommunityInviteUrl(stored) ?? SITE.whatsappCommunity;
}
