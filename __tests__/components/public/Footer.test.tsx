/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
});

jest.mock('next/image', () => {
  return ({ alt, ...rest }: any) => <img alt={alt} {...rest} />;
});

import Footer from '@/components/public/Footer';

describe('Footer component', () => {
  beforeEach(() => {
    render(<Footer />);
  });

  it('renders with role="contentinfo"', () => {
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  // The nine links are split across two labelled navs by intent — reading
  // versus joining — rather than one "Quick Links" column nine items deep.
  it('exposes both link groups as labelled navigation landmarks', () => {
    expect(screen.getByRole('navigation', { name: /explore/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /get involved/i })).toBeInTheDocument();
  });

  it('still reaches every destination the old single column did', () => {
    const explore = within(screen.getByRole('navigation', { name: /explore/i }))
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'));
    const involved = within(screen.getByRole('navigation', { name: /get involved/i }))
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'));

    expect([...explore, ...involved].sort()).toEqual(
      ['/about', '/contact', '/donate', '/events', '/gallery', '/leadership', '/membership', '/news', '/partners'].sort(),
    );
  });

  it('keeps the two columns close in length, which is why they were split', () => {
    const count = (name: RegExp) =>
      within(screen.getByRole('navigation', { name })).getAllByRole('link').length;
    expect(Math.abs(count(/explore/i) - count(/get involved/i))).toBeLessThanOrEqual(1);
  });

  it('social links have aria-label attributes', () => {
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
  });

  it('social links are external with correct attributes', () => {
    const socialLinks = ['Instagram', 'LinkedIn', 'Facebook'];

    socialLinks.forEach((label) => {
      const link = screen.getByLabelText(label);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('social links point to correct URLs', () => {
    expect(screen.getByLabelText('Instagram')).toHaveAttribute(
      'href',
      'https://instagram.com/rotaractnyc'
    );
    expect(screen.getByLabelText('LinkedIn')).toHaveAttribute(
      'href',
      'https://www.linkedin.com/company/rotaractnyc'
    );
    expect(screen.getByLabelText('Facebook')).toHaveAttribute(
      'href',
      'https://facebook.com/RotaractNewYorkCity'
    );
  });

  it('renders the current copyright year', () => {
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(`© ${year}`))).toBeInTheDocument();
  });

  it('renders the membership CTA outside the link columns', () => {
    // Two links now carry this name — the banner CTA and the "Get involved"
    // entry — so assert on both rather than pinning the first match.
    const all = screen.getAllByRole('link', { name: /become a member/i });
    expect(all.length).toBe(2);
    all.forEach((link) => expect(link).toHaveAttribute('href', '/membership'));

    const banner = all.find((link) => !link.closest('nav'));
    expect(banner).toBeDefined();
  });

  // Two doors, clearly labelled: the general inbox should not be the only
  // way in, and someone asking to join should not have to guess.
  it('lists the general and membership addresses separately', () => {
    const general = screen.getByRole('link', { name: 'info@rotaractnyc.org' });
    expect(general).toHaveAttribute('href', 'mailto:info@rotaractnyc.org');

    const membership = screen.getByRole('link', { name: 'membership@rotaractnyc.org' });
    expect(membership).toHaveAttribute('href', 'mailto:membership@rotaractnyc.org');
  });

  it('gives the member sign-in a plain name', () => {
    const signIn = screen.getByRole('link', { name: /member sign-in/i });
    expect(signIn).toHaveAttribute('href', '/portal/login');
    // No trailing arrow glyph baked into the label.
    expect(signIn.textContent).not.toMatch(/[→>]/);
  });

  it('states the meeting time, which is the question people arrive with', () => {
    expect(screen.getByText(/2nd & 4th Thursday/i)).toBeInTheDocument();
  });

  it('renders the sponsor name', () => {
    expect(screen.getByText('The Rotary Club of New York')).toBeInTheDocument();
  });

  it('hides decorative SVGs from assistive tech', () => {
    const footer = screen.getByRole('contentinfo');
    const svgs = Array.from(footer.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);
    // Every remaining glyph is decorative — the social links carry their own
    // aria-label, so no SVG should be announced.
    expect(svgs.every((svg) => svg.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});
