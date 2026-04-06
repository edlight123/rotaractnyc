import { generateMeta } from '@/lib/seo';
import HeroSection from '@/components/public/HeroSection';
import ContactForm from '@/components/public/ContactForm';
import { SITE } from '@/lib/constants';

export const metadata = generateMeta({
  title: 'Contact Us',
  description: `Get in touch with ${SITE.shortName}. Send us a message, find our address, or connect on social media.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <HeroSection title="Contact Us" subtitle="We'd love to hear from you. Reach out with questions, ideas, or just to say hello." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-16 max-w-5xl mx-auto">
            {/* Form */}
            <ContactForm />

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Address</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{SITE.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Email</p>
                    <a href={`mailto:${SITE.email}`} className="text-sm text-cranberry hover:text-cranberry-800 transition-colors">
                      {SITE.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Meetings</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{SITE.meetingSchedule}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Social Media</p>
                    <div className="flex gap-3 mt-2">
                      <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-cranberry transition-colors">Instagram</a>
                      <a href={SITE.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-cranberry transition-colors">LinkedIn</a>
                      <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-cranberry transition-colors">Facebook</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
