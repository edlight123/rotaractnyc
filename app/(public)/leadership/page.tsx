import type { Metadata } from 'next';
import Image from 'next/image';
import HeroSection from '@/components/public/HeroSection';
import { generateMeta } from '@/lib/seo';
import { getBoardMembers, getPastBoards } from '@/lib/firebase/queries';

export const revalidate = 600; // 10 min — leadership rarely changes

export const metadata: Metadata = generateMeta({
  title: 'Leadership',
  description: 'Meet the board of directors leading Rotaract NYC through another year of service and fellowship.',
  path: '/leadership',
});

function MemberCard({ member }: { member: Awaited<ReturnType<typeof getBoardMembers>>[number] }) {
  return (
    <div className="group bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800 p-8 text-center hover:shadow-xl hover:shadow-cranberry-100/30 dark:hover:shadow-cranberry-900/20 hover:border-cranberry-200/80 dark:hover:border-cranberry-800/60 transition-all duration-300 flex flex-col items-center">
      {/* Avatar */}
      {member.photoURL ? (
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-5 ring-4 ring-gray-100 dark:ring-gray-800 group-hover:ring-cranberry-200 dark:group-hover:ring-cranberry-800 transition-all duration-300 shadow-md">
          <Image
            src={member.photoURL}
            alt={member.name}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cranberry-100 to-cranberry-200 dark:from-cranberry-900/40 dark:to-cranberry-800/30 flex items-center justify-center mb-5 ring-4 ring-gray-100 dark:ring-gray-800 shadow-md">
          <span className="text-2xl font-display font-bold text-cranberry">
            {(member.name || '').split(' ').map((w) => w?.[0] || '').join('')}
          </span>
        </div>
      )}

      {/* Name & title */}
      <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white group-hover:text-cranberry transition-colors leading-tight">
        {member.name}
      </h3>
      <p className="text-sm font-semibold text-cranberry mt-1.5 tracking-wide uppercase">{member.title}</p>

      {/* Divider */}
      <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mx-auto my-4 group-hover:bg-cranberry-300 dark:group-hover:bg-cranberry-700 transition-colors duration-300" />

      {/* Bio */}
      {member.bio && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed flex-1">{member.bio}</p>
      )}

      {/* LinkedIn */}
      {member.linkedIn && member.linkedIn !== '#' && (
        <a
          href={member.linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-azure dark:hover:text-azure transition-colors"
        >
          <svg aria-hidden="true" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          Connect on LinkedIn
        </a>
      )}
    </div>
  );
}

function PastBoardCard({ board }: { board: Awaited<ReturnType<typeof getPastBoards>>[number] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="text-cranberry">{board.year}</span>
        <span className="text-xs font-normal text-gray-400">Rotary year</span>
      </h3>
      <ul className="space-y-2">
        {board.members.map((m, i) => (
          <li key={`${m.name}-${i}`} className="flex items-center gap-3 text-sm">
            {m.photoURL ? (
              <Image
                src={m.photoURL}
                alt={m.name}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 shrink-0"
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-cranberry-100 dark:bg-cranberry-900/40 flex items-center justify-center text-[10px] font-bold text-cranberry shrink-0">
                {(m.name || '').split(' ').map((w) => w?.[0] || '').join('').slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="font-medium text-gray-900 dark:text-white">{m.name}</span>
            <span className="text-gray-400 dark:text-gray-500 ml-auto text-xs text-right">{m.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function LeadershipPage() {
  const [board, pastBoards] = await Promise.all([getBoardMembers(), getPastBoards()]);
  const topRow = board.slice(0, 3);
  const bottomRow = board.slice(3);

  return (
    <>
      <HeroSection title="Our Leadership" subtitle="Meet the dedicated board members guiding Rotaract NYC." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page max-w-5xl">

          {/* Top row — up to 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {topRow.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

          {/* Bottom row — remaining cards, centered */}
          {bottomRow.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-6">
              {bottomRow.map((member) => (
                <div key={member.id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                  <MemberCard member={member} />
                </div>
              ))}
            </div>
          )}

          {/* Past boards — archived rosters from previous Rotary years */}
          {pastBoards.length > 0 && (
            <div className="mt-16">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Past Boards</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Honoring the leaders who guided Rotaract NYC in previous years.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastBoards.map((pb) => (
                  <PastBoardCard key={pb.year} board={pb} />
                ))}
              </div>
            </div>
          )}

        </div>
      </section>
    </>
  );
}
