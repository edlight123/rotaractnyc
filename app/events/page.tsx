'use client'

import { motion } from 'framer-motion'
import { FaCalendar, FaMapMarkerAlt, FaClock } from 'react-icons/fa'
import Link from 'next/link'

export default function EventsPage() {
  const upcomingEvents = [
    {
      title: 'Monthly General Meeting',
      date: 'Every 2nd Thursday',
      time: '7:00 PM - 9:00 PM',
      location: 'Manhattan, NY',
      description: 'Join us for our regular meeting to discuss club business, upcoming projects, and network with fellow members.'
    },
    {
      title: 'Community Service Day',
      date: 'TBD',
      time: 'All Day',
      location: 'Various Locations',
      description: 'Participate in hands-on service projects that make a real difference in our community.'
    },
    {
      title: 'Networking Social',
      date: 'Monthly',
      time: '6:00 PM - 8:00 PM',
      location: 'TBD',
      description: 'Casual networking event for members to connect and build professional relationships.'
    },
  ]

  const pastEvents = [
    {
      title: 'Holiday Charity Drive',
      date: 'December 2023',
      description: 'Collected donations for local families in need during the holiday season.'
    },
    {
      title: 'UN Youth Summit',
      date: 'November 2023',
      description: 'Attended special summit at the United Nations focusing on youth leadership and global issues.'
    },
    {
      title: 'Central Park Cleanup',
      date: 'October 2023',
      description: 'Environmental service project cleaning and maintaining Central Park trails.'
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
            <div className="mx-auto mb-5 inline-flex items-center rounded-full border border-rotaract-pink/20 bg-white px-4 py-1 text-sm text-rotaract-darkpink shadow-sm">
              Events
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Events</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Join us for meetings, service projects, and social events throughout the year
            </p>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Upcoming Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow"
              >
                <h3 className="text-xl font-bold mb-4 text-rotaract-darkpink">{event.title}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <FaCalendar className="text-rotaract-pink mr-2" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FaClock className="text-rotaract-pink mr-2" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FaMapMarkerAlt className="text-rotaract-pink mr-2" />
                    <span>{event.location}</span>
                  </div>
                </div>
                <p className="text-gray-700">{event.description}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/events/meetings"
              className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
            >
              View Meeting Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* Past Events */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-rotaract-darkpink text-center">Past Events</h2>
          <div className="max-w-4xl mx-auto space-y-6">
            {pastEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">{event.title}</h3>
                    <p className="text-gray-700">{event.description}</p>
                  </div>
                  <div className="flex items-center text-gray-600 ml-4">
                    <FaCalendar className="text-rotaract-pink mr-2" />
                    <span className="whitespace-nowrap">{event.date}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Stay Updated</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter to receive updates about upcoming events
          </p>
          <a
            href="/contact/newsletter"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Subscribe Now
          </a>
        </div>
      </section>
    </div>
  )
}
