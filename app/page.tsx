'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { FaHandshake, FaUsers, FaGlobeAmericas, FaArrowRight } from 'react-icons/fa'

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rotaract-pink to-rotaract-darkpink opacity-95 z-0" />
        <div className="absolute inset-0 bg-black/20 z-10" />
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-20 text-center text-white px-4 max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8"
          >
            <Image
              src="/logo.jpg"
              alt="Rotaract Logo"
              width={200}
              height={200}
              className="mx-auto rounded-full shadow-2xl border-4 border-white"
              priority
            />
          </motion.div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
            Rotaract Club at the
            <span className="block text-white">United Nations</span>
          </h1>
          
          <p className="text-2xl md:text-3xl mb-8 font-light">
            Service · Fellowship · Diversity
          </p>
          
          <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            A Rotary-sponsored service club for young professionals ages 18 to 30,
            developing leadership skills by helping local and international communities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/about"
              className="px-8 py-4 bg-white hover:bg-gray-100 text-rotaract-pink font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
            >
              Learn More
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-2 border-white text-white font-semibold rounded-lg transition-all"
            >
              Get Involved
            </Link>
          </div>
        </motion.div>
        
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20"
        >
          <div className="text-white text-sm">Scroll Down</div>
          <div className="w-6 h-10 border-2 border-white rounded-full mx-auto mt-2 relative">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 bg-white rounded-full absolute left-1/2 transform -translate-x-1/2 top-2"
            />
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
            {['/53cde13b1a312d32c08a429715695a65.jpg', '/b220fe440206d474a74b2a2467d410ac.jpg', '/ce9ea973f79cb6988ad3e2945e3a87ae.jpg', '/f16b74a04b626f30222c37c4d15d7c80.jpg'].map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative group overflow-hidden rounded-xl shadow-lg aspect-square"
              >
                <Image
                  src={img}
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
      <section className="py-24 bg-gradient-to-r from-rotaract-pink to-rotaract-darkpink text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl font-bold mb-6">Ready to Make a Difference?</h2>
            <p className="text-xl mb-12 max-w-2xl mx-auto">
              Join us for our weekly meetings every Thursday from 7 PM to 8 PM
            </p>
            <Link
              href="/membership"
              className="inline-flex items-center gap-3 px-10 py-5 bg-white hover:bg-gray-100 text-rotaract-pink font-bold rounded-lg shadow-xl transition-all transform hover:scale-105 text-lg"
            >
              Become a Member
              <FaArrowRight />
            </Link>
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
