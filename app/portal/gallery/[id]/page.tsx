'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';
import GalleryLightbox from '@/components/portal/GalleryLightbox';
import type { GalleryImage } from '@/types';

export default function PortalAlbumPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { member, loading: authLoading } = useAuth();
  const [album, setAlbum] = useState<any>(null);
  const [photos, setPhotos] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const fetchAlbumData = useCallback(async () => {
    try {
      const [albumsRes, photosRes] = await Promise.all([
        fetch('/api/portal/albums'),
        fetch(`/api/portal/albums/${id}/photos`),
      ]);

      if (albumsRes.ok) {
        const albumsList = await albumsRes.json();
        setAlbum(albumsList.find((a: any) => a.id === id) || null);
      }

      if (photosRes.ok) {
        const data = await photosRes.json();
        setPhotos(data.photos || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && member) fetchAlbumData();
  }, [authLoading, member, fetchAlbumData]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-gray-500 dark:text-gray-400 text-lg">Album not found</p>
        <button
          onClick={() => router.push('/portal/gallery')}
          className="mt-4 btn-sm btn-outline"
        >
          Back to Gallery
        </button>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/portal/gallery')}
          className="group text-sm text-gray-500 hover:text-cranberry mb-4 flex items-center gap-1.5 transition-colors"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Gallery
        </button>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">
          {album.title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </p>
        {album.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">{album.description}</p>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-2xl">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-gray-500 dark:text-gray-400">No photos in this album yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-sm font-medium text-white line-clamp-1">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex >= 0 && (
        <GalleryLightbox
          images={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  );
}
