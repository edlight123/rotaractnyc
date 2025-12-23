'use client'

import { motion } from 'framer-motion'
import { FaFacebook, FaLinkedin, FaInstagram } from 'react-icons/fa'

export default function FollowPage() {
  const socialLinks = [
    {
      name: 'Facebook',
      icon: FaFacebook,
      url: 'https://www.facebook.com/rotaractnewyorkcity/',
      description: 'Follow us on Facebook for event updates, photos, and community news',
      color: 'hover:text-blue-600'
    },
    {
      name: 'LinkedIn',
      icon: FaLinkedin,
      url: 'https://www.linkedin.com/company/rotaract-at-the-un-nyc/',
      description: 'Connect with us professionally on LinkedIn',
      color: 'hover:text-blue-700'
    },
    {
      name: 'Instagram',
      icon: FaInstagram,
      url: 'http://instagram.com/rotaractnyc',
      description: 'See our latest photos and stories on Instagram',
      color: 'hover:text-pink-600'
    },
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Follow Us</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Stay connected with Rotaract NYC on social media
            </p>
          </motion.div>
        </div>
      </section>

      {/* Social Media Links */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {socialLinks.map((social, index) => {
              const IconComponent = social.icon
              return (
                <motion.a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all group"
                >
                  <div className={`text-6xl text-rotaract-pink ${social.color} transition-colors mr-8`}>
                    <IconComponent />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2 text-rotaract-darkpink group-hover:text-rotaract-pink transition-colors">
                      {social.name}
                    </h2>
                    <p className="text-gray-700">{social.description}</p>
                  </div>
                  <div className="text-rotaract-pink text-2xl group-hover:translate-x-2 transition-transform">
                    →
                  </div>
                </motion.a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Follow */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink">Why Follow Us?</h2>
              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Stay Informed</h3>
                  <p className="text-gray-700">
                    Get real-time updates about upcoming events, meetings, and service projects
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-3 text-rotaract-pink">See Our Impact</h3>
                  <p className="text-gray-700">
                    View photos and videos from our community service initiatives and social events
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Join the Conversation</h3>
                  <p className="text-gray-700">
                    Engage with our community and share your thoughts and ideas
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-3 text-rotaract-pink">Get Inspired</h3>
                  <p className="text-gray-700">
                    Discover stories of leadership, service, and fellowship from our members
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Want More Updates?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter for comprehensive monthly updates
          </p>
          <a
            href="/contact/newsletter"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Subscribe to Newsletter
          </a>
        </div>
      </section>
    </div>
  )
}
