/**
 * Tests for the Markdown-stripping preview helper in lib/utils/format.ts.
 *
 * Event descriptions are authored with light Markdown and rendered richly by
 * <EventDescription> on the detail page. Every *preview* surface (event cards,
 * search results, SEO/OG descriptions, push notifications) is plain text and
 * must strip the syntax — otherwise "**Neighborhood Supper**" ships asterisks
 * and all, which is exactly what showed up on the /events cards.
 */

import { toPlainText } from '@/lib/utils/format';

describe('toPlainText', () => {
  it('returns an empty string for missing input', () => {
    expect(toPlainText(undefined)).toBe('');
    expect(toPlainText(null)).toBe('');
    expect(toPlainText('')).toBe('');
  });

  it('strips bold markers', () => {
    expect(toPlainText('our monthly **Neighborhood Supper**, a community meal')).toBe(
      'our monthly Neighborhood Supper, a community meal',
    );
  });

  it('strips a bold label followed by a colon', () => {
    expect(toPlainText('**When:** The third Saturday of every month.')).toBe(
      'When: The third Saturday of every month.',
    );
  });

  it('strips italics, headings, bullets, code and links', () => {
    expect(toPlainText('## Details')).toBe('Details');
    expect(toPlainText('*bring a warm heart*')).toBe('bring a warm heart');
    expect(toPlainText('- set up\n- serve')).toBe('set up serve');
    expect(toPlainText('run `npm test` first')).toBe('run npm test first');
    expect(toPlainText('see [our events](https://rotaractnyc.org/events)')).toBe('see our events');
  });

  it('collapses newlines so a two-line card preview stays on two lines', () => {
    expect(toPlainText('First paragraph.\n\nSecond paragraph.')).toBe(
      'First paragraph. Second paragraph.',
    );
  });

  it('handles the real Neighborhood Supper description end to end', () => {
    const description =
      'Join Rotaract NYC for our monthly **Neighborhood Supper**, a community meal ' +
      'service in partnership with the Holy Trinity Neighborhood Center.\n\n' +
      'We serve **90–120 guests** each month.\n\n' +
      '**When:** The third Saturday of every month, 3:30–6:30 PM.';

    const preview = toPlainText(description);

    expect(preview).not.toContain('*');
    expect(preview).toContain('our monthly Neighborhood Supper');
    expect(preview).toContain('90–120 guests');
    expect(preview).toContain('When: The third Saturday');
  });
});
