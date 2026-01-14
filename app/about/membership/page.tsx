'use client'

import { useState } from 'react'

export default function MembershipPage() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(null)

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index)
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-stone-200 font-display transition-colors duration-300 antialiased pb-24">
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden bg-surface-dark group">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark/90 to-background-dark/40 z-10"></div>
          <img
            alt="Community members gathering"
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhQiqUs_yxik4j_Lv7uQr5_U8pRTRGtBksUKIkC-5TAN_IEbvwGkW-fpKhutRRhUn0DnI-nDbNsHWYD3Zra4nJdDEtXgYQ3LgHWh1gLLjErjldmafUdCBB4BceZxr0DoyR6-9cAhEW8W5V-_rdbfB2qdGvD2dR7QbuFd6qcjbYd6WZKTATtUQyEO8DaeA-no851yaMNJIra7W4IGas-q2wu0keM13qHxw7ta2ZX9LcudQlrurzv5wXLGu1B4E9a8eRSwyuOrNu8gU"
          />
        </div>
        <div className="relative z-20 max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-light border border-primary/30 text-xs font-bold uppercase tracking-wider mb-6 text-white backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Membership Guide
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Your Roadmap to <br />
            <span className="text-primary">Impact &amp; Community</span>
          </h1>
          <p className="text-lg sm:text-xl text-stone-300 max-w-2xl font-light leading-relaxed">
            From guest to official member. A clear, step-by-step path to joining New York City&apos;s most vibrant
            young professional service club.
          </p>
        </div>
      </div>

      {/* Three-Phase Membership Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">Membership Roadmap</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-main dark:text-white tracking-tight leading-tight mb-4">
            Your Journey to Impact
          </h2>
          <p className="text-lg text-text-muted dark:text-stone-400 leading-relaxed">
            From your first visit to leading committees, discover the phases of becoming a changemaker.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-20">
          {/* Phase 1: Guest */}
          <div className="relative group h-full">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-background-dark border border-stone-100 dark:border-stone-700 px-3 py-1 rounded-full text-xs font-bold text-stone-400 z-20 shadow-sm group-hover:text-primary group-hover:border-primary/30 transition-colors">
              PHASE 01
            </div>
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-0 h-full flex flex-col shadow-soft group-hover:shadow-soft-hover transition-all duration-300 border border-stone-100 dark:border-stone-700 overflow-hidden">
              <div className="p-8 pb-6 border-b border-stone-50 dark:border-stone-800 bg-gradient-to-b from-stone-50 to-white dark:from-white/5 dark:to-transparent">
                <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-200 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-text-main dark:text-white mb-1">Guest</h3>
                <p className="text-text-muted dark:text-stone-400 font-medium">The starting point</p>
              </div>
              <div className="p-8 pt-6 flex-1 flex flex-col gap-8">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Benefits</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-main dark:text-stone-200">Attend general meetings</span>
                    </li>
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-main dark:text-stone-200">Network with members</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3 mt-auto">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Requirements</h4>
                  <div className="bg-stone-50 dark:bg-black/20 rounded-lg p-3 flex items-center gap-3">
                    <svg className="w-5 h-5 text-stone-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-stone-500 dark:text-stone-400">No requirements - Open to all</span>
                  </div>
                </div>
                <button className="w-full mt-2 py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-text-main dark:text-white font-bold text-sm hover:bg-stone-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                  <span>View Calendar</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Phase 2: Prospective */}
          <div className="relative group h-full">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-background-dark border border-stone-100 dark:border-stone-700 px-3 py-1 rounded-full text-xs font-bold text-stone-400 z-20 shadow-sm group-hover:text-primary group-hover:border-primary/30 transition-colors">
              PHASE 02
            </div>
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-0 h-full flex flex-col shadow-soft group-hover:shadow-soft-hover transition-all duration-300 border border-stone-100 dark:border-stone-700 overflow-hidden">
              <div className="p-8 pb-6 border-b border-stone-50 dark:border-stone-800 bg-gradient-to-b from-blue-50/50 to-white dark:from-primary/5 dark:to-transparent">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-text-main dark:text-white mb-1">Prospective</h3>
                <p className="text-text-muted dark:text-stone-400 font-medium">Committing to the cause</p>
              </div>
              <div className="p-8 pt-6 flex-1 flex flex-col gap-8">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Benefits</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-main dark:text-stone-200">Join committees</span>
                    </li>
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-main dark:text-stone-200">Participate in service projects</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3 mt-auto">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Requirements</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-3 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-black/20 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                      </svg>
                      Fill out interest form
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-black/20 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      Attend 2 meetings
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-black/20 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      Attend 1 service event
                    </li>
                  </ul>
                </div>
                <button className="w-full mt-2 py-3 px-4 rounded-xl bg-stone-100 dark:bg-white/10 text-text-main dark:text-white font-bold text-sm hover:bg-stone-200 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                  <span>Start Application</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Phase 3: Active Member (Featured) */}
          <div className="relative group h-full lg:-mt-6 lg:mb-6">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white border border-primary px-4 py-1 rounded-full text-xs font-bold z-20 shadow-md">
              GOAL REACHED
            </div>
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-0 h-full flex flex-col shadow-xl ring-1 ring-primary/20 dark:ring-primary/40 group-hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
              <div className="absolute top-0 w-full h-1.5 bg-primary"></div>
              <div className="p-8 pb-6 border-b border-stone-100 dark:border-stone-800 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold text-text-main dark:text-white mb-1">Active Member</h3>
                <p className="text-text-muted dark:text-stone-400 font-medium">Full impact & voting rights</p>
              </div>
              <div className="p-8 pt-6 flex-1 flex flex-col gap-8">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Exclusive Benefits</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-main dark:text-white font-medium">Voting rights on club matters</span>
                    </li>
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-main dark:text-white font-medium">Leadership roles eligibility</span>
                    </li>
                    <li className="flex items-start gap-3 text-[15px] leading-relaxed">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-main dark:text-stone-200">Exclusive social events</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3 mt-auto">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Requirements</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-3 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-black/20 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      Pay annual dues
                    </li>
                    <li className="flex items-center gap-3 text-sm font-medium text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-black/20 p-2 rounded-lg">
                      <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Maintain attendance (50%)
                    </li>
                  </ul>
                </div>
                <button className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 flex items-center justify-center gap-2">
                  <span>Pay Dues / View Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Questions about requirements? <a href="/about/faq" className="text-primary font-bold hover:underline">Read the FAQ</a> or <a href="/contact" className="text-primary font-bold hover:underline">Contact Us</a>.
          </p>
        </div>
      </section>

      {/* Detailed Timeline Section */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 border-t border-stone-200 dark:border-stone-700">
        {/* Introduction Header */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-text-main dark:text-white mb-2">Detailed Steps</h2>
          <p className="text-text-muted dark:text-stone-400">
            Complete these four milestones to become an inducted member.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative flex flex-col gap-0 ml-4 sm:ml-0">
          {/* Step 1 */}
          <div className="relative pl-12 pb-12 group">
            {/* Vertical Spine */}
            <div className="absolute left-[11px] top-10 h-full w-[2px] bg-stone-200 dark:bg-stone-700"></div>
            {/* Icon Indicator */}
            <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary ring-4 ring-background-light dark:ring-background-dark z-10">
              <span className="text-white text-[10px] font-bold">1</span>
            </div>
            {/* Card */}
            <div className="relative flex flex-col bg-surface-light dark:bg-surface-dark rounded-xl p-6 sm:p-8 shadow-soft border border-stone-100 dark:border-stone-800 transition-all hover:shadow-soft-hover">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 mb-2">
                    Prerequisite
                  </span>
                  <h3 className="text-xl font-bold text-text-main dark:text-white flex items-center gap-2">
                    Eligibility Check
                  </h3>
                </div>
                <span className="material-symbols-outlined text-primary text-3xl opacity-20">verified_user</span>
              </div>
              <p className="text-text-muted dark:text-stone-400 text-sm leading-relaxed mb-6">
                Before diving in, let&apos;s make sure you meet the basic criteria set by Rotary International for
                Rotaract membership.
              </p>
              {/* Accordion for Details */}
              <details
                className="group/accordion border-t border-stone-100 dark:border-stone-700 pt-4"
                open={openAccordion === 1}
                onToggle={() => toggleAccordion(1)}
              >
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors select-none">
                  <span className="material-symbols-outlined text-lg transition-transform duration-300 group-open/accordion:rotate-90">
                    arrow_right
                  </span>
                  View Detailed Criteria
                </summary>
                <div className="mt-3 pl-7 text-sm text-text-muted dark:text-stone-400 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Must be between the ages of 18 and 30.</li>
                    <li>Living, working, or studying in the NYC metropolitan area.</li>
                    <li>Commitment to attend at least 50% of meetings annually.</li>
                    <li>Passion for community service and professional development.</li>
                  </ul>
                </div>
              </details>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative pl-12 pb-12 group">
            <div className="absolute left-[11px] top-10 h-full w-[2px] bg-stone-200 dark:bg-stone-700"></div>
            <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-stone-800 border-2 border-primary ring-4 ring-background-light dark:ring-background-dark z-10">
              <span className="text-primary text-[10px] font-bold">2</span>
            </div>
            <div className="relative flex flex-col bg-surface-light dark:bg-surface-dark rounded-xl p-6 sm:p-8 shadow-soft border border-stone-100 dark:border-stone-800 transition-all hover:shadow-soft-hover">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300 mb-2">
                    Action Required
                  </span>
                  <h3 className="text-xl font-bold text-text-main dark:text-white">Experience the Club</h3>
                </div>
                <span className="material-symbols-outlined text-primary text-3xl opacity-20">groups</span>
              </div>
              <p className="text-text-muted dark:text-stone-400 text-sm leading-relaxed mb-4">
                We want you to feel at home before you commit. Join us for our regular programming to meet the members
                and see what we do.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-black/20 rounded-lg border border-stone-100 dark:border-stone-700 flex-1">
                  <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <span className="material-symbols-outlined text-lg">event</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-text-muted">Requirement</p>
                    <p className="text-sm font-semibold">Attend 3 Meetings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background-light dark:bg-black/20 rounded-lg border border-stone-100 dark:border-stone-700 flex-1">
                  <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <span className="material-symbols-outlined text-lg">handshake</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-text-muted">Requirement</p>
                    <p className="text-sm font-semibold">Meet the Board</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative pl-12 pb-12 group">
            <div className="absolute left-[11px] top-10 h-full w-[2px] bg-stone-200 dark:bg-stone-700"></div>
            <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-stone-800 border-2 border-primary ring-4 ring-background-light dark:ring-background-dark z-10">
              <span className="text-primary text-[10px] font-bold">3</span>
            </div>
            <div className="relative flex flex-col bg-surface-light dark:bg-surface-dark rounded-xl p-6 sm:p-8 shadow-soft border border-stone-100 dark:border-stone-800 transition-all hover:shadow-soft-hover">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 mb-2">
                    Investment
                  </span>
                  <h3 className="text-xl font-bold text-text-main dark:text-white">Financial Commitment</h3>
                </div>
                <span className="material-symbols-outlined text-primary text-3xl opacity-20">payments</span>
              </div>
              <p className="text-text-muted dark:text-stone-400 text-sm leading-relaxed mb-6">
                Membership dues support our service projects, club operations, and your membership in the international
                Rotary network.
              </p>
              {/* Accordion for Dues */}
              <details
                className="group/accordion border-t border-stone-100 dark:border-stone-700 pt-4"
                open={openAccordion === 3}
                onToggle={() => toggleAccordion(3)}
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-text-main dark:text-white hover:text-primary transition-colors select-none p-2 rounded hover:bg-stone-50 dark:hover:bg-stone-800">
                  <span>Annual Dues Breakdown</span>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">$120/year</span>
                    <span className="material-symbols-outlined text-lg transition-transform duration-300 group-open/accordion:rotate-180">
                      expand_more
                    </span>
                  </div>
                </summary>
                <div className="mt-2 p-4 bg-background-light dark:bg-black/20 rounded-lg text-sm space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                    <span className="text-text-muted dark:text-stone-400">Rotary International Fees</span>
                    <span className="font-medium">$40.00</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200 dark:border-stone-700 pb-2">
                    <span className="text-text-muted dark:text-stone-400">District 7230 Dues</span>
                    <span className="font-medium">$20.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-text-muted dark:text-stone-400">Club Operations &amp; Events</span>
                    <span className="font-medium">$60.00</span>
                  </div>
                  <p className="text-xs text-text-muted dark:text-stone-500 italic mt-2">
                    * Payment plans available for students.
                  </p>
                </div>
              </details>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative pl-12 group">
            {/* No connector line for last item */}
            <div className="absolute left-0 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600 ring-4 ring-background-light dark:ring-background-dark z-10">
              <span className="text-stone-400 text-[10px] font-bold">4</span>
            </div>
            <div className="relative flex flex-col bg-surface-light dark:bg-surface-dark rounded-xl p-6 sm:p-8 shadow-soft border border-stone-100 dark:border-stone-800 transition-all hover:shadow-soft-hover opacity-90">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 mb-2">
                    Final Step
                  </span>
                  <h3 className="text-xl font-bold text-text-main dark:text-white">Formal Application</h3>
                </div>
                <span className="material-symbols-outlined text-primary text-3xl opacity-20">assignment_add</span>
              </div>
              <p className="text-text-muted dark:text-stone-400 text-sm leading-relaxed">
                Once you&apos;ve completed the steps above, submit your official application. The board reviews
                applications monthly. Upon acceptance, you&apos;ll be invited to an induction ceremony!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 p-4 sm:px-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-text-main dark:text-white">Ready to make an impact?</p>
            <p className="text-xs text-text-muted dark:text-stone-400">Join a network of 200+ young leaders.</p>
          </div>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-primary/20">
            <span>Start Application</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )
}
