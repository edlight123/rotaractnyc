'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="bg-background-light dark:bg-background-dark">
      {/* Hero Section */}
      <header className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden" role="banner">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 z-10"></div>
          <Image
            src="/53cde13b1a312d32c08a429715695a65.jpg"
            alt="Diverse group of young professionals collaborating"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-20 max-w-[1280px] px-6 text-center flex flex-col items-center gap-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 backdrop-blur-sm mb-4">
            <span className="material-symbols-outlined text-accent text-sm">star</span>
            <span className="text-accent text-xs font-bold uppercase tracking-widest">Est. New York City</span>
          </div>
          
          <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] drop-shadow-sm">
            Service{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Above Self
            </span>
          </h1>
          
          <p className="text-gray-100 text-lg md:text-xl font-medium max-w-2xl leading-relaxed opacity-90">
            The Rotaract Club of NYC brings together people ages 18-30 to exchange ideas with leaders in the community, develop leadership skills, and have fun through service.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              href="/membership-requirements"
              className="h-12 px-8 bg-accent hover:bg-[#c59d52] text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Become a Member
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
            <Link
              href="/about"
              className="h-12 px-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">play_circle</span>
              Learn Our Story
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Mission Statement Block */}
      <section className="py-20 px-6 bg-slate-50 dark:bg-[#1a2026]" id="main-content" aria-labelledby="mission-heading">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center flex flex-col gap-6"
        >
          <span className="material-symbols-outlined text-accent text-4xl">format_quote</span>
          <h2 className="text-2xl md:text-3xl font-medium leading-relaxed text-text-main dark:text-gray-100 italic font-display">
            &ldquo;Our mission is to provide an opportunity for young men and women to enhance the knowledge and skills that will assist them in personal development, to address the physical and social needs of their communities, and to promote better relations between all people worldwide through a framework of friendship and service.&rdquo;
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full mt-4"></div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '5k+', label: 'Service Hours' },
            { value: '120', label: 'Active Members' },
            { value: '$50k', label: 'Funds Raised' },
            { value: '15', label: 'Global Partners' },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-black text-accent mb-2">{stat.value}</div>
              <div className="text-sm font-bold uppercase tracking-wider text-text-muted dark:text-gray-400">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The 3 Pillars (Alternating Layout) */}
      <div className="flex flex-col">
        {/* Pillar 1: Community Service */}
        <section className="py-24 px-6 md:px-12 max-w-[1280px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-accent/10 rounded-2xl transform -rotate-2 transition-transform group-hover:rotate-0"></div>
              <Image
                src="/ce9ea973f79cb6988ad3e2945e3a87ae.jpg"
                alt="Volunteers engaging in community service"
                width={600}
                height={450}
                className="relative w-full aspect-[4/3] object-cover rounded-xl shadow-2xl dark:opacity-90"
              />
            </div>
            <div className="flex flex-col gap-6 md:pl-10">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary dark:text-blue-400">
                <span className="material-symbols-outlined">volunteer_activism</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-main dark:text-white">
                Community Service
              </h2>
              <p className="text-lg text-text-muted dark:text-gray-300 leading-relaxed">
                We are dedicated to making a tangible impact in New York City. Through hands-on service projects like park cleanups, food drives, and partnerships with local non-profits, we work to improve the lives of our neighbors and strengthen our community bond.
              </p>
              <ul className="flex flex-col gap-3 mt-2">
                <li className="flex items-center gap-3 text-text-main dark:text-gray-200">
                  <span className="material-symbols-outlined text-accent">check_circle</span>
                  <span>Monthly hands-on volunteer events</span>
                </li>
                <li className="flex items-center gap-3 text-text-main dark:text-gray-200">
                  <span className="material-symbols-outlined text-accent">check_circle</span>
                  <span>Fundraising for local shelters</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </section>

        {/* Pillar 2: Professional Development */}
        <section className="py-24 px-6 md:px-12 max-w-[1280px] mx-auto w-full bg-white dark:bg-background-dark">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            {/* Text First on Desktop */}
            <div className="flex flex-col gap-6 md:pr-10 order-2 md:order-1">
              <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <span className="material-symbols-outlined">school</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-main dark:text-white">
                Professional Development
              </h2>
              <p className="text-lg text-text-muted dark:text-gray-300 leading-relaxed">
                Rotaract isn&apos;t just about giving back; it&apos;s about growing forward. We provide a platform for members to develop essential leadership skills, network with established industry professionals, and gain mentorship from Rotary members.
              </p>
              <ul className="flex flex-col gap-3 mt-2">
                <li className="flex items-center gap-3 text-text-main dark:text-gray-200">
                  <span className="material-symbols-outlined text-primary dark:text-blue-400">check_circle</span>
                  <span>Exclusive guest speaker series</span>
                </li>
                <li className="flex items-center gap-3 text-text-main dark:text-gray-200">
                  <span className="material-symbols-outlined text-primary dark:text-blue-400">check_circle</span>
                  <span>Leadership workshops &amp; mentorship</span>
                </li>
              </ul>
            </div>
            {/* Image Second on Desktop */}
            <div className="relative group order-1 md:order-2">
              <div className="absolute -inset-4 bg-primary/10 rounded-2xl transform rotate-2 transition-transform group-hover:rotate-0"></div>
              <Image
                src="/b220fe440206d474a74b2a2467d410ac.jpg"
                alt="Professional networking event"
                width={600}
                height={450}
                className="relative w-full aspect-[4/3] object-cover rounded-xl shadow-2xl dark:opacity-90"
              />
            </div>
          </motion.div>
        </section>

        {/* Pillar 3: International Fellowship */}
        <section className="py-24 px-6 md:px-12 max-w-[1280px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-accent/10 rounded-2xl transform -rotate-2 transition-transform group-hover:rotate-0"></div>
              <Image
                src="/f16b74a04b626f30222c37c4d15d7c80.jpg"
                alt="Group of diverse friends and global fellowship"
                width={600}
                height={450}
                className="relative w-full aspect-[4/3] object-cover rounded-xl shadow-2xl dark:opacity-90"
              />
            </div>
            <div className="flex flex-col gap-6 md:pl-10">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary dark:text-blue-400">
                <span className="material-symbols-outlined">public</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-main dark:text-white">
                International Fellowship
              </h2>
              <p className="text-lg text-text-muted dark:text-gray-300 leading-relaxed">
                As part of a global network of over 1.2 million neighbors, friends, and community leaders, our members have the unique opportunity to connect with clubs worldwide. We foster global understanding and lifelong friendships across borders.
              </p>
              <ul className="flex flex-col gap-3 mt-2">
                <li className="flex items-center gap-3 text-text-main dark:text-gray-200">
                  <span className="material-symbols-outlined text-accent">check_circle</span>
                  <span>International conventions &amp; travel</span>
                </li>
                <li className="flex items-center gap-3 text-text-main dark:text-gray-200">
                  <span className="material-symbols-outlined text-accent">check_circle</span>
                  <span>Cultural exchange programs</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </section>
      </div>

      {/* CTA Footer */}
      <section className="bg-primary py-24 px-6 text-center relative overflow-hidden">
        {/* Abstract Decoration */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-3xl mx-auto flex flex-col gap-8 items-center"
        >
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Ready to make a difference?
          </h2>
          <p className="text-blue-100 text-lg md:text-xl font-medium max-w-xl">
            Join us at our next meeting to meet the members and see what Rotaract NYC is all about.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link
              href="/meetings"
              className="h-14 px-8 bg-accent hover:bg-white hover:text-primary text-white font-bold text-lg rounded-lg transition-all shadow-xl flex items-center justify-center gap-2"
            >
              Attend a Meeting
            </Link>
            <Link
              href="/contact"
              className="h-14 px-8 bg-transparent border-2 border-white/30 hover:bg-white/10 text-white font-bold text-lg rounded-lg transition-all flex items-center justify-center gap-2"
            >
              Contact Us
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
