import type { Metadata } from 'next';
import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import { generateMeta } from '@/lib/seo';
import GuidePrintButton from './GuidePrintButton';

export const metadata: Metadata = generateMeta({
  title: 'Member Guide',
  description:
    'Everything new members need to know about using the Rotaract NYC portal — sign-in, events, dues, service hours, and more.',
  path: '/guide',
});

/* ─── Data ─── */

const onboardingSteps = [
  { step: 1, title: 'Profile Basics', description: 'Enter your name, phone number, and address.', icon: '👤' },
  { step: 2, title: 'About You', description: 'Add your bio, occupation, interests, and member type (Professional or Student).', icon: '📋' },
  { step: 3, title: 'Photo Upload', description: 'Upload a profile photo for the directory. You can skip and add one later.', icon: '📸' },
  { step: 4, title: 'Review & Submit', description: 'Confirm everything looks good and submit to finish onboarding.', icon: '✅' },
];

const dashboardCards = [
  { title: 'Quick Actions', description: 'One-click shortcuts to RSVP, log hours, pay dues, and edit your profile.', icon: '⚡' },
  { title: 'Community Feed', description: 'Live club activity — announcements, spotlights, and posts. Like and comment!', icon: '💬' },
  { title: 'Upcoming Events', description: 'Your next 3 events with date, time, location, and RSVP status.', icon: '📅' },
  { title: 'Service Progress', description: 'A progress ring showing hours toward the 40-hour annual goal.', icon: '🎯' },
  { title: 'Profile Completion', description: 'See how complete your profile is and fill in missing fields.', icon: '📊' },
  { title: 'Onboarding Checklist', description: 'New-member steps — first RSVP, join a committee, pay dues, and more.', icon: '✅' },
];

const portalSections = [
  {
    title: 'Events',
    icon: '📅',
    description: 'Browse upcoming and past events. Filter by type (Free, Paid, Service, Hybrid). Click any event to see full details, then RSVP as Going, Maybe, or Not Going.',
    tips: ['RSVP early — some events have limited capacity.', 'For paid events, checkout is powered by Stripe.', 'At the event, your QR code can be scanned for check-in.'],
  },
  {
    title: 'Member Directory',
    icon: '👥',
    description: 'Find fellow members by name, email, or committee. Switch between Grid and Table views, and filter by Active, Alumni, or All.',
    tips: ['Click any member card to view their full profile.', 'A complete profile helps you appear in directory searches.'],
  },
  {
    title: 'Messages',
    icon: '✉️',
    description: 'Send and receive private messages. View your Inbox and Sent tabs. On mobile, swipe left to archive.',
    tips: ['Use messages to coordinate with committee members or reach the board directly.'],
  },
  {
    title: 'Committees',
    icon: '🏛️',
    description: 'View all committees, their chairs, meeting schedules, and member counts. Click "Join" to become a member — or join the waitlist if it\'s full.',
    tips: ['Joining a committee is one of the best ways to get involved and build friendships.'],
  },
  {
    title: 'Gallery',
    icon: '🖼️',
    description: 'Browse photo albums from club events and activities. The portal gallery includes private albums not visible on the public website.',
    tips: ['Like your favourite photos with the ❤️ button.'],
  },
  {
    title: 'Service Hours',
    icon: '⏱️',
    description: 'Log volunteer hours after service events. Select the event, enter hours, and add a description. A board member will review and approve them.',
    tips: ['Log hours within a few days while details are fresh.', 'Check your progress on the Service Analytics page — includes a leaderboard!'],
  },
  {
    title: 'Dues & Billing',
    icon: '💳',
    description: 'View your dues status for the current cycle. Pay online via Stripe, or submit proof of an offline payment (Zelle, Venmo, CashApp).',
    tips: ['Professional: $85/year · Student: $65/year (Rotary year July 1 – June 30).', 'A banner will appear at the top of the portal if dues are unpaid.'],
  },
  {
    title: 'Articles',
    icon: '📰',
    description: 'Read club news and feature articles written by board members, categorized by Service, Leadership, International, and Fellowship.',
    tips: [],
  },
  {
    title: 'Documents',
    icon: '📁',
    description: 'Access meeting minutes, bylaws, handbooks, reports, and other club files — organized by category and custom folders.',
    tips: ['Pinned documents appear at the top for quick access.'],
  },
  {
    title: 'My Profile',
    icon: '👤',
    description: 'Keep your profile up to date — name, phone, bio, occupation, interests, LinkedIn, photo, and more.',
    tips: ['A complete profile shows up better in the directory and helps you connect with members.'],
  },
];

