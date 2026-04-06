/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';

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

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

jest.mock('next/dynamic', () => {
  return () => {
    return function MockDynamicComponent() {
      return null;
    };
  };
});

jest.mock('@/components/ui/DarkModeToggle', () => {
  return function MockDarkModeToggle() {
    return <div data-testid="dark-mode-toggle" />;
  };
});

import Navbar from '@/components/public/Navbar';

describe('Navbar component', () => {
  beforeEach(() => {
    render(<Navbar />);
  });

  it('renders skip-to-content link', () => {
    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('has main navigation landmark with aria-label', () => {
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders About navigation item', () => {
    // About is a dropdown button on desktop
    expect(screen.getByRole('button', { name: /about/i })).toBeInTheDocument();
  });

  it('renders Events link', () => {
    const links = screen.getAllByRole('link', { name: /^events$/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders News link', () => {
    const links = screen.getAllByRole('link', { name: /^news$/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders Gallery link', () => {
    const links = screen.getAllByRole('link', { name: /^gallery$/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders Contact link', () => {
    const links = screen.getAllByRole('link', { name: /^contact$/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders "Member Login" link', () => {
    const loginLinks = screen.getAllByRole('link', { name: /member login/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute('href', '/portal/login');
  });

  it('renders "Join Us" link', () => {
    const joinLinks = screen.getAllByRole('link', { name: /join us/i });
    expect(joinLinks.length).toBeGreaterThan(0);
    expect(joinLinks[0]).toHaveAttribute('href', '/membership');
  });

  it('hamburger button has aria-expanded attribute', () => {
    const hamburger = screen.getByRole('button', {
      name: /open navigation menu/i,
    });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  it('hamburger button has aria-controls pointing to mobile-nav', () => {
    const hamburger = screen.getByRole('button', {
      name: /open navigation menu/i,
    });
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-nav');
  });

  it('About dropdown trigger has aria-haspopup="true"', () => {
    const aboutBtn = screen.getByRole('button', { name: /about/i });
    expect(aboutBtn).toHaveAttribute('aria-haspopup', 'true');
  });

  it('About dropdown trigger has aria-expanded', () => {
    const aboutBtn = screen.getByRole('button', { name: /about/i });
    expect(aboutBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('decorative SVGs have aria-hidden="true"', () => {
    const header = screen.getByRole('banner');
    const svgs = header.querySelectorAll('svg');

    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('renders DarkModeToggle', () => {
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
  });

  it('renders search button with aria-label', () => {
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});

describe('Navbar mobile menu interaction', () => {
  it('toggles hamburger aria-expanded on click', () => {
    render(<Navbar />);
    const hamburger = screen.getByRole('button', {
      name: /open navigation menu/i,
    });

    expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(hamburger);

    // After opening, the button label changes to "Close navigation menu"
    const closeBtn = screen.getByRole('button', {
      name: /close navigation menu/i,
    });
    expect(closeBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows mobile navigation when menu is opened', () => {
    render(<Navbar />);
    const hamburger = screen.getByRole('button', {
      name: /open navigation menu/i,
    });

    fireEvent.click(hamburger);

    const mobileNav = screen.getByRole('navigation', {
      name: /mobile navigation/i,
    });
    expect(mobileNav).toBeInTheDocument();
  });
});
