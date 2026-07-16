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
  const initials = (member.name || '').split(' ').map((w) => w?.[0] || '').join('').slice(0, 2).toUpperCase();
  return (
    <div className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-xl hover:shadow-cranberry-100/40 dark:hover:shadow-cranberry-900/20 transition-shadow duration-300">
      {/* Portrait — full-bleed, or a quiet initials placeholder */}
      {member.photoURL ? (
        <Image
          src={member.photoURL}
          alt={member.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cranberry-100 to-cranberry-200 dark:from-cranberry-900/40 dark:to-cranberry-800/30">
          <span className="text-4xl font-display font-bold text-cranberry">{initials}</span>
        </div>
      )}

      {/* Bottom scrim — identity, always legible */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pt-16 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">{member.title}</p>
        <h3 className="font-display font-bold text-white leading-tight mt-0.5">{member.name}</h3>
      </div>

      {/* LinkedIn — glass chip */}
      {member.linkedIn && member.linkedIn !== '#' && (
        <a
          href={member.linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on LinkedIn`}
          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-lg bg-black/35 text-white/90 hover:bg-azure backdrop-blur-sm flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
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

  return (
    <>
      <HeroSection title="Our Leadership" subtitle="Meet the dedicated board members guiding Rotaract NYC." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page max-w-5xl">

          {/* Current board — photo-first cards in a uniform grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {board.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

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
