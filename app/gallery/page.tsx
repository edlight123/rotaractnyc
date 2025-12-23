'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export default function GalleryPage() {
  const images = [
    {
      src: '/53cde13b1a312d32c08a429715695a65.jpg',
      alt: 'Rotaract NYC members at community service event',
      title: 'Community Service'
    },
    {
      src: '/b220fe440206d474a74b2a2467d410ac.jpg',
      alt: 'Rotaract NYC networking event',
      title: 'Networking Event'
    },
    {
      src: '/ce9ea973f79cb6988ad3e2945e3a87ae.jpg',
      alt: 'Rotaract NYC team building activity',
      title: 'Team Building'
    },
    {
      src: '/f16b74a04b626f30222c37c4d15d7c80.jpg',
      alt: 'Rotaract NYC social gathering',
      title: 'Social Gathering'
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-rotaract-pink to-rotaract-darkpink text-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold mb-6">Gallery</h1>
            <p className="text-xl max-w-3xl mx-auto">
              Moments from our events, service projects, and social gatherings
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {images.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-shadow"
              >
                <div className="relative h-80">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-rotaract-darkpink/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <div className="p-6 text-white">
                      <h3 className="text-xl font-bold">{image.title}</h3>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Gallery Sections */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">More Photos Coming Soon</h2>
            <p className="text-lg text-gray-700 mb-8">
              We're constantly updating our gallery with new photos from our events and activities. Follow us on social media to see the latest updates!
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="https://www.facebook.com/rotaractnewyorkcity/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-rotaract-pink font-semibold px-6 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
              >
                Facebook
              </a>
              <a
                href="http://instagram.com/rotaractnyc"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-rotaract-pink font-semibold px-6 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-rotaract-darkpink">Want to Be in Our Next Photo?</h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Join us at our next event and become part of our story
          </p>
          <a
            href="/events"
            className="inline-block bg-white text-rotaract-pink font-semibold px-8 py-3 rounded-full border-2 border-rotaract-pink hover:bg-rotaract-pink hover:text-white transition-all"
          >
            View Upcoming Events
          </a>
        </div>
      </section>
    </div>
  )
}
