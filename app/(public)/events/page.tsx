import type { Metadata } from 'next';
import HeroSection from '@/components/public/HeroSection';
import EventsFilter from '@/components/public/EventsFilter';
import { generateMeta } from '@/lib/seo';
import { getPublicEvents } from '@/lib/firebase/queries';

export const revalidate = 300;

export const metadata: Metadata = generateMeta({
  title: 'Events',
  description: 'Browse upcoming Rotaract NYC events — service projects, meetings, networking mixers, and social gatherings.',
  path: '/events',
});

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ host?: string }>;
}) {
  const [events, { host }] = await Promise.all([getPublicEvents(), searchParams]);
  // ?host= makes a filtered view shareable and is the target of the weekly
  // digest's "See all N community & partner events" link. Resolved here rather
  // than in the client component so the cards stay in the server HTML.
  const initialHost =
    host === 'rotaract' || host === 'rotary' || host === 'community' ? host : 'all';

  return (
    <>
      <HeroSection title="Events" subtitle="Join us for service projects, professional development, networking, and fellowship." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <EventsFilter events={events} initialHost={initialHost} />
        </div>
      </section>
    </>
  );
}
