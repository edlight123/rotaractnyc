import type { Metadata } from 'next';
import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import { generateMeta } from '@/lib/seo';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = generateMeta({
  title: 'Partners & Sponsors',
  description:
    `Partner with ${SITE.name} — sponsorship and collaboration opportunities for organizations looking to support young leaders and community service in New York City.`,
  path: '/partners',
});

const partnershipTiers = [
  {
    name: 'Community Partner',
    price: 'In-Kind',
    description: 'Collaborate on a service project, co-host an event, or provide in-kind support.',
    features: [
      'Logo on event materials',
      'Social media shout-out',
      'Invitation to co-branded events',
      'Certificate of partnership',
    ],
    color: 'border-emerald-200 dark:border-emerald-900',
    highlight: false,
  },
  {
    name: 'Gold Sponsor',
    price: '$1,000+',
    description: 'Support our annual programming and get premium visibility across all channels.',
    features: [
      'Logo on website & newsletters',
      'Speaking opportunity at events',
      'Featured social media posts',
      'VIP invitations to all events',
      'Dedicated blog spotlight',
      'Priority event co-hosting',
    ],
    color: 'border-gold-400 dark:border-gold-600',
    highlight: true,
  },
  {
    name: 'Event Sponsor',
    price: '$250+',
    description: 'Sponsor a specific service project, professional development workshop, or social event.',
    features: [
      'Logo at sponsored event',
      'Social media recognition',
      'Opportunity to address attendees',
      'Post-event impact report',
    ],
    color: 'border-cranberry-200 dark:border-cranberry-900',
    highlight: false,
  },
];

const communityPartners = [
  {
    name: 'Brooklyn Adult & Teen Challenge',
    focus: 'Our monthly Food Pantry & Neighborhood Supper',
    description:
      'A non-profit serving New York since 1958, running a community soup kitchen and food pantry in Fort Greene. Home of our monthly food pantry service.',
  },
  {
    name: 'Alliance for Positive Change',
    focus: 'Harm-reduction kit builds · Gala beneficiary',
    description:
      'Supports New Yorkers living with HIV and other chronic health conditions. We assemble care kits with them, and they are the beneficiary of our annual gala.',
  },
  {
    name: 'NYC Parks',
    focus: '“It’s My Park” cleanups',
    description:
      'We join park rejuvenation and cleanup days to care for the public green spaces that make our city livable.',
  },
  {
    name: 'Sure We Can',
    focus: 'Recycling & sustainability',
    description:
      'A Brooklyn recycling and redemption non-profit supporting canners and a greener city, where our members volunteer.',
  },
  {
    name: 'Alzheimer’s Association',
    focus: 'Walk to End Alzheimer’s',
    description:
      'We walk and fundraise for the third-largest funder of Alzheimer’s research in the world.',
  },
  {
    name: 'Rotary District 7230',
    focus: 'Our home district',
    description:
      'We serve alongside Rotary and Rotaract clubs across New York through district-wide days of service and initiatives.',
  },
];

const reasons = [
  {
    title: 'Reach Young Professionals',
    description: 'Connect with a vibrant community of young professionals, changemakers, and leaders building careers in NYC.',
    icon: '🎯',
  },
  {
    title: 'Amplify Social Impact',
    description:
      'Associate your brand with meaningful community service, UN partnerships, and global fellowship.',
    icon: '🌍',
  },
  {
    title: 'Brand Visibility',
    description:
      'Get your name in front of an engaged, diverse audience through events, digital channels, and print materials.',
    icon: '📣',
  },
  {
    title: 'Networking Access',
    description:
      'Attend our events, meet our members, and tap into the broader Rotary International network.',
    icon: '🤝',
  },
];

export default function PartnersPage() {
  return (
    <>
      <HeroSection
        title="Partners & Sponsors"
        subtitle={`Join forces with ${SITE.name} to make a bigger impact. We partner with organizations that share our commitment to service, leadership, and community.`}
      />

      {/* Why Partner */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
              Why Partner With Us
            </p>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
              Support the next generation of leaders
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              As part of Rotary International, our club connects young professionals with
              service opportunities, professional development, and a global network —
              all in the heart of New York City.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reasons.map((r) => (
              <div
                key={r.title}
                className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-800"
              >
                <div className="text-3xl mb-3">{r.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{r.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsorship Tiers */}
      <section className="section-padding bg-gray-50 dark:bg-gray-900/50">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
              Sponsorship Levels
            </p>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
              Choose your level of engagement
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Whether you want to co-host a single event or become a year-round partner,
              there&apos;s a tier that fits your goals.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {partnershipTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative bg-white dark:bg-gray-900 rounded-2xl border-2 ${tier.color} p-8 flex flex-col ${
                  tier.highlight ? 'shadow-lg ring-2 ring-gold/20' : ''
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                  {tier.name}
                </h3>
                <p className="text-2xl font-bold text-cranberry mt-2">{tier.price}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 mb-6">
                  {tier.description}
                </p>
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg aria-hidden="true"
                        className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Partners */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
              Organizations We Serve With
            </p>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
              Our community partners
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Service happens shoulder to shoulder. These are the organizations we volunteer,
              fundraise, and build community with across New York City.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {communityPartners.map((p) => (
              <div
                key={p.name}
                className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col"
              >
                <h3 className="font-display font-bold text-gray-900 dark:text-white">{p.name}</h3>
                <p className="text-xs font-semibold text-cranberry uppercase tracking-wide mt-1 mb-3">
                  {p.focus}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{p.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center max-w-2xl mx-auto mt-14 pt-10 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gold uppercase tracking-wider mb-3">
              Our Network
            </p>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
              Proud to be part of Rotary International
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Sponsored by {SITE.sponsor}, we are connected to a worldwide network of
              1.4 million Rotarians across 46,000+ clubs in 200+ countries.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-cranberry text-white">
        <div className="container-page text-center">
          <h2 className="text-3xl font-display font-bold mb-4">
            Ready to partner with us?
          </h2>
          <p className="text-cranberry-200 mb-8 max-w-lg mx-auto">
            Reach out to discuss sponsorship opportunities, event collaborations, or
            how your organization can support our mission.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="btn-md bg-white text-cranberry hover:bg-gray-100 font-semibold rounded-xl transition-colors"
            >
              Get in Touch
            </Link>
            <a
              href={`mailto:${SITE.email}?subject=Partnership%20Inquiry`}
              className="btn-md border border-white/30 text-white hover:bg-white/10 font-semibold rounded-xl transition-colors"
            >
              Email Us Directly
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
