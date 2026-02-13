/**
 * Tests for lib/constants.ts
 */

import { SITE } from '@/lib/constants';

describe('SITE constants', () => {
  it('has required string properties', () => {
    expect(SITE.name).toBeTruthy();
    expect(SITE.shortName).toBeTruthy();
    expect(SITE.domain).toBeTruthy();
    expect(SITE.url).toMatch(/^https?:\/\//);
    expect(SITE.email).toMatch(/@/);
  });

  it('has dues in cents', () => {
    expect(SITE.dues.professional).toBeGreaterThan(0);
    expect(SITE.dues.student).toBeGreaterThan(0);
    // Dues should be in cents
    expect(SITE.dues.professional).toBeGreaterThan(100);
    expect(SITE.dues.student).toBeGreaterThan(100);
  });

  it('has social links', () => {
    expect(SITE.social.instagram).toMatch(/instagram/);
    expect(SITE.social.linkedin).toMatch(/linkedin/);
    expect(SITE.social.facebook).toMatch(/facebook/);
  });
});
