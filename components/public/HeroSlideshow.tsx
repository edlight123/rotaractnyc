'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const FALLBACK_IMAGES = [
  '/hero-1.jpg',
  '/hero-2.jpg',
  '/hero-3.jpg',
  '/hero-4.jpg',
];

interface HeroSlideshowProps {
  /** URLs coming from Firestore. Falls back to local placeholders if empty. */
  slides?: { id: string; url: string }[];
}

export default function HeroSlideshow({ slides }: HeroSlideshowProps) {
  const hasRemote = slides && slides.length > 0;
  const images = hasRemote ? slides.map((s) => s.url) : FALLBACK_IMAGES;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => {
        // Only render the current, previous, and next slides to avoid loading all images
        const isActive = i === currentIndex;
        const isNext = i === (currentIndex + 1) % images.length;
        const isPrev = i === (currentIndex - 1 + images.length) % images.length;
        if (!isActive && !isNext && !isPrev) return null;

        return hasRemote ? (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="100vw"
            className={`object-cover transition-opacity duration-1000 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
            priority={i === 0}
          />
        ) : (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            className={`object-cover transition-opacity duration-1000 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
            priority={i === 0}
            sizes="100vw"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        );
      })}
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
    </div>
  );
}
