'use client'

import { motion } from 'framer-motion'
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa'

export default function ContactPage() {
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
              Contact
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Contact Us</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Get in touch with Rotaract Club of New York at the United Nations
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-md text-center"
            >
              <div className="bg-rotaract-pink/10 border border-rotaract-pink/15 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaEnvelope className="text-2xl text-rotaract-darkpink" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">Email</h3>
              <a
                href="mailto:rotaractnewyorkcity@gmail.com"
                className="text-gray-700 hover:text-rotaract-pink transition-colors"
              >
                rotaractnewyorkcity@gmail.com
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-lg shadow-md text-center"
            >
              <div className="bg-rotaract-pink/10 border border-rotaract-pink/15 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaMapMarkerAlt className="text-2xl text-rotaract-darkpink" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">Address</h3>
              <p className="text-gray-700">
                216 East 45th Street<br />
                New York, NY 10017<br />
                United States
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-lg shadow-md text-center"
            >
              <div className="bg-rotaract-pink/10 border border-rotaract-pink/15 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaPhone className="text-2xl text-rotaract-darkpink" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-rotaract-darkpink">Meeting Times</h3>
              <p className="text-gray-700">
                Every 2nd & 4th Thursday<br />
                7:00 PM - 9:00 PM EST
              </p>
            </motion.div>
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-lg"
            >
              <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink text-center">Send Us a Message</h2>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-gray-700 font-semibold mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-rotaract-pink"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                    Email *
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

                <div>
                  <label htmlFor="subject" className="block text-gray-700 font-semibold mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-rotaract-pink"
                    placeholder="What is this regarding?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-gray-700 font-semibold mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-rotaract-pink resize-none"
                    placeholder="Your message..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rotaract-pink text-white font-semibold py-3 rounded-lg hover:bg-rotaract-darkpink transition-colors"
                >
                  Send Message
                </button>
              </form>
              <p className="text-gray-600 text-sm mt-4 text-center">
                Note: This is a demo form. Please email us directly at rotaractnewyorkcity@gmail.com
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">More Ways to Connect</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.a
              href="/contact/follow"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
            >
              <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Follow Us</h3>
              <p className="text-gray-700">Connect with us on social media for updates and photos</p>
            </motion.a>

            <motion.a
              href="/contact/newsletter"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
            >
              <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Newsletter</h3>
              <p className="text-gray-700">Subscribe to our newsletter for monthly updates</p>
            </motion.a>
          </div>
        </div>
      </section>
    </div>
  )
}
