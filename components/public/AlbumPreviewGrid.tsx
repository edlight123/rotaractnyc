'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { GalleryImage } from '@/types';

interface AlbumPreviewGridProps {
  photos: GalleryImage[];
  totalCount: number;
  remainingCount: number;
  albumSlug: string;
}

export default function AlbumPreviewGrid({ photos, totalCount, remainingCount, albumSlug }: AlbumPreviewGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📷</p>
        <p className="text-gray-500 dark:text-gray-400">No photos in this album yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cranberry focus:ring-offset-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.caption || 'Photo'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm font-medium text-white line-clamp-1">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Sign-in gate for remaining photos */}
      {remainingCount > 0 && (
        <div className="relative mt-4">
          {/* Blurred placeholder grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: Math.min(remainingCount, 3) }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-800 blur-sm" />
            ))}
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm rounded-2xl">
            <div className="text-center px-6">
              <div className="w-14 h-14 rounded-full bg-cranberry-100 dark:bg-cranberry-900/30 flex items-center justify-center mx-auto mb-4">
                <svg aria-hidden="true" className="w-7 h-7 text-cranberry" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="text-lg font-display font-bold text-gray-900 dark:text-white mb-1">
                +{remainingCount} more photo{remainingCount !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">
                Sign in to your member account to view the full album.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/portal/login" className="btn-sm btn-primary">
                  Sign In to View All
                </Link>
                <Link href="/membership" className="btn-sm btn-outline">
                  Become a Member
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for preview photos */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Previous"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next */}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Next"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption || 'Photo'}
              className="max-w-full max-h-[85vh] rounded-xl object-contain mx-auto"
            />
            {photos[lightboxIndex].caption && (
              <p className="text-center text-white/80 text-sm mt-3">{photos[lightboxIndex].caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
