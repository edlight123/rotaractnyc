'use client'

import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BOARD_MEMBERS } from '@/lib/content/members'
import Image from 'next/image'

type MemberRow = {
  id: string
  title: string
  name: string
  role: string
  photoUrl?: string
  order: number
  linkedinUrl?: string
}

export default function BoardPage() {
  const [boardMembers, setBoardMembers] = useState<MemberRow[]>(
    DEFAULT_BOARD_MEMBERS.map((m) => ({
      id: m.id,
      title: m.title,
      name: m.name,
      role: m.role,
      photoUrl: m.photoUrl,
      order: m.order,
      linkedinUrl: undefined,
    }))
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/members?group=board')
        if (!res.ok) return

        const json: unknown = await res.json()
        const rows =
          typeof json === 'object' &&
          json &&
          Array.isArray((json as { members?: unknown }).members)
            ? ((json as { members: unknown[] }).members as unknown[])
            : []

        const mapped = rows
          .map((m): MemberRow => {
            const obj = typeof m === 'object' && m ? (m as Record<string, unknown>) : {}
            const order = Number(obj.order)
            return {
              id: String(obj.id ?? ''),
              title: String(obj.title ?? ''),
              name: String(obj.name ?? ''),
              role: String(obj.role ?? ''),
              photoUrl: String(obj.photoUrl ?? '') || undefined,
              linkedinUrl: String(obj.linkedinUrl ?? '') || undefined,
              order: Number.isFinite(order) ? order : 1,
            }
          })
          .filter((m) => m.id && m.title && m.name)

        if (!cancelled && mapped.length > 0) {
          setBoardMembers(mapped)
        }
      } catch {
        // ignore and keep defaults
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(() => [...boardMembers].sort((a, b) => a.order - b.order), [boardMembers])

  return (
    <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
      {/* Page Header */}
      <section className="max-w-3xl mx-auto text-center mb-16 lg:mb-24 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#101918] dark:text-white leading-[1.1]">
          Our Leadership
        </h1>
        <p className="text-lg text-[#57606a] dark:text-[#a0aeb2] font-normal leading-relaxed max-w-2xl mx-auto">
          Meet the dedicated Board of Directors guiding the strategic vision and community impact of the Rotaract Club of NYC for the 2024–2025 term.
        </p>
      </section>

      {/* Director Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10 mb-24">
        {sorted.map((member) => (
          <article
            key={member.id}
            className="group relative flex flex-col bg-white dark:bg-[#1c2b29] border border-[#E0E2E5] dark:border-[#2a3836] rounded shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:border-[#196659]/50 dark:hover:border-[#196659]/50 transition-all duration-300 overflow-hidden h-full"
          >
            <div className="aspect-[4/5] w-full overflow-hidden relative bg-[#E0E2E5] dark:bg-[#2a3836]">
              {member.photoUrl ? (
                <Image
                  src={member.photoUrl}
                  alt={`Portrait of ${member.name}`}
                  width={400}
                  height={500}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#57606a] dark:text-[#a0aeb2]">
                  <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="p-6 md:p-8 flex flex-col flex-grow">
              <div className="mb-4">
                <span className="block text-[#196659] text-xs font-bold uppercase tracking-widest mb-1">
                  {member.title}
                </span>
                <h2 className="text-2xl font-bold text-[#101918] dark:text-white leading-tight">
                  {member.name}
                </h2>
              </div>
              
              <p className="text-[#57606a] dark:text-[#a0aeb2] text-sm leading-relaxed mb-8 flex-grow line-clamp-3">
                {member.role}
              </p>
              
              <div className="pt-6 border-t border-[#f0f2f4] dark:border-[#2a3836] flex items-center justify-between mt-auto">
                <a
                  href={`/leadership/${member.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#101918] dark:text-white hover:text-[#196659] transition-colors"
                >
                  Read Full Bio
                  <svg className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                
                {member.linkedinUrl && (
                  <a
                    href={member.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn Profile"
                    className="text-[#57606a] dark:text-[#a0aeb2] hover:text-[#0077b5] transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Committee Structure Section */}
      <section className="mb-24">
        <div className="text-center mb-12">
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            Our Structure
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#101918] dark:text-white mb-4">
            Committees & Teams
          </h2>
          <p className="text-lg text-[#57606a] dark:text-[#a0aeb2] max-w-2xl mx-auto">
            Our club operates through dedicated committees, each focusing on specific areas of impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Committee 1 */}
          <div className="bg-white dark:bg-[#1c2b29] p-6 rounded-lg border border-[#E0E2E5] dark:border-[#2a3836] hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Committee</p>
                <h3 className="text-lg font-bold text-[#101918] dark:text-white">Community Service</h3>
              </div>
            </div>
            <p className="text-sm text-[#57606a] dark:text-[#a0aeb2] mb-4">
              Plans and executes hands-on service projects that directly impact NYC communities.
            </p>
            <div className="pt-4 border-t border-[#E0E2E5] dark:border-[#2a3836]">
              <p className="text-xs font-semibold text-[#57606a] dark:text-[#a0aeb2] mb-2">Committee Chair</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E0E2E5] dark:bg-[#2a3836]"></div>
                <span className="text-sm font-medium text-[#101918] dark:text-white">Sarah Jenkins</span>
              </div>
            </div>
          </div>

          {/* Committee 2 */}
          <div className="bg-white dark:bg-[#1c2b29] p-6 rounded-lg border border-[#E0E2E5] dark:border-[#2a3836] hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2 0V17a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Committee</p>
                <h3 className="text-lg font-bold text-[#101918] dark:text-white">Professional Dev.</h3>
              </div>
            </div>
            <p className="text-sm text-[#57606a] dark:text-[#a0aeb2] mb-4">
              Organizes workshops, networking events, and mentorship programs for career growth.
            </p>
            <div className="pt-4 border-t border-[#E0E2E5] dark:border-[#2a3836]">
              <p className="text-xs font-semibold text-[#57606a] dark:text-[#a0aeb2] mb-2">Committee Chair</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E0E2E5] dark:bg-[#2a3836]"></div>
                <span className="text-sm font-medium text-[#101918] dark:text-white">Marcus Reid</span>
              </div>
            </div>
          </div>

          {/* Committee 3 */}
          <div className="bg-white dark:bg-[#1c2b29] p-6 rounded-lg border border-[#E0E2E5] dark:border-[#2a3836] hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Committee</p>
                <h3 className="text-lg font-bold text-[#101918] dark:text-white">International</h3>
              </div>
            </div>
            <p className="text-sm text-[#57606a] dark:text-[#a0aeb2] mb-4">
              Coordinates global partnerships and international service initiatives.
            </p>
            <div className="pt-4 border-t border-[#E0E2E5] dark:border-[#2a3836]">
              <p className="text-xs font-semibold text-[#57606a] dark:text-[#a0aeb2] mb-2">Committee Chair</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E0E2E5] dark:bg-[#2a3836]"></div>
                <span className="text-sm font-medium text-[#101918] dark:text-white">Priya Patel</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Elections/How to Run Section */}
      <section className="bg-gray-50 dark:bg-[#1c2b29] rounded-2xl p-8 md:p-12 border border-[#E0E2E5] dark:border-[#2a3836]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Elections 2024
            </span>
            <h2 className="text-3xl font-bold text-[#101918] dark:text-white mb-4">
              Interested in Leadership?
            </h2>
            <p className="text-[#57606a] dark:text-[#a0aeb2] text-lg mb-8">
              Running for a position on the Executive Board or becoming a Committee Chair is a great way to develop professional skills and give back to the community.
            </p>
            <div className="flex gap-4">
              <button className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2">
                Apply Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button className="bg-white dark:bg-transparent border border-[#E0E2E5] dark:border-[#2a3836] text-[#101918] dark:text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a3836] transition-colors">
                Learn More
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Step Cards */}
            <div className="bg-white dark:bg-[#0c1415] p-6 rounded-xl shadow-sm border border-[#E0E2E5] dark:border-[#2a3836] flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#101918] dark:text-white mb-1">Check Eligibility</h3>
                <p className="text-sm text-[#57606a] dark:text-[#a0aeb2]">
                  Must be an active member for at least 6 months and in good standing with attendance.
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#0c1415] p-6 rounded-xl shadow-sm border border-[#E0E2E5] dark:border-[#2a3836] flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#101918] dark:text-white mb-1">Submit Nomination</h3>
                <p className="text-sm text-[#57606a] dark:text-[#a0aeb2]">
                  Complete the nomination form by October 15th, including a brief platform statement.
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#0c1415] p-6 rounded-xl shadow-sm border border-[#E0E2E5] dark:border-[#2a3836] flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#101918] dark:text-white mb-1">Club Election</h3>
                <p className="text-sm text-[#57606a] dark:text-[#a0aeb2]">
                  Present your platform at the November general meeting followed by a club vote.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
