'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function AnnualReception20212022Page() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const images = [
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677040151-3YKTTX0LH7CIEZWRBT0G/IMG_3964.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677040145-BKTHZK4MYZGX5IJAD1I7/IMG_3963.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677043183-4Q07LHU6R0LPOIRCLVFX/IMG_3974.HEIC.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677043020-WAXTL2XWIREN7WVKFKH0/IMG_3990.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677045838-3JK0L6ZSQEEUGOFA4KGE/IMG_3986.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677046704-VYZEIEGUKQKIRUTY8FJ8/IMG_3984.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677047085-LLGL6OMEEHSHH18M85A7/IMG_3982.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677048477-STC8YGIMXQISUAG5JYH8/IMG_3981.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677066325-UA0RD5N15KE9572Q4O3A/DSC08696-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677074921-ITT779AZR399XALH7YPV/DSC08332-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677087156-JJWRX7DK9P5CJFEY0RYW/DSC08336-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677087030-8TK8ROZST72P8364QH0H/DSC08339-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677110833-8YLACIGULORI1QW06G1V/DSC08347.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677110339-LF4Z6JEEAFQ0GE3LA7A0/DSC08356.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677118690-BGFRNXAGGQG4APK7FT6V/DSC08358-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677141599-MPQH90P2H9IXLT5NM8SS/DSC08367-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677143652-FVTW5W4CL7KVGWM1ECDU/DSC08371-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677160754-UJI8TX3W1GNBEETZD2QN/DSC08391-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677154854-JZVYOUX1R23PNPX70RDI/DSC08402-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677182681-GR3UBEO4KQGBYL0Y238Y/DSC08480-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677177917-KZLOANXW8OXVHQPSOVTO/DSC08484-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677190712-YFPGOCENG5JZFELOOOU3/DSC08491-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677209645-KDVO29VS9N5VXHWK1B3D/DSC08504-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677209236-93RHYQ05FI92U4NC5Q2K/DSC08514-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677227845-UHH3WLZ472U36SFKVES8/DSC08521-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677228582-R890SUWNX10NJ7I8IBO3/DSC08531-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677262124-IQMTNBXMEIND603B50CP/DSC08540-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677262534-3RW33N9Q8P330NC22XKO/DSC08546-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677287036-VVU933HLQU6GK148AA02/DSC08549-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677287904-ALOLWPPMB6K0P32Z9L62/DSC08557-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677307433-LU1SM2KXKBQ9Z6T8JYR5/DSC08580-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677306894-A15GIAEXU52RCZ1F35WE/DSC08583-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677327635-VZ7R0344N4LD3QJA008X/DSC08602-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677327524-TM3W1496S6Y0P6DSTKLU/DSC08620-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677341522-QDJ8S18KPWJ0U1L838PI/DSC08635-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677347377-6NNWWPY40UKMH4D346UE/DSC08628-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677362369-BBC062C0963XGEOOW106/DSC08673-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677367124-MI0T9E4WAZ7HRNFZRI1R/DSC08683-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677372160-7J9E7BXTLJTQ0GCCOZT4/DSC08704-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677390242-2UFGT5LRPMUKRLCQHRZ6/DSC08710-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677395539-UFCEO5R70HYMVGAX6Z2D/DSC08733-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677427422-MHRF25U5B2IE4GH7QP7M/DSC08747-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677430117-AI83Q51E0PW02S35QOKG/DSC08754-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677458685-YDH7MFECUAEB45P6IMKH/DSC08756-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677447986-7VZIM3LLHMPS1Z7EX62Y/DSC08768-Edit.jpg',
    'https://images.squarespace-cdn.com/content/v1/522b9b7ce4b09d456b07da05/1655677487090-IQPYQBBAAX2K8RDH7KY1/DSC08775-Edit.jpg',
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
            <h1 className="text-4xl md:text-5xl font-bold text-rotaract-darkpink tracking-tight">
              2021-2022 Annual Reception
            </h1>
            <p className="mt-4 text-lg text-gray-700 leading-relaxed max-w-3xl">
              A special evening celebrating the year&apos;s achievements, recognizing our members, partners, and supporters who made our service and fellowship possible.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/20212022"
                className="inline-flex justify-center rounded-lg border border-rotaract-pink/30 bg-white px-6 py-3 font-semibold text-rotaract-pink hover:bg-rotaract-pink/5 transition-colors"
              >
                View 2021-2022 Gallery
              </Link>
              <Link
                href="/events"
                className="inline-flex justify-center rounded-lg bg-rotaract-pink px-6 py-3 font-semibold text-white hover:bg-rotaract-darkpink transition-colors"
              >
                Upcoming Events
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
                      alt={`Annual reception ${index + 1}`}
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
