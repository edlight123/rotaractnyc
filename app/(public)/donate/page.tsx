import { Suspense } from 'react';
import { generateMeta } from '@/lib/seo';
import HeroSection from '@/components/public/HeroSection';
import DonateForm from '@/components/public/DonateForm';

export const metadata = generateMeta({
  title: 'Donate',
  description:
    'Support Rotaract NYC\'s community service projects. Your donation funds food drives, park cleanups, educational programs, and international service initiatives.',
  path: '/donate',
});

export default function DonatePage() {
  return (
    <>
      <HeroSection
        title="Support Our Mission"
        subtitle="Your contribution helps us create lasting change in communities locally and around the world."
        size="sm"
      />

      <section className="section-padding bg-white dark:bg-gray-950">
        <Suspense fallback={<div className="container-page max-w-3xl text-center py-12"><p className="text-gray-500">Loading…</p></div>}>
          <DonateForm />
        </Suspense>
      </section>
    </>
  );
}
