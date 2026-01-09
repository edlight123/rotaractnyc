'use client'

import { motion } from 'framer-motion'
import { FaCalendar, FaMapMarkerAlt, FaClock } from 'react-icons/fa'
import Link from 'next/link'
import { DEFAULT_EVENTS, type EventCategory, type SiteEvent } from '@/lib/content/events'
import { useEffect, useState } from 'react'

type EventsResponseRow = Record<string, unknown>

export default function EventsPage() {
  const [events, setEvents] = useState<SiteEvent[]>(DEFAULT_EVENTS)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/events')
        if (!res.ok) return
        const json: unknown = await res.json()
        const rows =
          typeof json === 'object' &&
          json &&
          Array.isArray((json as { events?: unknown }).events)
            ? ((json as { events: unknown[] }).events as unknown[])
            : []

        if (!cancelled && rows.length > 0) {
          setEvents(
            rows
              .map((e): SiteEvent => {
                const obj: EventsResponseRow = typeof e === 'object' && e ? (e as EventsResponseRow) : {}
                const order = Number(obj.order)
                const category: EventCategory = obj.category === 'past' ? 'past' : 'upcoming'
                return {
                  id: String(obj.id ?? ''),
                  category,
                  title: String(obj.title ?? ''),
                  date: String(obj.date ?? ''),
                  time: obj.time ? String(obj.time) : '',
                  location: obj.location ? String(obj.location) : '',
                  description: String(obj.description ?? ''),
                  order: Number.isFinite(order) ? order : 1,
                }
              })
              .filter((e) => e.id)
          )
        }
      } catch {
        // ignore and keep defaults
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const upcomingEvents = events.filter((e) => e.category === 'upcoming').sort(
    (a, b) => a.order - b.order
  )

  const pastEvents = events.filter((e) => e.category === 'past').sort(
    (a, b) => a.order - b.order
  )

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
                  {event.time ? (
                    <div className="flex items-center text-gray-600">
                      <FaClock className="text-rotaract-pink mr-2" />
                      <span>{event.time}</span>
                    </div>
                  ) : null}
                  {event.location ? (
                    <div className="flex items-center text-gray-600">
                      <FaMapMarkerAlt className="text-rotaract-pink mr-2" />
                      <span>{event.location}</span>
                    </div>
                  ) : null}
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
