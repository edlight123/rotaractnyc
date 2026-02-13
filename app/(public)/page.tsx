import Link from 'next/link';
import { SITE } from '@/lib/constants';
import { getPublicEvents, getPublishedArticles } from '@/lib/firebase/queries';
import { formatDate } from '@/lib/utils/format';
import Badge from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

const pillars = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Community Service',
    description: 'We organize impactful service projects that address real needs in New York City and beyond — from food banks to park cleanups to international initiatives.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Professional Growth',
    description: 'Connect with peers across industries, attend professional development workshops, build leadership skills, and grow your network in the world\'s greatest city.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Global Fellowship',
    description: 'As part of Rotary International, we connect with Rotaract clubs worldwide. Build lifelong friendships that span borders, cultures, and continents.',
  },
];

const testimonials = [
  {
    quote: 'Joining Rotaract NYC was the best decision I made after moving to the city. I found not just a service club, but a family of passionate, driven people.',
    name: 'Sarah Chen',
    title: 'Past President',
  },
];

const typeColors: Record<string, 'cranberry' | 'green' | 'azure' | 'gold'> = {
  free: 'green',
  service: 'azure',
  paid: 'gold',
  hybrid: 'cranberry',
};

export default async function HomePage() {
  const [events, articles] = await Promise.all([
    getPublicEvents(),
    getPublishedArticles(),
  ]);

  // Take only the next 3 upcoming events
  const upcomingEvents = events.slice(0, 3);
  // Take the 3 most recent articles
  const recentArticles = articles.slice(0, 3);
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-cranberry-950 via-cranberry-900 to-cranberry-800">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        {/* Gradient overlay orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-azure/10 rounded-full blur-3xl" />

        <div className="container-page relative z-10 text-center py-32">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-sm mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
            {SITE.motto}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.1] max-w-4xl mx-auto animate-fade-in">
            Young Leaders.{' '}
            <span className="text-gold">Real Impact.</span>{' '}
            Global Community.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-cranberry-200 max-w-2xl mx-auto animate-fade-in animation-delay-200">
            We are the {SITE.name} — a diverse community of young professionals and students creating positive change through service, leadership, and fellowship.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in animation-delay-400">
            <Link href="/membership" className="btn-lg btn-gold">
              Join Rotaract NYC
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link href="/events" className="btn-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-xl transition-all font-semibold">
              Upcoming Events
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="relative -mt-16 z-20">
        <div className="container-page">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: '5,000+', label: 'Service Hours' },
              { value: '120+', label: 'Active Members' },
              { value: '$50K+', label: 'Raised for Charity' },
              { value: '15+', label: 'Global Partners' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6 text-center hover:shadow-xl transition-shadow"
              >
                <p className="text-3xl sm:text-4xl font-display font-bold text-cranberry">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="section-padding bg-white dark:bg-gray-950">
          <div className="container-page">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-sm font-semibold text-cranberry uppercase tracking-wider mb-2">What&apos;s Coming Up</p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
              </div>
              <Link href="/events" className="hidden sm:inline-flex btn-sm btn-outline">
                View All Events →
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-200"
                >
                  <div className="bg-gradient-to-r from-cranberry to-cranberry-800 px-5 py-3 flex items-center justify-between">
                    <div className="text-white">
                      <p className="text-xs font-medium text-cranberry-200">{formatDate(event.date, { weekday: 'short' })}</p>
                      <p className="text-sm font-bold">{formatDate(event.date, { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <Badge variant={typeColors[event.type] || 'green'}>
                      {event.type === 'service' ? '🤝 Service' : event.type === 'paid' ? '🎟️ Ticketed' : event.type === 'hybrid' ? '⭐ Hybrid' : '✓ Free'}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors line-clamp-2">{event.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{event.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                      <span>{event.time}</span>
                      <span>·</span>
                      <span className="truncate">{event.location.split(',')[0]}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/events" className="sm:hidden block text-center mt-6 btn-sm btn-outline">
              View All Events →
            </Link>
          </div>
        </section>
      )}

      {/* Three Pillars */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">What We Do</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white">
              Three Pillars of Rotaract
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Everything we do is guided by our commitment to service, professional growth, and building a global community.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((pillar, i) => (
              <div
                key={pillar.title}
                className="group bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 hover:bg-cranberry hover:text-white transition-all duration-300 border border-gray-100 dark:border-gray-800 hover:border-cranberry hover:shadow-xl"
              >
                <div className="w-14 h-14 rounded-xl bg-cranberry-100 dark:bg-cranberry-900/30 text-cranberry group-hover:bg-white/20 group-hover:text-white flex items-center justify-center transition-colors mb-6">
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-display font-bold mb-3 text-gray-900 dark:text-white group-hover:text-white transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 group-hover:text-white/80 transition-colors leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <svg className="w-12 h-12 text-cranberry-200 dark:text-cranberry-800 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            {testimonials.map((t) => (
              <div key={t.name}>
                <blockquote className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed font-medium italic">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-6">
                  <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent News */}
      {recentArticles.length > 0 && (
        <section className="section-padding bg-white dark:bg-gray-950">
          <div className="container-page">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-sm font-semibold text-azure uppercase tracking-wider mb-2">Latest Updates</p>
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white">News & Stories</h2>
              </div>
              <Link href="/news" className="hidden sm:inline-flex btn-sm btn-outline">
                All News →
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-200"
                >
                  <div className="h-40 bg-gradient-to-br from-cranberry-100 to-cranberry-50 dark:from-cranberry-900/20 dark:to-cranberry-950/30 flex items-center justify-center">
                    <svg className="w-10 h-10 text-cranberry-300 dark:text-cranberry-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="azure">{article.category}</Badge>
                      {article.publishedAt && <span className="text-xs text-gray-400">{formatDate(article.publishedAt)}</span>}
                    </div>
                    <h3 className="font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors line-clamp-2">{article.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{article.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/news" className="sm:hidden block text-center mt-6 btn-sm btn-outline">
              All News →
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-padding bg-gradient-to-br from-cranberry-900 via-cranberry to-cranberry-800 text-white">
        <div className="container-page text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Ready to join our community?
          </h2>
          <p className="text-cranberry-200 text-lg max-w-xl mx-auto mb-8">
            Whether you&apos;re looking to give back, grow professionally, or make lifelong friends — we&apos;d love to meet you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/membership" className="btn-lg btn-gold">
              Become a Member
            </Link>
            <Link href="/contact" className="btn-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-xl transition-all font-semibold">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