const faqItems = [
  { q: 'I signed up but see "Pending Approval" — what do I do?', a: 'A board member needs to approve your account. This usually happens within 24–48 hours.' },
  { q: 'I used a different Google account — can I switch?', a: 'Sign out, then sign back in with the correct Google account. Contact the board to merge accounts.' },
  { q: 'How do I RSVP to an event?', a: 'Go to Portal → Events, click the event, and select Going / Maybe / Not Going.' },
  { q: 'My service hours show "Pending" — is that normal?', a: 'Yes! A board member will review and approve your hours. This is standard procedure.' },
  { q: 'Can I pay dues later?', a: 'Dues are expected within the grace period. Contact the treasurer if you need an extension.' },
  { q: 'The portal is not loading / I am getting errors.', a: 'Refresh the page, clear your browser cache, try another browser, or contact the board.' },
];

/* ─── Page ─── */

export default function MemberGuidePage() {
  return (
    <>
      <HeroSection
        title="New Member Guide"
        subtitle="Everything you need to know about using the Rotaract NYC website and member portal."
        size="sm"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
          <GuidePrintButton />
          <Link
            href="/portal/login"
            className="btn-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-xl transition-all font-semibold"
          >
            Go to Portal
          </Link>
        </div>
      </HeroSection>

      {/* ── Table of Contents ── */}
      <section className="section-padding bg-white dark:bg-gray-950 print:py-6" id="guide-toc">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">
            📑 Table of Contents
          </h2>
          <nav className="columns-2 gap-x-6 text-sm">
            {[
              ['getting-started', '1. Getting Started'],
              ['onboarding', '2. Onboarding Wizard'],
              ['dashboard', '3. Your Dashboard'],
              ['portal-features', '4. Portal Features'],
              ['forms-surveys', '5. Forms & Surveys'],
              ['public-site', '6. The Public Website'],
              ['tips-faq', '7. Tips & FAQ'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block py-1.5 text-cranberry-700 dark:text-cranberry-400 hover:underline"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* ── 1. Getting Started ── */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50 print:py-8" id="getting-started">
        <div className="container-page max-w-3xl">
          <SectionHeader number={1} title="Getting Started" />

          <div className="prose-card">
            <h3>How to Sign In</h3>
            <ol>
              <li>
                Go to{' '}
                <Link href="/portal/login" className="text-cranberry-600 hover:underline">
                  rotaractnyc.org/portal/login
                </Link>
              </li>
              <li>Click <strong>&ldquo;Sign in with Google&rdquo;</strong></li>
              <li>Choose the Google account linked to your Rotaract membership</li>
              <li>You&rsquo;ll be redirected into the member portal</li>
            </ol>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              💡 <strong>First time?</strong> If you were invited by a board member, your account will be auto-approved.
              Otherwise you&rsquo;ll see a &ldquo;Pending Approval&rdquo; screen until a board member activates your membership.
            </p>
          </div>

          {/* Account status table */}
          <div className="mt-6 overflow-x-auto">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>What It Means</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><span className="badge-amber">Pending</span></td><td>Awaiting board approval — you&rsquo;ll see a waiting screen.</td></tr>
                <tr><td><span className="badge-green">Active</span></td><td>Full access to all member features.</td></tr>
                <tr><td><span className="badge-gray">Inactive</span></td><td>Account deactivated. Contact the board.</td></tr>
                <tr><td><span className="badge-blue">Alumni</span></td><td>You&rsquo;ve graduated and appear in the alumni directory.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 2. Onboarding Wizard ── */}
      <section className="section-padding bg-white dark:bg-gray-950 print:py-8" id="onboarding">
        <div className="container-page max-w-3xl">
          <SectionHeader number={2} title="Onboarding Wizard" />
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            After your first sign-in you&rsquo;ll go through a quick <strong>4-step onboarding</strong> to set up your profile.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {onboardingSteps.map((s) => (
              <div key={s.step} className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cranberry text-white text-xs font-bold">
                    {s.step}
                  </span>
                  <h3 className="font-display font-bold text-gray-900 dark:text-white">{s.title}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Your Dashboard ── */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50 print:py-8" id="dashboard">
        <div className="container-page max-w-3xl">
          <SectionHeader number={3} title="Your Dashboard" />
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The <strong>Dashboard</strong> is your home base. Here&rsquo;s what you&rsquo;ll find when you sign in:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardCards.map((c) => (
              <div key={c.title} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <span className="text-2xl block mb-2">{c.icon}</span>
                <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm mb-1">{c.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Portal Features ── */}
      <section className="section-padding bg-white dark:bg-gray-950 print:py-8" id="portal-features">
        <div className="container-page max-w-3xl">
          <SectionHeader number={4} title="Portal Features" />
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Detailed look at every section of the member portal.
          </p>
          <div className="space-y-8">
            {portalSections.map((s) => (
              <div key={s.title} className="prose-card">
                <h3 className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span> {s.title}
                </h3>
                <p>{s.description}</p>
                {s.tips.length > 0 && (
                  <ul className="mt-2">
                    {s.tips.map((t, i) => (
                      <li key={i} className="text-sm">{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Forms & Surveys ── */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50 print:py-8" id="forms-surveys">
        <div className="container-page max-w-3xl">
          <SectionHeader number={5} title="Forms & Surveys" />

          <div className="prose-card">
            <p>
              The board may share <strong>forms or surveys</strong> for event feedback, volunteer sign-ups, interest polls, and more.
              You&rsquo;ll receive a link like <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">rotaractnyc.org/f/post-gala-survey</code>.
            </p>
            <h3>How to Submit</h3>
            <ol>
              <li>Click the link to open the form</li>
              <li>Fill in the fields — text, ratings ⭐, scales, dropdowns, checkboxes, dates, etc.</li>
              <li>Click <strong>Submit</strong></li>
            </ol>
            <h3>Login-Required Forms</h3>
            <p>
              Some forms require sign-in. You&rsquo;ll see a <strong>🔒 Login Required</strong> screen.
              After signing in, your name and email are auto-filled and a green badge shows
              &ldquo;Submitting as <strong>Your Name</strong>&rdquo;.
            </p>
            <h3>Anonymous Forms</h3>
            <p>
              Other forms allow anonymous responses — name and email are optional.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Public Website ── */}
      <section className="section-padding bg-white dark:bg-gray-950 print:py-8" id="public-site">
        <div className="container-page max-w-3xl">
          <SectionHeader number={6} title="The Public Website" />
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The public site at <strong>rotaractnyc.org</strong> is visible to everyone. Here&rsquo;s what&rsquo;s there:
          </p>
          <div className="overflow-x-auto">
            <table className="guide-table">
              <thead>
                <tr><th>Page</th><th>What&rsquo;s There</th></tr>
              </thead>
              <tbody>
                <tr><td><Link href="/" className="text-cranberry-600 hover:underline">Home</Link></td><td>Hero slideshow, impact stats, events, testimonials, gallery, news</td></tr>
                <tr><td><Link href="/about" className="text-cranberry-600 hover:underline">About</Link></td><td>Mission, Rotary focus areas, impact statistics</td></tr>
                <tr><td><Link href="/events" className="text-cranberry-600 hover:underline">Events</Link></td><td>Public event listings</td></tr>
                <tr><td><Link href="/news" className="text-cranberry-600 hover:underline">News</Link></td><td>Published articles & announcements</td></tr>
                <tr><td><Link href="/gallery" className="text-cranberry-600 hover:underline">Gallery</Link></td><td>Public photo albums</td></tr>
                <tr><td><Link href="/leadership" className="text-cranberry-600 hover:underline">Leadership</Link></td><td>Board member photos & bios</td></tr>
                <tr><td><Link href="/membership" className="text-cranberry-600 hover:underline">Membership</Link></td><td>How to join, benefits, dues info</td></tr>
                <tr><td><Link href="/contact" className="text-cranberry-600 hover:underline">Contact</Link></td><td>Contact form, address, socials</td></tr>
                <tr><td><Link href="/donate" className="text-cranberry-600 hover:underline">Donate</Link></td><td>Support the club via Stripe</td></tr>
                <tr><td><Link href="/faq" className="text-cranberry-600 hover:underline">FAQ</Link></td><td>Common questions & answers</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            💡 Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">Cmd/Ctrl + K</kbd> anywhere
            to open the <strong>quick search</strong> modal.
          </p>
        </div>
      </section>

      {/* ── 7. Tips & FAQ ── */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50 print:py-8" id="tips-faq">
        <div className="container-page max-w-3xl">
          <SectionHeader number={7} title="Tips & FAQ" />
          <div className="space-y-4">
            {faqItems.map((f, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <p className="font-display font-bold text-gray-900 dark:text-white text-sm mb-1">Q: {f.q}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{f.a}</p>
              </div>
            ))}
          </div>

          {/* Keyboard shortcuts */}
          <div className="mt-8 prose-card">
            <h3>Keyboard Shortcuts</h3>
            <table className="guide-table text-sm">
              <thead>
                <tr><th>Shortcut</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr><td><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">Cmd/Ctrl + K</kbd></td><td>Open search modal</td></tr>
                <tr><td>Pull down (mobile)</td><td>Refresh the portal</td></tr>
                <tr><td>Swipe left (mobile)</td><td>Archive messages</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-padding bg-cranberry text-white text-center print:hidden">
        <div className="container-page max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4">Ready to get started?</h2>
          <p className="text-cranberry-200 mb-8">
            Sign in to the member portal and complete your onboarding today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/portal/login" className="btn-lg btn-gold">
              Sign In to Portal
            </Link>
            <Link href="/contact" className="btn-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-xl transition-all font-semibold">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Sub-Components ─── */

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cranberry text-white text-sm font-bold shrink-0">
        {number}
      </span>
      <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}
