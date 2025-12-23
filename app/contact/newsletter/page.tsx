'use client'

import { motion } from 'framer-motion'
import { FaEnvelope, FaCheckCircle } from 'react-icons/fa'

export default function NewsletterPage() {
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
              Newsletter
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Newsletter</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Stay informed with our monthly newsletter
            </p>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-lg"
            >
              <div className="text-center mb-8">
                <div className="bg-rotaract-pink/10 border border-rotaract-pink/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaEnvelope className="text-4xl text-rotaract-darkpink" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-rotaract-darkpink">Subscribe to Our Newsletter</h2>
                <p className="text-gray-700">
                  Receive monthly updates about our events, service projects, and club news
                </p>
              </div>

              <form className="space-y-6">
                <div>
                  <label htmlFor="firstName" className="block text-gray-700 font-semibold mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-rotaract-pink"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-gray-700 font-semibold mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-rotaract-pink"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-rotaract-pink"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    required
                    className="mt-1 mr-3"
                  />
                  <label htmlFor="consent" className="text-gray-700 text-sm">
                    I agree to receive email communications from Rotaract Club of New York at the United Nations. I can unsubscribe at any time.
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-rotaract-pink text-white font-semibold py-3 rounded-lg hover:bg-rotaract-darkpink transition-colors"
                >
                  Subscribe Now
                </button>
              </form>

              <p className="text-gray-600 text-sm mt-6 text-center">
                Note: This is a demo form. Please email us at rotaractnewyorkcity@gmail.com to be added to our mailing list.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">What You'll Get</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start space-x-4"
              >
                <FaCheckCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">Event Announcements</h3>
                  <p className="text-gray-700">
                    Be the first to know about upcoming meetings, service projects, and social events
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start space-x-4"
              >
                <FaCheckCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">Project Updates</h3>
                  <p className="text-gray-700">
                    Learn about the impact of our community service initiatives and success stories
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="flex items-start space-x-4"
              >
                <FaCheckCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">Member Spotlights</h3>
                  <p className="text-gray-700">
                    Get to know our members and learn about their leadership journeys
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="flex items-start space-x-4"
              >
                <FaCheckCircle className="text-rotaract-pink text-2xl flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">Exclusive Content</h3>
                  <p className="text-gray-700">
                    Access newsletter-only content including leadership tips and behind-the-scenes updates
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 bg-white p-6 rounded-lg shadow-md text-center"
            >
              <p className="text-gray-700">
                <strong className="text-rotaract-darkpink">Frequency:</strong> Monthly newsletter sent on the first week of each month
              </p>
              <p className="text-gray-700 mt-2">
                <strong className="text-rotaract-darkpink">Privacy:</strong> We respect your privacy and will never share your information with third parties
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Questions?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Contact us if you have any questions about our newsletter
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
