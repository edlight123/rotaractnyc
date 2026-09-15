import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeroSection from '@/components/public/HeroSection';
import EventsFilter from '@/components/public/EventsFilter';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { generateMeta } from '@/lib/seo';
import { getPublicEvents } from '@/lib/firebase/queries';

export const revalidate = 300;

export const metadata: Metadata = generateMeta({
  title: 'Events',
  description: 'Browse upcoming Rotaract NYC events — service projects, meetings, networking mixers, and social gatherings.',
  path: '/events',
});

export default async function EventsPage() {
  const events = await getPublicEvents();

  return (
    <>
      <HeroSection title="Events" subtitle="Join us for service projects, professional development, networking, and fellowship." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          {/* EventsFilter reads ?host= via useSearchParams, which de-opts a
              statically rendered page unless it sits behind a boundary. */}
          <Suspense fallback={<CardGridSkeleton />}>
            <EventsFilter events={events} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
