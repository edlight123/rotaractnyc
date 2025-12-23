'use client'

import { motion } from 'framer-motion'
import { FaHandshake, FaUsers, FaGlobe } from 'react-icons/fa'

export default function MissionPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-5 inline-flex items-center rounded-full border border-rotaract-pink/20 bg-white px-4 py-1 text-sm text-rotaract-darkpink shadow-sm">
              About
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Our Mission</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Empowering young leaders to create positive change through service, fellowship, and professional development
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink text-center">What We Stand For</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              The Rotaract Club of New York at the United Nations is dedicated to developing leadership skills and creating opportunities for young professionals to make a meaningful impact in their communities and around the world.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Through service projects, professional networking events, and international connections, we provide our members with unique experiences that foster personal growth and global citizenship.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-md text-center"
            >
              <FaHandshake className="text-5xl text-rotaract-pink mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">Service</h3>
              <p className="text-gray-700">
                We are committed to serving our local and global communities through meaningful projects that address real needs.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-lg shadow-md text-center"
            >
              <FaUsers className="text-5xl text-rotaract-pink mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">Fellowship</h3>
              <p className="text-gray-700">
                We build lasting friendships and professional networks through social events and collaborative projects.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-lg shadow-md text-center"
            >
              <FaGlobe className="text-5xl text-rotaract-pink mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">Leadership</h3>
              <p className="text-gray-700">
                We develop future leaders by providing opportunities to organize events, manage projects, and inspire others.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Join Our Mission</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Be part of a dynamic community of young professionals making a difference
          </p>
          <a
            href="/about/membership"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Become a Member
          </a>
        </div>
      </section>
    </div>
  )
}
