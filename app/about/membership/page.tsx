'use client'

import { motion } from 'framer-motion'
import { FaCheckCircle } from 'react-icons/fa'

export default function MembershipPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Membership</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Join a vibrant community of young professionals dedicated to service and leadership
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Membership Benefits</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              'Professional networking opportunities',
              'Leadership development training',
              'Community service projects',
              'International connections',
              'Social events and activities',
              'Career advancement opportunities',
              'United Nations access and events',
              'Skill-building workshops',
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-4"
              >
                <FaCheckCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-700">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink text-center">Who Can Join?</h2>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <ul className="space-y-4 text-lg text-gray-700">
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span>Young professionals aged 18-30</span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span>Passionate about community service and leadership</span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span>Committed to attending regular meetings and events</span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span>Living in or around New York City</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink">How to Join</h2>
            <div className="space-y-6 text-left">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Step 1: Attend a Meeting</h3>
                <p className="text-gray-700">
                  Come to one of our regular meetings to meet members and learn more about our activities. Check our events page for upcoming meetings.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Step 2: Submit Application</h3>
                <p className="text-gray-700">
                  Fill out our membership application form and tell us about yourself and your interests.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Step 3: Welcome!</h3>
                <p className="text-gray-700">
                  Once approved, you'll receive a welcome packet and be invited to your first member orientation.
                </p>
              </div>
            </div>
            <div className="mt-12">
              <a
                href="/contact"
                className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
              >
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
