'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

type CarouselImage = {
  src: string
  alt: string
}

export function HeroCarousel({
  images,
  intervalMs = 4500,
  variant = 'card',
}: {
  images: CarouselImage[]
  intervalMs?: number
  variant?: 'card' | 'background'
}) {
  const safeImages = useMemo(() => images.filter((img) => Boolean(img?.src)), [images])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (safeImages.length <= 1) return

    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeImages.length)
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [intervalMs, safeImages.length])

  if (safeImages.length === 0) return null

  if (variant === 'background') {
    return (
      <div className="absolute inset-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <Image
              src={safeImages[activeIndex].src}
              alt={safeImages[activeIndex].alt}
              fill
              sizes="100vw"
              className="object-cover"
              priority={activeIndex === 0}
            />
          </motion.div>
        </AnimatePresence>

        {safeImages.length > 1 && (
          <div className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-2">
            {safeImages.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show slide ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={
                  'h-2.5 w-2.5 rounded-full transition-colors ' +
                  (index === activeIndex
                    ? 'bg-white'
                    : 'bg-white/40 hover:bg-white/70')
                }
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-sm">
        <div className="relative aspect-[16/9] w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <Image
                src={safeImages[activeIndex].src}
                alt={safeImages[activeIndex].alt}
                fill
                sizes="(max-width: 768px) 100vw, 900px"
                className="object-cover"
                priority={activeIndex === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
            </motion.div>
          </AnimatePresence>
        </div>

        {safeImages.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
            {safeImages.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show slide ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={
                  "h-2.5 w-2.5 rounded-full transition-colors " +
                  (index === activeIndex ? "bg-primary" : "bg-primary/30 hover:bg-primary/60")
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
