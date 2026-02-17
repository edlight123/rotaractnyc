import type { Metadata } from 'next';
import HeroSection from '@/components/public/HeroSection';
import Accordion from '@/components/ui/Accordion';
import { generateMeta } from '@/lib/seo';
import { defaultFAQ } from '@/lib/defaults/data';

export const metadata: Metadata = generateMeta({
  title: 'FAQ',
  description: 'Frequently asked questions about Rotaract NYC — membership, meetings, events, and more.',
  path: '/faq',
});

export default function FAQPage() {
  const categories = Array.from(new Set(defaultFAQ.map((f) => f.category)));

  // FAQ JSON-LD structured data
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: defaultFAQ.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroSection title="Frequently Asked Questions" subtitle="Everything you need to know about Rotaract NYC." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page max-w-3xl">
          {categories.map((category) => (
            <div key={category} className="mb-10">
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">{category}</h2>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-6">
                <Accordion
                  items={defaultFAQ
                    .filter((f) => f.category === category)
                    .map((f) => ({ id: f.id, title: f.question, content: f.answer }))}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
