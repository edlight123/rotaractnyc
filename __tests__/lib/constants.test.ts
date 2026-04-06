/**
 * Tests for lib/constants.ts
 */

import { SITE, IMPACT_STATS, ROTARACT_BOARD_TITLES } from '@/lib/constants';

describe('SITE constants', () => {
  it('has required string properties', () => {
    expect(SITE.name).toBeTruthy();
    expect(SITE.shortName).toBeTruthy();
    expect(SITE.domain).toBeTruthy();
    expect(SITE.url).toMatch(/^https?:\/\//);
    expect(SITE.email).toMatch(/@/);
  });

  it('has a description', () => {
    expect(typeof SITE.description).toBe('string');
    expect(SITE.description.length).toBeGreaterThan(10);
  });

  it('has an address', () => {
    expect(SITE.address).toBeTruthy();
    expect(SITE.address).toContain('New York');
  });

  it('has a meeting schedule', () => {
    expect(SITE.meetingSchedule).toBeTruthy();
  });

  it('has dues in cents', () => {
    expect(SITE.dues.professional).toBeGreaterThan(0);
    expect(SITE.dues.student).toBeGreaterThan(0);
    // Dues should be in cents
    expect(SITE.dues.professional).toBeGreaterThan(100);
    expect(SITE.dues.student).toBeGreaterThan(100);
  });

  it('professional dues are greater than or equal to student dues', () => {
    expect(SITE.dues.professional).toBeGreaterThanOrEqual(SITE.dues.student);
  });

  it('has social links', () => {
    expect(SITE.social.instagram).toMatch(/instagram/);
    expect(SITE.social.linkedin).toMatch(/linkedin/);
    expect(SITE.social.facebook).toMatch(/facebook/);
  });

  it('social links are valid URLs', () => {
    const urlPattern = /^https:\/\//;
    expect(SITE.social.instagram).toMatch(urlPattern);
    expect(SITE.social.linkedin).toMatch(urlPattern);
    expect(SITE.social.facebook).toMatch(urlPattern);
  });

  it('site url is a valid URL', () => {
    expect(() => new URL(SITE.url)).not.toThrow();
  });
});

describe('IMPACT_STATS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(IMPACT_STATS)).toBe(true);
    expect(IMPACT_STATS.length).toBeGreaterThan(0);
  });

  it('each stat has a value and label string', () => {
    IMPACT_STATS.forEach((stat) => {
      expect(typeof stat.value).toBe('string');
      expect(stat.value.length).toBeGreaterThan(0);
      expect(typeof stat.label).toBe('string');
      expect(stat.label.length).toBeGreaterThan(0);
    });
  });

  it('has known categories (Service Hours, Active Members, etc.)', () => {
    const labels = IMPACT_STATS.map((s) => s.label);
    expect(labels).toContain('Service Hours');
    expect(labels).toContain('Active Members');
  });
});

describe('ROTARACT_BOARD_TITLES', () => {
  it('is a non-empty array', () => {
    expect(ROTARACT_BOARD_TITLES.length).toBeGreaterThan(0);
  });

  it('includes President and Treasurer', () => {
    expect(ROTARACT_BOARD_TITLES).toContain('President');
    expect(ROTARACT_BOARD_TITLES).toContain('Treasurer');
  });

  it('contains only non-empty strings', () => {
    ROTARACT_BOARD_TITLES.forEach((title) => {
      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });
  });

  it('has no duplicates', () => {
    const unique = new Set(ROTARACT_BOARD_TITLES);
    expect(unique.size).toBe(ROTARACT_BOARD_TITLES.length);
  });
});
