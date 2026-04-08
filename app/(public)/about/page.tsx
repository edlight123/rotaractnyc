import type { Metadata } from 'next';
import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import { SITE } from '@/lib/constants';
import { generateMeta } from '@/lib/seo';
import { getImpactStats } from '@/lib/firebase/queries';

export const metadata: Metadata = generateMeta({
  title: 'About',
  description: 'Learn about the Rotaract Club of New York at the United Nations — our mission, vision, and impact.',
  path: '/about',
});

const focusAreas = [
  { title: 'Peace & Conflict Resolution', icon: '🕊️' },
  { title: 'Disease Prevention', icon: '🏥' },
  { title: 'Water & Sanitation', icon: '💧' },
  { title: 'Maternal & Child Health', icon: '👶' },
  { title: 'Basic Education & Literacy', icon: '📚' },
  { title: 'Economic Development', icon: '📈' },
  { title: 'Environmental Sustainability', icon: '🌍' },
];

export default async function AboutPage() {
  const impactStats = await getImpactStats();

  return (
    <>
      <HeroSection
        title="Our Mission"
        subtitle="We develop young leaders through service, professional development, and global fellowship — guided by Rotary's principle of Service Above Self."
      />

      {/* Mission Statement */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">Who We Are</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white mb-6">
              The Rotaract Club of New York at the United Nations
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Founded as part of Rotary International, we are a vibrant community of young professionals and students aged {SITE.ageRange} based in the heart of New York City. Sponsored by {SITE.sponsor}, we bring together diverse individuals united by a shared passion for making a difference.
            </p>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              We meet {SITE.meetingSchedule.toLowerCase()} at our home base near the United Nations headquarters, fostering connections between young leaders from all walks of life and all corners of the globe.
            </p>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-12 bg-cranberry text-white">
        <div className="container-page">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {impactStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-display font-bold text-gold">{stat.value}</p>
                <p className="mt-1 text-cranberry-200 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Focus Areas */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">Areas of Focus</p>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
              Aligned with Rotary International
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Our projects and initiatives align with Rotary&apos;s seven areas of focus, addressing some of the world&apos;s most pressing challenges.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {focusAreas.map((area) => (
              <div key={area.title} className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{area.icon}</div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{area.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page text-center">
          <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-4">
            Want to learn more?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            Attend one of our meetings, meet our members, and see if Rotaract NYC is the right fit for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/membership" className="btn-md btn-primary">
              Membership Info
            </Link>
            <Link href="/contact" className="btn-md btn-secondary">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
