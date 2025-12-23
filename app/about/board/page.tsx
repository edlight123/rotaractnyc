'use client'

import { motion } from 'framer-motion'
import { FaUserTie } from 'react-icons/fa'

export default function BoardPage() {
  const boardMembers = [
    { name: 'President', title: 'Club President', role: 'Leads the club and oversees all operations' },
    { name: 'Vice President', title: 'Vice President', role: 'Assists the President and manages internal affairs' },
    { name: 'Secretary', title: 'Club Secretary', role: 'Handles communications and record-keeping' },
    { name: 'Treasurer', title: 'Club Treasurer', role: 'Manages finances and fundraising' },
    { name: 'Service Director', title: 'Service Chair', role: 'Coordinates community service projects' },
    { name: 'Membership Director', title: 'Membership Chair', role: 'Recruits and engages members' },
  ]

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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Board of Directors</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Meet the dedicated leaders guiding our club's mission and activities
            </p>
          </motion.div>
        </div>
      </section>

      {/* Board Members */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {boardMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow"
              >
                <div className="bg-rotaract-pink/10 border border-rotaract-pink/15 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUserTie className="text-4xl text-rotaract-darkpink" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">{member.title}</h3>
                <p className="text-gray-600 mb-3">{member.name}</p>
                <p className="text-sm text-gray-700">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Message from Board */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink">Our Commitment</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                As your board of directors, we are committed to providing meaningful opportunities for service, professional development, and fellowship. We strive to create an inclusive environment where every member can grow as a leader and make a positive impact.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We welcome your ideas, feedback, and participation. Together, we can continue to build a stronger club and community.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Interested in Leadership?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Board positions are elected annually. Get involved and make your voice heard!
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  )
}
