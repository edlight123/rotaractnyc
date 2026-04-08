'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { GalleryImage } from '@/types';

interface MostLikedCarouselProps {
  photos: GalleryImage[];
  /** Pass true once any photo has at least one like; controls the CTA copy. */
  hasLikes?: boolean;
}

export default function MostLikedCarousel({ photos, hasLikes = false }: MostLikedCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = photos.length;

  const goTo = useCallback(
    (index: number) => {
      const next = (index + count) % count;
      setActiveIndex(next);
      trackRef.current?.children[next]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    },
    [count],
  );

  const advance = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);

  // Auto-advance every 4 seconds when not paused
  useEffect(() => {
    if (isPaused || count <= 1) return;
    intervalRef.current = setInterval(advance, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [advance, isPaused, count]);

  if (count === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Scrollable photo track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => goTo(i)}
            className={`group relative flex-none w-72 sm:w-80 aspect-[4/3] rounded-2xl overflow-hidden snap-center transition-all duration-300 focus:outline-none ${
              i === activeIndex
                ? 'ring-2 ring-cranberry ring-offset-2 ring-offset-transparent scale-[1.02]'
                : 'opacity-80 hover:opacity-100'
            }`}
            aria-label={`View photo ${i + 1} of ${count}`}
          >
            <Image
              src={photo.url}
              alt={photo.caption || 'Community favourite'}
              fill
              sizes="(max-width: 640px) 288px, 320px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Like badge — bottom left */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <svg
                className="h-3.5 w-3.5 text-cranberry"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {photo.likes ?? 0}
            </div>

            {/* Caption — bottom right */}
            {photo.caption && (
              <p className="absolute bottom-3 right-3 left-16 text-xs text-gray-300 line-clamp-1 text-right">
                {photo.caption}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="mt-5 flex justify-center gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-6 h-2 bg-cranberry'
                  : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* View gallery CTA */}
      <div className="mt-6 text-center">
        <Link
          href="/gallery"
          className="btn-sm btn-outline"
        >
          View Full Gallery →
        </Link>
      </div>
    </div>
  );
}
