'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-background-dark">
      {/* Premium Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-800"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6">
              <span className="material-symbols-outlined text-accent text-sm">mail</span>
              <span className="text-white/90 text-sm font-semibold">Stay Updated</span>
            </span>
            <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight">Newsletter</h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Stay informed with our monthly newsletter
            </p>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-surface-dark p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-700"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-primary text-4xl">mark_email_unread</span>
                </div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Subscribe to Our Newsletter</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Receive monthly updates about our events, service projects, and club news
                </p>
              </div>

              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-600 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="John"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-600 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-600 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    required
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to receive email communications from Rotaract Club of New York at the United Nations. I can unsubscribe at any time.
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full h-14 bg-primary text-white font-bold rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">send</span>
                  Subscribe Now
                </button>
              </form>

              <p className="text-gray-500 dark:text-gray-400 text-sm mt-6 text-center">
                Note: This is a demo form. Please email us at <a href="mailto:rotaractnewyorkcity@gmail.com" className="text-primary font-semibold hover:underline">rotaractnewyorkcity@gmail.com</a> to be added to our mailing list.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-20 bg-gray-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-gray-900 dark:text-white text-center">What You&apos;ll Get</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: 'event', title: 'Event Announcements', desc: 'Be the first to know about upcoming meetings, service projects, and social events' },
                { icon: 'task_alt', title: 'Project Updates', desc: 'Learn about the impact of our community service initiatives and success stories' },
                { icon: 'person_celebrate', title: 'Member Spotlights', desc: 'Get to know our members and learn about their leadership journeys' },
                { icon: 'auto_awesome', title: 'Exclusive Content', desc: 'Access newsletter-only content including leadership tips and behind-the-scenes updates' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-2xl">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 bg-white dark:bg-surface-dark p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700"
            >
              <div className="flex flex-wrap justify-center gap-8">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  <span className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Frequency:</strong> Monthly, first week</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">shield</span>
                  <span className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">Privacy:</strong> Never shared with third parties</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-6 text-white">Questions?</h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Contact us if you have any questions about our newsletter
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 h-14 px-8 bg-white text-primary font-bold rounded-full transition-all shadow-xl hover:bg-accent hover:text-white hover:scale-105"
          >
            <span className="material-symbols-outlined">mail</span>
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  )
}
