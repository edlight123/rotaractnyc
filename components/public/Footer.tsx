import Link from 'next/link';
import Image from 'next/image';
import { SITE } from '@/lib/constants';
import NewsletterSignup from '@/components/public/NewsletterSignup';

/**
 * Footer, built as a club colophon rather than a product footer.
 *
 * The old version stacked four full-width zones — a cranberry CTA slab, a
 * floating newsletter card, a four-column grid and a legal bar — and the
 * grid was badly lopsided: nine links in one column against two short ones,
 * leaving a large hole across the right half. Three of the four headings
 * ("Quick Links", "Contact", "Follow Us") were template words that described
 * the furniture rather than the club.
 *
 * What a service club's footer actually needs to say is its standing
 * details: where it meets, when, how to reach it, who charters it. Those are
 * set as a definition list, which is what they are, instead of a stack of
 * stroke icons. The nine links are split by intent — what you can read
 * versus what you can join — which balances the columns as a side effect of
 * meaning something.
 *
 * The cranberry band is kept as the single accent: the footer sits on every
 * public page, and most of them have no join CTA of their own.
 */

const exploreLinks = [
  { label: 'About us', href: '/about' },
  { label: 'Events', href: '/events' },
  { label: 'News', href: '/news' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Leadership', href: '/leadership' },
];

const involvementLinks = [
  { label: 'Become a member', href: '/membership' },
  { label: 'Donate', href: '/donate' },
  { label: 'Partner with us', href: '/partners' },
  { label: 'Contact', href: '/contact' },
];

const socials = [
  {
    label: 'Instagram',
    href: SITE.social.instagram,
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  },
  {
    label: 'LinkedIn',
    href: SITE.social.linkedin,
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'Facebook',
    href: SITE.social.facebook,
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
];

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-gray-400 hover:text-white focus-visible:text-white transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300" role="contentinfo">
      {/* Invitation */}
      <div className="bg-cranberry">
        <div className="container-page py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 text-white">
          <p className="font-display text-lg font-bold">
            There is a place for you in this club.
          </p>
          <Link
            href="/membership"
            className="btn-md shrink-0 bg-white text-cranberry hover:bg-cranberry-50 font-bold rounded-xl shadow-sm transition-colors"
          >
            Become a member
          </Link>
        </div>
      </div>

      <div className="container-page py-14 lg:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          {/* Club identity. The motto is the one loud thing down here — it is
              the club's actual name for itself, not decoration. */}
          <div className="lg:col-span-4">
            <Image
              src="/rotaract-logo.png"
              alt={SITE.name}
              width={240}
              height={60}
              className="h-11 w-auto brightness-0 invert"
            />
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-gray-400">
              Young professionals and emerging leaders in New York City, working in service,
              leadership, and global fellowship.
            </p>
            <p className="mt-6 font-display text-base font-bold text-gold">{SITE.motto}</p>

            <ul className="mt-6 -ml-2.5 flex items-center gap-1">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-900 hover:text-white focus-visible:bg-gray-900 focus-visible:text-white transition-colors"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d={social.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <LinkColumn title="Explore" links={exploreLinks} />
          </div>

          <div className="lg:col-span-2">
            <LinkColumn title="Get involved" links={involvementLinks} />
          </div>

          {/* Standing details — a definition list, because that is the shape
              of the information. Meeting time leads: it is the question a
              prospective member actually arrives with. */}
          <div className="lg:col-span-4">
            <h2 className="text-sm font-semibold text-white">Find us</h2>
            <dl className="mt-4 space-y-3.5 text-sm">
              <div>
                <dt className="text-gray-500">We meet</dt>
                <dd className="mt-0.5 text-gray-300">{SITE.meetingSchedule}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="mt-0.5 text-gray-300">{SITE.address}</dd>
              </div>
              <div>
                <dt className="text-gray-500">General enquiries</dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${SITE.email}`}
                    className="text-gray-300 underline decoration-gray-700 underline-offset-4 hover:text-white hover:decoration-gray-400 focus-visible:text-white transition-colors"
                  >
                    {SITE.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Joining the club</dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${SITE.membershipEmail}`}
                    className="text-gray-300 underline decoration-gray-700 underline-offset-4 hover:text-white hover:decoration-gray-400 focus-visible:text-white transition-colors"
                  >
                    {SITE.membershipEmail}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Newsletter, on the same band rather than floating above it. */}
        <div className="mt-14 border-t border-gray-800/80 pt-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-white">
              Hear what the club is up to
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Events, service projects, and stories — about once a month.
            </p>
          </div>
          <NewsletterSignup source="footer" className="lg:w-[420px] lg:shrink-0" />
        </div>
      </div>

      <div className="border-t border-gray-800/80">
        <div className="container-page py-6 flex flex-col gap-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Chartered by{' '}
            <span className="text-gray-400">{SITE.sponsor}</span>.
          </p>
          <Link
            href="/portal/login"
            className="text-gray-400 hover:text-white focus-visible:text-white transition-colors"
          >
            Member sign-in
          </Link>
        </div>
      </div>
    </footer>
  );
}
