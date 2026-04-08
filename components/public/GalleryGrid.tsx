'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import type { GalleryImage } from '@/types';

interface GalleryGridProps {
  images: GalleryImage[];
  className?: string;
}

export default function GalleryGrid({ images, className }: GalleryGridProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  return (
    <>
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3', className)}>
        {images.map((image) => (
          <button
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cranberry-500 focus:ring-offset-2"
          >
            <Image
              src={image.url}
              alt={image.caption || 'Gallery image'}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {image.caption && (
                <p className="text-sm font-medium text-white line-clamp-1">{image.caption}</p>
              )}
              {image.event && (
                <p className="text-xs text-white/70 mt-0.5">{image.event}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <svg aria-hidden="true" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage.url}
              alt={selectedImage.caption || 'Gallery image'}
              width={1200}
              height={800}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="max-w-full max-h-[80vh] rounded-xl object-contain"
            />
            {(selectedImage.caption || selectedImage.event) && (
              <div className="mt-3 text-center">
                {selectedImage.caption && (
                  <p className="text-white font-medium">{selectedImage.caption}</p>
                )}
                {selectedImage.event && (
                  <p className="text-white/60 text-sm mt-1">{selectedImage.event}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
