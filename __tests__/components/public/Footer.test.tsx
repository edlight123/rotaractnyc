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

  it('contains Quick Links nav with aria-label', () => {
    const nav = screen.getByRole('navigation', { name: /quick links/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders all quick links', () => {
    const nav = screen.getByRole('navigation', { name: /quick links/i });
    const links = within(nav).getAllByRole('link');
    const linkTexts = links.map((l) => l.textContent);

    expect(linkTexts).toEqual(
      expect.arrayContaining([
        'About Us',
        'Events',
        'News',
        'Membership',
        'Gallery',
        'Leadership',
        'Contact',
        'Donate',
      ])
    );
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
      'https://linkedin.com/company/rotaract-at-the-un-nyc'
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

  it('renders "Join Rotaract NYC" CTA link', () => {
    const cta = screen.getByRole('link', { name: /join rotaract nyc/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/membership');
  });

  it('renders the sponsor name', () => {
    expect(screen.getByText('The Rotary Club of New York')).toBeInTheDocument();
  });

  it('decorative inline SVGs (e.g. icons, arrows) are hidden from assistive tech', () => {
    const footer = screen.getByRole('contentinfo');
    // The CTA arrow and contact-section icons should have aria-hidden
    const ariaHiddenSvgs = footer.querySelectorAll('svg[aria-hidden="true"]');
    // Footer has several decorative SVGs: CTA arrow + contact icons (location, email, clock)
    expect(ariaHiddenSvgs.length).toBeGreaterThanOrEqual(4);
  });
});
