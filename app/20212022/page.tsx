'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Archive20212022Page() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const images = [
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676570877-CJ196D37IYGDUST4QO9U/0e56d05d-5a4f-41c2-8eb5-68e3026a6ca6.JPG',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676570630-T5IMM8NJBI5JS7GU7C82/0b10ca2b-e59d-421b-aa39-52fc17a4e40e+2.JPG',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676571223-AJD981U9XX1186UJX334/1db9f1e8-ba5f-44ad-a001-f55f2fa45eac.JPG',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676571822-9RWBNU6IO19UQINP43CI/1f63b5f3-e83d-4a86-aede-10214c972f99.JPG',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676572238-16SRMPDXLQ1CC8JCUSGD/2cd00068-4d52-4ee2-b2cd-7092f4d8ef9c.JPG',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676572549-U0PQHTJF8VAAQGZZ4E85/4f601cf2-0db9-49eb-b320-ac687f6cbbc4.JPG',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676572823-QRIDQXD5EWG2YZ3KSX4O/5b7a9912-de30-470e-a1c3-51b1087bea48.JPG',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676593499-KSB80O7HAC4T243W3RAL/IMG_0335+2.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676599071-6SDRWH0N3WQHSTEEDZA2/IMG_2738.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676602695-MYTJ0RZV0UMF8GSF7UAD/IMG_2747.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676606498-GFV6FY8GXOI8RUG99RH4/IMG_2812.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676612032-N34XLTK0O6P1RDZCT8YH/IMG_2818.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676614363-PRVZ2LXBIB13AJVJ3K2L/IMG_2819.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676622320-20Y7XMY824FBI89CBT17/IMG_5231.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676622239-U3J915YUIESX4PQBP66M/IMG_5233.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676630736-6OFJZCMIAAWRV9RORY2T/IMG_5672.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676631688-YVCPI2JYI3ZCE4ID8S95/IMG_5673.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676639304-QYYHRL5CL0GZVGCUQP6F/IMG_5674.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676640353-2R1Z8GRGB8PQ2CIVETOZ/IMG_5675.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676647407-20F1H0KKYQZSGPZJ23MN/IMG_5677.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676648614-WIO2H09MX13U04LX1U1T/IMG_5679.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676653694-M7T4AHVEF9D22XHWVDFI/IMG_5680.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676657597-RTVSN7IZ56KN88PHXY6L/IMG_5683.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676659243-5S26YFFUFS50KTS5AAK3/IMG_5685.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676664774-UJLTXJZYT01YTG1NV6NJ/IMG_5686.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676667278-7NG0DT6Z6HCKSPD2FRZU/IMG_5691+2.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676673772-34GAM33YQ7I3XSVBJQS0/IMG_5693.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655676680992-8VZ7CBY9IV23H995G6CJ/IMG_5700.JPG',
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-14 overflow-hidden bg-white">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-rotaract-pink/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[640px] w-[640px] rounded-full bg-rotaract-darkpink/10 blur-3xl" />

        <div className="container mx-auto px-4 relative max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-rotaract-darkpink tracking-tight">2021-2022</h1>
            <p className="mt-4 text-lg text-gray-700 leading-relaxed max-w-3xl">
              A memorable year of service, fellowship, and impact. Browse through our photo gallery showcasing events, meetings, and community service projects from throughout the year.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/20212022-annual-reception"
                className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
              >
                View Annual Reception
              </Link>
              <Link
                href="/gallery"
                className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
              >
                Browse All Galleries
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="relative aspect-square">
                    <img
                      src={image}
                      alt={`2021-2022 event ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-rotaract-darkpink/0 group-hover:bg-rotaract-darkpink/20 transition-colors duration-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-4xl hover:text-rotaract-pink"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
