'use client'

import { motion } from 'framer-motion'
import { FaCalendar, FaMapMarkerAlt, FaClock, FaInfoCircle } from 'react-icons/fa'

export default function MeetingsPage() {
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
              Meetings
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Meeting Schedule</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Join us at our regular meetings to stay connected and engaged
            </p>
          </motion.div>
        </div>
      </section>

      {/* Meeting Info */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-lg mb-12"
            >
              <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink text-center">Regular Meetings</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <FaCalendar className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">When</h3>
                    <p className="text-gray-700">Every 2nd and 4th Thursday of the month</p>
                    <p className="text-gray-600 text-sm mt-1">7:00 PM - 9:00 PM EST</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <FaMapMarkerAlt className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">Where</h3>
                    <p className="text-gray-700">216 East 45th Street, New York, NY 10017</p>
                    <p className="text-gray-600 text-sm mt-1">Specific room information sent to members before each meeting</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <FaInfoCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">What to Expect</h3>
                    <p className="text-gray-700">Our meetings include club updates, project planning, guest speakers, networking opportunities, and social time.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Meeting Types */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <h3 className="text-xl font-bold mb-4 text-rotaract-pink">General Meetings</h3>
                <p className="text-gray-700 mb-4">
                  Our primary meetings where we discuss club business, vote on initiatives, and plan upcoming events.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Club announcements</li>
                  <li>• Committee reports</li>
                  <li>• Guest speakers</li>
                  <li>• Networking time</li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <h3 className="text-xl font-bold mb-4 text-rotaract-pink">Social Meetings</h3>
                <p className="text-gray-700 mb-4">
                  Casual gatherings focused on fellowship and building relationships among members.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li>• Networking activities</li>
                  <li>• Team building</li>
                  <li>• Casual conversations</li>
                  <li>• Fun and games</li>
                </ul>
              </motion.div>
            </div>

            {/* First Time Visitors */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden bg-white p-8 rounded-lg border border-rotaract-pink/15 shadow-lg"
            >
              <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-rotaract-pink/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-rotaract-darkpink/10 blur-3xl" />
              <div className="relative">
                <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">First Time Visitors Welcome!</h3>
                <p className="mb-4 text-gray-700">
                Interested in learning more about Rotaract NYC? You're welcome to attend a meeting as our guest! No RSVP required, but feel free to email us if you have any questions.
                </p>
                <p className="text-sm text-gray-700">
                  Contact us at:{" "}
                  <a
                    href="mailto:rotaractnewyorkcity@gmail.com"
                    className="font-semibold text-rotaract-pink hover:text-rotaract-darkpink transition-colors"
                  >
                    rotaractnewyorkcity@gmail.com
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Ready to Join Us?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Become a member and be part of our vibrant community
          </p>
          <a
            href="/about/membership"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Learn About Membership
          </a>
        </div>
      </section>
    </div>
  )
}
