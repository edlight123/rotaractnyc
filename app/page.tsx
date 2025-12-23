'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { FaHandshake, FaUsers, FaGlobeAmericas, FaArrowRight } from 'react-icons/fa'

import { HeroCarousel } from '@/components/HeroCarousel'

export default function Home() {
  const activityImages = [
    { src: '/53cde13b1a312d32c08a429715695a65.jpg', alt: 'Activity 1' },
    { src: '/b220fe440206d474a74b2a2467d410ac.jpg', alt: 'Activity 2' },
    { src: '/ce9ea973f79cb6988ad3e2945e3a87ae.jpg', alt: 'Activity 3' },
    { src: '/f16b74a04b626f30222c37c4d15d7c80.jpg', alt: 'Activity 4' },
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative pt-40 md:pt-48 pb-24 md:pb-36 overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
          <HeroCarousel images={activityImages} variant="background" />
        </div>
        <div className="absolute inset-0 z-10 bg-black/35" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/25 via-black/25 to-black/40" />
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-20 text-center px-4 max-w-5xl mx-auto"
        >
          <p className="text-sm md:text-base font-semibold tracking-wide text-white/90 mb-4">
            Welcome to
          </p>

          <h1 className="text-4xl md:text-6xl font-bold mb-5 tracking-tight text-white">
            the Rotaract Club of New York at the United Nations
          </h1>
          
          <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed text-white/90">
            Service, Fellowship, Diversity, Equity
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/mission"
              className="px-8 py-4 bg-rotaract-pink hover:bg-rotaract-darkpink text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              Learn More
            </Link>
            <Link
              href="/contact-us"
              className="px-8 py-4 bg-white/10 hover:bg-white/15 border border-white/40 text-white font-semibold rounded-lg transition-colors backdrop-blur-sm"
            >
              Get Involved
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-rotaract-darkpink mb-6">Our Mission</h2>
            <div className="w-24 h-1 bg-rotaract-pink mx-auto mb-8" />
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Sponsored by The Rotary Club of New York, we empower young professionals
              to create positive change through service projects, professional development,
              and international collaboration.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {[
              {
                icon: <FaHandshake className="text-6xl" />,
                title: 'Service',
                description: 'Making a difference through community service projects locally and globally.',
              },
              {
                icon: <FaUsers className="text-6xl" />,
                title: 'Fellowship',
                description: 'Building lasting friendships and professional networks across diverse backgrounds.',
              },
              {
                icon: <FaGlobeAmericas className="text-6xl" />,
                title: 'Diversity',
                description: 'Embracing cultural diversity and promoting international understanding.',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2"
              >
                <div className="text-rotaract-pink mb-6">{item.icon}</div>
                <h3 className="text-2xl font-bold text-rotaract-darkpink mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-rotaract-darkpink mb-6">Recent Activities</h2>
            <div className="w-24 h-1 bg-rotaract-pink mx-auto mb-8" />
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {activityImages.map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative group overflow-hidden rounded-xl shadow-lg aspect-square"
              >
                <Image
                  src={img.src}
                  alt={`Activity ${index + 1}`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <p className="text-white font-semibold">Event Gallery</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="mx-auto max-w-3xl rounded-2xl border border-rotaract-pink/20 bg-white p-10 shadow-sm">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink">
                Ready to Make a Difference?
              </h2>
              <p className="text-lg md:text-xl mb-8 text-gray-700">
                Join us for our general meetings every 2nd and 4th Thursday.
              </p>
            <Link
              href="/membership-requirements"
              className="inline-flex items-center gap-3 px-8 py-4 bg-rotaract-pink hover:bg-rotaract-darkpink text-white font-bold rounded-lg shadow-sm transition-colors text-lg"
            >
              Become a Member
              <FaArrowRight />
            </Link>
              <div className="mt-4">
                <Link
                  href="/meetings"
                  className="text-sm font-semibold text-rotaract-pink hover:text-rotaract-darkpink transition-colors"
                >
                  View meeting details
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-12">
            <h2 className="text-4xl font-bold text-rotaract-darkpink mb-8 text-center">Visit Us</h2>
            <div className="text-center text-lg text-gray-700 space-y-2">
              <p className="font-semibold text-2xl text-rotaract-pink">216 East 45th Street</p>
              <p className="text-xl">New York, NY 10017</p>
              <p className="text-xl">United States</p>
              <p className="mt-6 text-gray-600">
                Email: <a href="mailto:rotaractnewyorkcity@gmail.com" className="text-rotaract-pink hover:underline">rotaractnewyorkcity@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
