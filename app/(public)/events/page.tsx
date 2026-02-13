import type { Metadata } from 'next';
import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import Badge from '@/components/ui/Badge';
import { generateMeta } from '@/lib/seo';
import { getPublicEvents } from '@/lib/firebase/queries';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generateMeta({
  title: 'Events',
  description: 'Browse upcoming Rotaract NYC events — service projects, meetings, networking mixers, and social gatherings.',
  path: '/events',
});

const typeColors: Record<string, 'cranberry' | 'green' | 'azure' | 'gold'> = {
  free: 'green',
  service: 'azure',
  paid: 'gold',
  hybrid: 'cranberry',
};

export default async function EventsPage() {
  const events = await getPublicEvents();

  return (
    <>
      <HeroSection title="Events" subtitle="Join us for service projects, professional development, networking, and fellowship." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          {/* Events Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-200"
              >
                {/* Date strip */}
                <div className="bg-gradient-to-r from-cranberry to-cranberry-800 px-6 py-3 flex items-center justify-between">
                  <div className="text-white">
                    <p className="text-xs font-medium text-cranberry-200">{formatDate(event.date, { weekday: 'long' })}</p>
                    <p className="text-sm font-bold">{formatDate(event.date, { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <Badge variant={typeColors[event.type] || 'gray'}>
                    {event.type === 'service' ? '🤝 Service' : event.type === 'paid' ? '🎟️ Ticketed' : event.type === 'hybrid' ? '⭐ Hybrid' : '✓ Free'}
                  </Badge>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {event.location.split(',')[0]}
                    </span>
                  </div>

                  {event.pricing && (event.type === 'paid' || event.type === 'hybrid') && (
                    <div className="mt-3 flex items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 bg-cranberry-50 dark:bg-cranberry-900/20 text-cranberry-700 dark:text-cranberry-300 px-2.5 py-1 rounded-lg font-semibold">
                        {event.pricing.memberPrice === 0 ? 'Free for members' : formatCurrency(event.pricing.memberPrice)}
                        <span className="font-normal text-cranberry-500 dark:text-cranberry-400 text-xs">member</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg font-semibold">
                        {formatCurrency(event.pricing.guestPrice)}
                        <span className="font-normal text-gray-500 text-xs">guest</span>
                      </span>
                      {event.pricing.earlyBirdPrice != null && event.pricing.earlyBirdDeadline && new Date(event.pricing.earlyBirdDeadline) > new Date() && (
                        <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                          🐦 Early bird {formatCurrency(event.pricing.earlyBirdPrice)}
                        </span>
                      )}
                    </div>
                  )}

                  {event.tags && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {event.tags.map((tag) => (
                        <span key={tag} className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">No upcoming events. Check back soon!</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
