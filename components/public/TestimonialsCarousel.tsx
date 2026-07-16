'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Testimonial } from '@/types';

/**
 * Auto-rotating testimonials carousel.
 * One quote spotlighted at a time; auto-advances (~6s), pauses on hover/focus,
 * and honors prefers-reduced-motion. Arrows + dots for manual control.
 */
export default function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = testimonials.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  // Respect reduced-motion for the auto-advance timer
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }, []);

  useEffect(() => {
    if (count <= 1 || paused || reduced.current) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const active = testimonials[index];

  return (
    <div
      className="relative max-w-3xl mx-auto text-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Member testimonials"
    >
      <svg aria-hidden="true" className="w-12 h-12 text-cranberry-200 dark:text-cranberry-800 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
      </svg>

      {/* Quote — keyed so it re-triggers the fade on change */}
      <div key={index} className="motion-safe:animate-[fadeIn_0.5s_ease] min-h-[7rem] flex flex-col justify-center" aria-live="polite">
        <blockquote className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed font-medium italic text-balance">
          &ldquo;{active.quote}&rdquo;
        </blockquote>
        <div className="mt-6">
          <p className="font-semibold text-gray-900 dark:text-white">{active.name}</p>
          <p className="text-sm text-gray-500">{active.title}</p>
        </div>
      </div>

      {count > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous testimonial"
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-cranberry hover:border-cranberry-300 dark:hover:border-cranberry-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cranberry-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <div className="flex items-center gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.name + i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-cranberry' : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next testimonial"
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-cranberry hover:border-cranberry-300 dark:hover:border-cranberry-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cranberry-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
