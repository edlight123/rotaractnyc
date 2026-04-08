'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils/format';

const gradients = [
  'from-cranberry-400 to-cranberry-700',
  'from-gold-400 to-amber-700',
  'from-azure-400 to-blue-700',
  'from-emerald-400 to-emerald-700',
  'from-purple-400 to-purple-700',
];

export default function PortalGalleryPage() {
  const { member, loading: authLoading } = useAuth();
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlbums = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/albums');
      if (!res.ok) throw new Error();
      setAlbums(await res.json());
    } catch {
      // silently fail — albums just won't show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && member) fetchAlbums();
  }, [authLoading, member, fetchAlbums]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">
            📸 Photo Gallery
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Browse photos from our events and activities
          </p>
        </div>
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-2xl">
          <p className="text-5xl mb-4">📷</p>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No albums yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Check back after our next event!
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album: any, i: number) => (
            <Link
              key={album.id}
              href={`/portal/gallery/${album.id}`}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {album.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.coverPhotoUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center`}
                  >
                    <span className="text-5xl opacity-50">📸</span>
                  </div>
                )}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {album.photoCount || 0} photo{(album.photoCount || 0) !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display font-bold text-gray-900 dark:text-white group-hover:text-cranberry transition-colors text-lg">
                  {album.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(album.date)}
                </p>
                {album.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                    {album.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
