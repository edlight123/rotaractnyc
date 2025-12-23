'use client'

import { motion } from 'framer-motion'
import { FaGlobeAmericas, FaHandshake } from 'react-icons/fa'

export default function SisterClubsPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Sister Clubs</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Building global connections through partnership and collaboration
            </p>
          </motion.div>
        </div>
      </section>

      {/* International Network */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <FaGlobeAmericas className="text-6xl text-rotaract-pink mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink">Part of a Global Network</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                As part of Rotary International, our club is connected to thousands of Rotaract clubs around the world. We maintain special relationships with sister clubs that share our commitment to service and international understanding.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Through these partnerships, we exchange ideas, collaborate on projects, and create lasting friendships that span continents.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Sister Clubs */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Our Sister Clubs</h2>
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gray-50 p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">København Rotaract</h3>
              <div className="space-y-3 text-gray-700">
                <p className="flex items-start">
                  <span className="font-semibold min-w-[140px]">Sister-Club since:</span>
                  <span>2021</span>
                </p>
                <p className="flex items-start">
                  <span className="font-semibold min-w-[140px]">Location:</span>
                  <span>Copenhagen, Denmark</span>
                </p>
                <p className="flex items-start">
                  <span className="font-semibold min-w-[140px]">2021 Presidents:</span>
                  <span>Vincenzo Giordano (RCUN) and Charlotte Katrine Melchiorsen (KR)</span>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Sister Club Benefits</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <FaHandshake className="text-4xl text-rotaract-pink mb-4" />
              <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">Joint Projects</h3>
              <p className="text-gray-700">
                Collaborate on service projects that have global impact and address shared challenges.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <FaGlobeAmericas className="text-4xl text-rotaract-pink mb-4" />
              <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">Cultural Exchange</h3>
              <p className="text-gray-700">
                Share cultural experiences and learn from different perspectives around the world.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <FaHandshake className="text-4xl text-rotaract-pink mb-4" />
              <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">Travel Opportunities</h3>
              <p className="text-gray-700">
                Visit sister clubs and experience hospitality and friendship in different countries.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <FaGlobeAmericas className="text-4xl text-rotaract-pink mb-4" />
              <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">Global Network</h3>
              <p className="text-gray-700">
                Build professional and personal connections that span the globe.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Interested in Sister Club Partnerships?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            If your Rotaract club is interested in establishing a sister club relationship with us, we'd love to hear from you!
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  )
}
