'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function MissionPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Split Hero Section */}
      <section className="relative w-full min-h-[85vh] grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Text Content */}
        <div className="relative bg-primary dark:bg-primary-dark flex flex-col justify-center px-8 py-20 lg:px-20 order-2 lg:order-1">
          <div className="max-w-xl mx-auto lg:mx-0 flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 w-fit border border-white/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Mission Statement</span>
            </div>
            <blockquote className="relative">
              <span className="absolute -top-6 -left-4 text-6xl text-accent/20 font-serif">&ldquo;</span>
              <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight">
                Service Above Self is more than a motto; it&apos;s our <span className="text-accent underline decoration-4 underline-offset-4 decoration-white/20">daily practice</span>.
              </h1>
            </blockquote>
            <div className="flex items-center gap-4 mt-4">
              <div className="h-px w-12 bg-white/30"></div>
              <p className="text-white/80 text-base font-medium">– Sarah J., Member since 2019</p>
            </div>
            <div className="pt-8">
              <Link href="/events" className="group inline-flex items-center gap-3 bg-white text-primary px-8 py-4 rounded font-bold text-lg hover:bg-accent hover:text-primary transition-all duration-300 shadow-xl shadow-black/10">
                See Our Impact
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')"}}></div>
        </div>
        
        {/* Right: Image */}
        <div className="relative h-[50vh] lg:h-auto bg-gray-200 dark:bg-gray-800 order-1 lg:order-2 overflow-hidden group">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB9awVNiLaVmUqHKESkhm_Mal48Izh9HDIz2i5w4G_uMV7HqAoLdHj7D_IPq1ziqZiolaP1OxJ5ceeHwj1OQdAm57V6quvDPOorbqDq0czwRLt4gA3hzsFl0OPR0f_GcmK_zdvqWjuCinqfaWolj5KEUqrgmTJEqubwlgXyIjOK2k78n9E0C5XgurNRfq-pB4LU9-qqY2hOpqd-z___AbcLV7EVLin9FQPiklmpQ3YZIk-cup-Cx_GMBz-_LlpipAVzN5DZTvOc6Mw')"}}></div>
          <div className="absolute inset-0 bg-primary/20 dark:bg-primary-dark/20 mix-blend-multiply"></div>
        </div>
      </section>

      {/* Impact Stats Strip */}
      <section className="relative bg-white dark:bg-slate-800 -mt-8 mx-4 lg:mx-20 rounded-lg shadow-lg z-10 border border-slate-100 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 lg:p-12 text-center group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-l-lg"
          >
            <div className="flex justify-center mb-4 text-accent">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-5xl lg:text-6xl font-bold text-primary dark:text-white mb-2 tracking-tighter">5,000+</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-xs">Hours Served</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-8 lg:p-12 text-center group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex justify-center mb-4 text-accent">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-5xl lg:text-6xl font-bold text-primary dark:text-white mb-2 tracking-tighter">$25k</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-xs">Dollars Raised</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-8 lg:p-12 text-center group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-r-lg"
          >
            <div className="flex justify-center mb-4 text-accent">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
            </div>
            <p className="text-5xl lg:text-6xl font-bold text-primary dark:text-white mb-2 tracking-tighter">15</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-xs">Local Partners</p>
          </motion.div>
        </div>
      </section>

      {/* Narrative Section with Data Viz */}
      <section className="py-24 px-6 md:px-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24"
          >
            <h2 className="text-gray-900 dark:text-white text-3xl lg:text-4xl font-bold leading-tight">
              Why these numbers matter
            </h2>
            <div className="h-1 w-20 bg-accent rounded-full"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
              Every hour served and dollar raised represents a tangible difference in our community. We believe in transparency and effectiveness in all our projects.
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
              Our approach is data-driven but human-centric. We track our impact to ensure we are allocating resources where they are needed most.
            </p>
          </motion.div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-slate-800 p-8 rounded border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <h3 className="text-xl font-bold mb-6 dark:text-white">Project Fund Allocation</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2 text-sm font-bold">
                    <span className="text-slate-700 dark:text-slate-200">Environmental Sustainability</span>
                    <span className="text-primary dark:text-accent">45%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[45%] rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2 text-sm font-bold">
                    <span className="text-slate-700 dark:text-slate-200">Food Security &amp; Hunger</span>
                    <span className="text-primary dark:text-accent">35%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/80 w-[35%] rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2 text-sm font-bold">
                    <span className="text-slate-700 dark:text-slate-200">Youth Education</span>
                    <span className="text-primary dark:text-accent">20%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-accent w-[20%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-primary text-white p-8 rounded shadow-sm relative overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="mb-4 bg-white/10 w-12 h-12 rounded flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h4 className="text-3xl font-bold mb-1">200+</h4>
                  <p className="text-white/80 text-sm font-medium">Active Members</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-gray-100 dark:bg-slate-800 p-8 rounded shadow-sm"
              >
                <div className="mb-4 bg-white dark:bg-slate-700 w-12 h-12 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary dark:text-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">New York City</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Serving all 5 boroughs</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="bg-slate-50 dark:bg-gray-800 py-24 px-6 md:px-20">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Three Pillars</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">The core principles that guide every project we undertake.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-slate-700 p-8 rounded-lg border border-slate-100 dark:border-slate-600 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary dark:text-accent">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Community Service</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                Direct, hands-on involvement in local projects. We show up, work hard, and solve problems together.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-700 p-8 rounded-lg border border-slate-100 dark:border-slate-600 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary dark:text-accent">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2 0V17a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Professional Development</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                Building the next generation of leaders through mentorship programs and networking events.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-700 p-8 rounded-lg border border-slate-100 dark:border-slate-600 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary dark:text-accent">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Fellowship</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                Creating lasting friendships across cultures. We believe strong bonds lead to stronger communities.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-black text-primary dark:text-white mb-6">Help us increase these numbers.</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto">
              Join a community of passionate individuals dedicated to making a real difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/about/membership" className="px-8 py-4 bg-primary text-white rounded font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg">
                Become a Member
              </Link>
              <Link href="/donate-now" className="px-8 py-4 bg-transparent border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded font-bold text-lg hover:border-primary hover:text-primary transition-colors">
                Make a Donation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
