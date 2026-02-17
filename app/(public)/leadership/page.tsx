import type { Metadata } from 'next';
import Image from 'next/image';
import HeroSection from '@/components/public/HeroSection';
import { generateMeta } from '@/lib/seo';
import { getBoardMembers } from '@/lib/firebase/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = generateMeta({
  title: 'Leadership',
  description: 'Meet the board of directors leading Rotaract NYC through another year of service and fellowship.',
  path: '/leadership',
});

export default async function LeadershipPage() {
  const board = await getBoardMembers();

  return (
    <>
      <HeroSection title="Our Leadership" subtitle="Meet the dedicated board members guiding Rotaract NYC." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {board.map((member) => (
              <div
                key={member.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 text-center hover:shadow-lg hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-200"
              >
                {member.photoURL ? (
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4">
                    <Image
                      src={member.photoURL}
                      alt={member.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cranberry-100 to-cranberry-200 dark:from-cranberry-900/30 dark:to-cranberry-800/30 flex items-center justify-center mb-4">
                    <span className="text-2xl font-display font-bold text-cranberry">
                      {(member.name || '').split(' ').map((w) => w?.[0] || '').join('')}
                    </span>
                  </div>
                )}
                <h3 className="font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors">
                  {member.name}
                </h3>
                <p className="text-sm text-cranberry font-medium mt-1">{member.title}</p>
                {member.linkedIn && member.linkedIn !== '#' && (
                  <a
                    href={member.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-gray-400 hover:text-azure transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
