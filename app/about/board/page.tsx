'use client'

import { motion } from 'framer-motion'
import { FaUserTie } from 'react-icons/fa'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BOARD_MEMBERS } from '@/lib/content/members'
import Image from 'next/image'

type MemberRow = {
  id: string
  title: string
  name: string
  role: string
  photoUrl?: string
  order: number
}

export default function BoardPage() {
  const [boardMembers, setBoardMembers] = useState<MemberRow[]>(
    DEFAULT_BOARD_MEMBERS.map((m) => ({
      id: m.id,
      title: m.title,
      name: m.name,
      role: m.role,
      photoUrl: m.photoUrl,
      order: m.order,
    }))
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch('/api/public/members?group=board')
        if (!res.ok) return

        const json: unknown = await res.json()
        const rows =
          typeof json === 'object' &&
          json &&
          Array.isArray((json as { members?: unknown }).members)
            ? ((json as { members: unknown[] }).members as unknown[])
            : []

        const mapped = rows
          .map((m): MemberRow => {
            const obj = typeof m === 'object' && m ? (m as Record<string, unknown>) : {}
            const order = Number(obj.order)
            return {
              id: String(obj.id ?? ''),
              title: String(obj.title ?? ''),
              name: String(obj.name ?? ''),
              role: String(obj.role ?? ''),
              photoUrl: String(obj.photoUrl ?? '') || undefined,
              order: Number.isFinite(order) ? order : 1,
            }
          })
          .filter((m) => m.id && m.title && m.name)

        if (!cancelled && mapped.length > 0) {
          setBoardMembers(mapped)
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

  const sorted = useMemo(() => [...boardMembers].sort((a, b) => a.order - b.order), [boardMembers])

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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-rotaract-darkpink tracking-tight">Board of Directors</h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-gray-700">
              Meet the dedicated leaders guiding our club&apos;s mission and activities
            </p>
          </motion.div>
        </div>
      </section>

      {/* Board Members */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {sorted.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow"
              >
                <div className="bg-rotaract-pink/10 border border-rotaract-pink/15 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  {member.photoUrl ? (
                    <Image
                      src={member.photoUrl}
                      alt={member.name}
                      width={96}
                      height={96}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <FaUserTie className="text-4xl text-rotaract-darkpink" />
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2 text-rotaract-darkpink">{member.title}</h3>
                <p className="text-gray-600 mb-3">{member.name}</p>
                <p className="text-sm text-gray-700">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Message from Board */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8 text-rotaract-darkpink">Our Commitment</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                As your board of directors, we are committed to providing meaningful opportunities for service, professional development, and fellowship. We strive to create an inclusive environment where every member can grow as a leader and make a positive impact.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We welcome your ideas, feedback, and participation. Together, we can continue to build a stronger club and community.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Interested in Leadership?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Board positions are elected annually. Get involved and make your voice heard!
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  )
}
