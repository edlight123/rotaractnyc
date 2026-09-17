/**
 * The WhatsApp community link is admin-editable and rendered straight into
 * an href on a public page. That combination is exactly what
 * externalRegistrationUrl already exists to defend against in this codebase:
 * admin-entered free text becoming a script-injection vector. So the value
 * is parsed, not trusted, and anything that is not an https invite link to
 * chat.whatsapp.com is refused rather than sanitised into something else.
 */
import { parseCommunityInviteUrl, communityLinkOrDefault } from '@/lib/utils/communityLink';
import { SITE } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/sandra-knowledge';

const VALID = 'https://chat.whatsapp.com/LgXZYScjL0S3LuMLlHbolB';

describe('parseCommunityInviteUrl', () => {
  it('accepts a WhatsApp invite link', () => {
    expect(parseCommunityInviteUrl(VALID)).toBe(VALID);
  });

  it('trims surrounding whitespace, since the value is pasted', () => {
    expect(parseCommunityInviteUrl(`  ${VALID}\n`)).toBe(VALID);
  });

  it('accepts the host whatever case it is typed in', () => {
    expect(parseCommunityInviteUrl('https://CHAT.WhatsApp.com/AbC123')).toBe(
      'https://CHAT.WhatsApp.com/AbC123',
    );
  });

  it('refuses a javascript: URL', () => {
    expect(parseCommunityInviteUrl('javascript:alert(document.cookie)')).toBeNull();
  });

  it('refuses a data: URL', () => {
    expect(parseCommunityInviteUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('refuses plain http, because the link is published', () => {
    expect(parseCommunityInviteUrl('http://chat.whatsapp.com/AbC123')).toBeNull();
  });

  it('refuses any other host, however plausible', () => {
    expect(parseCommunityInviteUrl('https://whatsapp.com/AbC123')).toBeNull();
    expect(parseCommunityInviteUrl('https://chat.whatsapp.com.evil.test/AbC123')).toBeNull();
    expect(parseCommunityInviteUrl('https://evil.test/chat.whatsapp.com/AbC123')).toBeNull();
  });

  it('refuses a bare host with no invite code', () => {
    expect(parseCommunityInviteUrl('https://chat.whatsapp.com')).toBeNull();
    expect(parseCommunityInviteUrl('https://chat.whatsapp.com/')).toBeNull();
  });

  it('refuses empty and malformed values', () => {
    expect(parseCommunityInviteUrl('')).toBeNull();
    expect(parseCommunityInviteUrl('   ')).toBeNull();
    expect(parseCommunityInviteUrl('not a url')).toBeNull();
    expect(parseCommunityInviteUrl(null)).toBeNull();
    expect(parseCommunityInviteUrl(undefined)).toBeNull();
    expect(parseCommunityInviteUrl(42 as unknown as string)).toBeNull();
  });
});

describe('communityLinkOrDefault', () => {
  it('uses the stored link when it is valid', () => {
    expect(communityLinkOrDefault(VALID)).toBe(VALID);
  });

  it('falls back to the built-in link when nothing is stored', () => {
    expect(communityLinkOrDefault(null)).toBe(SITE.whatsappCommunity);
    expect(communityLinkOrDefault('')).toBe(SITE.whatsappCommunity);
  });

  it('falls back rather than publishing a stored value that fails validation', () => {
    // Belt and braces: the PUT validates on the way in, but a value written
    // by an older build, a script, or the Firestore console must not reach a
    // public href unchecked.
    expect(communityLinkOrDefault('javascript:alert(1)')).toBe(SITE.whatsappCommunity);
  });
});

/**
 * Sandra has to quote the CURRENT link. The whole reason the link is
 * editable is so it can be reset when it leaks — and a reset that Sandra
 * keeps handing out the old link after is not a reset.
 */
describe('Sandra quotes the live link', () => {
  const ROTATED = 'https://chat.whatsapp.com/RotatedInviteCode99';

  it('uses the link it is given over the built-in one', () => {
    const prompt = buildSystemPrompt({ tier: 'public' }, { whatsappCommunityUrl: ROTATED });
    expect(prompt).toContain(ROTATED);
    expect(prompt).not.toContain(SITE.whatsappCommunity);
  });

  it('falls back to the built-in link when none is passed', () => {
    expect(buildSystemPrompt({ tier: 'public' })).toContain(SITE.whatsappCommunity);
  });

  it('leaves no placeholder token in the prompt', () => {
    for (const prompt of [
      buildSystemPrompt({ tier: 'public' }),
      buildSystemPrompt({ tier: 'member' }, { whatsappCommunityUrl: ROTATED }),
      buildSystemPrompt({ tier: 'board' }, { whatsappCommunityUrl: ROTATED }),
    ]) {
      expect(prompt).not.toContain('__WHATSAPP_COMMUNITY_URL__');
    }
  });
});
