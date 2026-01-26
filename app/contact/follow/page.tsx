'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaFacebook, FaLinkedin, FaInstagram } from 'react-icons/fa'

export default function FollowPage() {
  const socialLinks = [
    {
      name: 'Instagram',
      icon: FaInstagram,
      url: 'http://instagram.com/rotaractnyc',
      handle: '@rotaractnyc',
      description: 'See our latest photos and stories',
      gradient: 'from-pink-500 via-red-500 to-yellow-500'
    },
    {
      name: 'LinkedIn',
      icon: FaLinkedin,
      url: 'https://www.linkedin.com/company/rotaract-at-the-un-nyc/',
      handle: 'Rotaract at the UN (NYC)',
      description: 'Connect with us professionally',
      gradient: 'from-blue-600 to-blue-700'
    },
    {
      name: 'Facebook',
      icon: FaFacebook,
      url: 'https://www.facebook.com/rotaractnewyorkcity/',
      handle: 'Rotaract NYC',
      description: 'Event updates and community news',
      gradient: 'from-blue-500 to-blue-600'
    },
  ]

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
              <span className="material-symbols-outlined text-accent text-sm">share</span>
              <span className="text-white/90 text-sm font-semibold">Stay Connected</span>
            </span>
            <h1 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tight">Follow Us</h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Stay connected with Rotaract NYC on social media
            </p>
          </motion.div>
        </div>
      </section>

      {/* Social Media Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid gap-6">
            {socialLinks.map((social, index) => {
              const IconComponent = social.icon
              return (
                <motion.a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-center bg-white dark:bg-surface-dark p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 dark:border-zinc-700 overflow-hidden relative"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${social.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${social.gradient} flex items-center justify-center text-white mr-6 group-hover:scale-110 transition-transform`}>
                    <IconComponent className="text-4xl" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      {social.name}
                    </h2>
                    <p className="text-primary font-semibold text-sm mb-2">{social.handle}</p>
                    <p className="text-gray-600 dark:text-gray-300">{social.description}</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-primary group-hover:translate-x-2 transition-all">
                    <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                  </div>
                </motion.a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Follow Section */}
      <section className="py-20 bg-gray-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Why Follow Us?</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: 'notifications_active', title: 'Stay Informed', desc: 'Get real-time updates about upcoming events, meetings, and service projects' },
                { icon: 'photo_library', title: 'See Our Impact', desc: 'View photos and videos from our community service initiatives and social events' },
                { icon: 'forum', title: 'Join the Conversation', desc: 'Engage with our community and share your thoughts and ideas' },
                { icon: 'lightbulb', title: 'Get Inspired', desc: 'Discover stories of leadership, service, and fellowship from our members' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 group hover:border-primary/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                    <span className="material-symbols-outlined text-primary text-2xl group-hover:text-white">{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-6 text-white">Want More Updates?</h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter for comprehensive monthly updates
          </p>
          <Link
            href="/newsletter-sign-up"
            className="inline-flex items-center gap-2 h-14 px-8 bg-white text-primary font-bold rounded-full transition-all shadow-xl hover:bg-accent hover:text-white hover:scale-105"
          >
            <span className="material-symbols-outlined">mail</span>
            Subscribe to Newsletter
          </Link>
        </div>
      </section>
    </div>
  )
}
