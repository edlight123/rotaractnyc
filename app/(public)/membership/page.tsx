import type { Metadata } from 'next';
import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import MembershipInterestForm from '@/components/public/MembershipInterestForm';
import { generateMeta } from '@/lib/seo';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = generateMeta({
  title: 'Membership',
  description: 'Learn how to join Rotaract NYC — requirements, benefits, dues, and the path to becoming a member.',
  path: '/membership',
});

const phases = [
  {
    step: 1,
    title: 'Attend as a Guest',
    description: 'Come to one of our general meetings or events. No invitation needed — just show up and introduce yourself! Meet current members and learn about what we do.',
    icon: '👋',
  },
  {
    step: 2,
    title: 'Prospective Member',
    description: 'After attending a few meetings, express your interest in joining. You\'ll have a brief orientation period to learn about Rotaract, our club culture, and expectations.',
    icon: '📋',
  },
  {
    step: 3,
    title: 'Full Member',
    description: 'Complete your membership application, pay annual dues, and you\'re in! Get full access to the member portal, service projects, events, and the global Rotaract network.',
    icon: '🎉',
  },
];

const benefits = [
  { title: 'Service Projects', description: 'Participate in meaningful community service locally and internationally.' },
  { title: 'Professional Development', description: 'Workshops, networking events, and mentorship from Rotary members.' },
  { title: 'Global Network', description: 'Connect with 250,000+ Rotaractors in 180+ countries worldwide.' },
  { title: 'Leadership Opportunities', description: 'Take on committee and board roles to develop real leadership skills.' },
  { title: 'Social Events', description: 'Parties, trips, dinners, and fellowship activities with a fun, diverse community.' },
  { title: 'UN Engagement', description: 'Unique access to UN-related events and discussions through our charter.' },
];

export default function MembershipPage() {
  return (
    <>
      <HeroSection
        title="Join Rotaract NYC"
        subtitle="Become part of a global community of young leaders dedicated to Service Above Self."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/contact" className="btn-lg btn-gold">
            Get Started
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link href="/events" className="btn-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-xl transition-all font-semibold">
            Browse Events
          </Link>
        </div>
      </HeroSection>

      {/* Membership Path */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">How to Join</p>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Three Simple Steps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {phases.map((phase) => (
              <div key={phase.step} className="relative text-center">
                <div className="text-4xl mb-4">{phase.icon}</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cranberry text-white text-sm font-bold mb-3">
                  {phase.step}
                </div>
                <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-2">{phase.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">Why Join?</p>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Member Benefits</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dues */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page text-center">
          <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">Annual Dues</p>
          <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-10">Simple, Transparent Pricing</h2>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-cranberry p-8">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Professional</p>
              <p className="text-4xl font-display font-bold text-cranberry">$85</p>
              <p className="text-sm text-gray-500 mt-1">per Rotary year</p>
              <p className="text-xs text-gray-400 mt-4">Includes Rotary International registration</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Student</p>
              <p className="text-4xl font-display font-bold text-gray-900 dark:text-white">$65</p>
              <p className="text-sm text-gray-500 mt-1">per Rotary year</p>
              <p className="text-xs text-gray-400 mt-4">Valid student ID required</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            The Rotary year runs July 1 – June 30. Dues can be paid online or in person.
          </p>
        </div>
      </section>

      {/* Interest Form */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50">
        <div className="container-page">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">Interested?</p>
              <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-3">
                Let Us Know You&apos;re Coming
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Fill out this quick form and a board member will reach out with details on our next meeting.
              </p>
            </div>
            <MembershipInterestForm />
          </div>
        </div>
      </section>
    </>
  );
}
