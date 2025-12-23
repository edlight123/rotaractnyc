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

      {/* Joining Our Club */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink text-center">Joining Our Club</h2>
            <div className="bg-white p-8 rounded-lg shadow-md mb-8">
              <p className="text-lg text-gray-700 mb-6">
                Please fill out this Google form if you wish to become a member of the Rotaract Club at the United Nations:
              </p>
              <a
                href="#"
                className="inline-block bg-rotaract-pink text-white font-semibold px-8 py-3 rounded-full hover:bg-rotaract-darkpink transition-all"
              >
                Membership Form
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements for Membership Eligibility */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink text-center">Requirements for Membership Eligibility</h2>
            <div className="bg-gray-50 p-8 rounded-lg shadow-md">
              <p className="text-lg text-gray-700 mb-6">
                Prospective members must complete the following requirements to be eligible for induction into the club. All requirements must occur within the same Rotaract Year (July 1st through June 30th).
              </p>
              <ul className="space-y-4 text-lg text-gray-700">
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span>Attend at least <strong>2 general meetings</strong></span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span>Attend at least <strong>1 rotary or rotaract service event</strong></span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span>Attend at least <strong>1 rotaract social event</strong></span>
                </li>
                <li className="flex items-start">
                  <FaCheckCircle className="text-rotaract-pink text-xl mr-3 mt-1 flex-shrink-0" />
                  <span><strong>Pay annual membership dues</strong> (see below)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Dues */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink text-center">Membership Dues</h2>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <p className="text-lg text-gray-700 mb-6">
                Dues are paid on an annual basis. All dues are required to be paid upon a new member&apos;s induction to the club and then annually from that point forward.
              </p>
              
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">We have three different types of membership:</h3>
                <ul className="space-y-3 text-lg text-gray-700 ml-6">
                  <li className="list-disc">Professional Membership</li>
                  <li className="list-disc">Student Membership</li>
                </ul>
              </div>

              <p className="text-gray-700 mb-8">
                You may continue as a member of the Rotaract Club at the United Nations after you leave if you continue to pay your annual dues.
              </p>

              <div className="border-t pt-6">
                <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">Looking to pay your dues?</h3>
                <p className="text-gray-700 mb-4">Our preferred methods of payments are listed below:</p>
                
                <div className="bg-gray-50 p-6 rounded-lg mb-4">
                  <p className="text-lg font-semibold text-rotaract-darkpink mb-2">Venmo:</p>
                  <p className="text-gray-700">Rotaract-AtTheUnitedNations</p>
                </div>

                <p className="text-gray-600 text-sm">
                  If you have any questions about paying dues please email{' '}
                  <a 
                    href="mailto:TreasurerRCUN@gmail.com" 
                    className="text-rotaract-pink hover:text-rotaract-darkpink font-semibold"
                  >
                    TreasurerRCUN@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
