'use client'

import { motion } from 'framer-motion'
import { FaHandshake, FaUsers, FaGlobe, FaBalanceScale } from 'react-icons/fa'
import { MdDiversity3 } from 'react-icons/md'
import Link from 'next/link'

export default function AboutPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">About Us</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Empowering young leaders to create positive change in New York City and beyond
            </p>
          </motion.div>
        </div>
      </section>

      {/* Who Are We Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink">Who Are We?</h2>
            
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <div>
                <h3 className="text-2xl font-semibold text-rotaract-darkpink mb-4">The Rotaract Club at the United Nations is...</h3>
                <p className="mb-4">
                  ...sponsored by the Rotary Club of New York, District 7230. RCUN was founded in 1995 and has been providing a way for young professionals to connect to the local NYC community ever since.
                </p>
                <p className="text-base italic text-gray-600">
                  … a 501(c)(3) not-for-profit organization. EIN number 88-1865326
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Our Core Values</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* Service */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              <FaHandshake className="text-5xl text-rotaract-pink mb-4" />
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">Service</h3>
              <p className="text-gray-700">
                Our club strives to make a positive impact on the community in which we live. We have a strong partnership with our local Rotary Clubs and our core mission is reducing inequalities. We are always looking to expand our network to increase our positive influence on the community.
              </p>
            </motion.div>

            {/* Fellowship */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              <FaUsers className="text-5xl text-rotaract-pink mb-4" />
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">Fellowship</h3>
              <p className="text-gray-700">
                New York City is a big place. Our club provides our members with close-knit support and the opportunity to make life-long friendships. Our social events allow our members to explore the City with like-minded people, whether they have been here all their lives or just arrived last week!
              </p>
            </motion.div>

            {/* Diversity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              <MdDiversity3 className="text-5xl text-rotaract-pink mb-4" />
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">Diversity</h3>
              <p className="text-gray-700">
                We celebrate diversity. Our membership consists of young men and women from all over the World. We welcome anyone and everyone as long as they are also committed to Rotaract&apos;s goals. The different perspectives and experiences that our members bring to each of our events is the hallmark of our club.
              </p>
            </motion.div>

            {/* Equity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              <FaBalanceScale className="text-5xl text-rotaract-pink mb-4" />
              <h3 className="text-2xl font-bold mb-4 text-rotaract-darkpink">Equity</h3>
              <p className="text-gray-700">
                We believe in the dignity and humanity of all people and envision a world where society and its systems are just, inclusive and enable anyone to reach their full potential. We strive for a healthy and prosperous society that promotes all people having equitable access and opportunity.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Rotaract Is Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Rotaract is...</h2>
              <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
                <p>
                  ...a Rotary-sponsored service club for young men and women ages 18 to 35. Rotaract brings together dedicated individuals to take action in their communities, develop their leadership and professional skills, and have fun. Rotaract clubs are either community or university based. We are true &quot;partners in service&quot; and key members of the family of Rotary. As one of Rotary&apos;s most significant and fastest-growing service programs, with more than 8,000 clubs in about 167 countries and geographical areas, Rotaract has become a worldwide phenomenon.
                </p>
                <p>
                  All Rotaract efforts begin at the local, grassroots level, with members addressing their communities and spreading to the global scale.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Rotary Is Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Rotary is...</h2>
              <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
                <p>
                  ...an international community consisting of 1.2 million neighbors, friends, and community leaders who come together to create positive, lasting change locally and globally. Differing occupations, cultures, and countries give Rotary members a unique perspective. Most importantly, the shared passion for service helps us accomplish the remarkable.
                </p>
                <p>
                  For more information on Rotary and Rotaract, please visit{' '}
                  <a 
                    href="https://www.rotary.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-rotaract-pink hover:text-rotaract-darkpink font-semibold underline"
                  >
                    Rotary.org
                  </a>.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Join Us Today</h2>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Become part of our diverse community of young professionals making a difference in New York City
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/about/membership"
                className="px-8 py-3 bg-rotaract-pink text-white rounded-full font-semibold hover:bg-rotaract-darkpink transition-colors"
              >
                Learn About Membership
              </Link>
              <Link
                href="/contact"
                className="px-8 py-3 border-2 border-rotaract-pink text-rotaract-darkpink rounded-full font-semibold hover:bg-rotaract-pink hover:text-white transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
