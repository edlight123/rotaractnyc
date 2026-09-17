import { generateMeta } from '@/lib/seo';
import HeroSection from '@/components/public/HeroSection';
import ContactForm from '@/components/public/ContactForm';
import { SITE } from '@/lib/constants';
import { adminDb } from '@/lib/firebase/admin';
import { communityLinkOrDefault } from '@/lib/utils/communityLink';

export const metadata = generateMeta({
  title: 'Contact Us',
  description: `Get in touch with ${SITE.shortName}. Send us a message, find our address, or connect on social media.`,
  path: '/contact',
});

/**
 * The community invite is admin-editable, so it is read here rather than
 * hardcoded. The page stays statically prerendered — the settings PUT calls
 * revalidatePath('/contact'), so a new link appears on save without a
 * deploy, which is the point of making it editable at all.
 */
async function communityLink(): Promise<string> {
  try {
    const doc = await adminDb.collection('settings').doc('site').get();
    return communityLinkOrDefault(doc.data()?.whatsappCommunityUrl as string | undefined);
  } catch {
    // Settings unreachable is not a reason to break the contact page.
    return SITE.whatsappCommunity;
  }
}

export default async function ContactPage() {
  const whatsappUrl = await communityLink();

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
                    <svg aria-hidden="true" className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <svg aria-hidden="true" className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <svg aria-hidden="true" className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <svg aria-hidden="true" className="w-5 h-5 text-cranberry" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.04 2a9.94 9.94 0 00-8.5 15.13L2 22l4.98-1.5A9.94 9.94 0 1012.04 2zm0 1.84a8.1 8.1 0 11-4.2 15.03l-.3-.18-2.95.89.9-2.88-.2-.3A8.1 8.1 0 0112.04 3.84zm-2.3 3.9c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.7 2.72 4.2 3.7 2.08.82 2.5.66 2.95.62.45-.04 1.45-.59 1.66-1.17.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.45-.72-1.67-.8-.22-.08-.39-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.45-1.35-1.69-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.33-.74-1.82-.2-.47-.4-.41-.55-.42h-.47z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">WhatsApp community</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Our open community chat — anyone is welcome, member or not.
                    </p>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-cranberry hover:text-cranberry-800 transition-colors"
                    >
                      Join the community
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cranberry-50 dark:bg-cranberry-900/20 flex items-center justify-center shrink-0">
                    <svg aria-hidden="true" className="w-5 h-5 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
