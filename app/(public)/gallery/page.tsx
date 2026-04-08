import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import HeroSection from '@/components/public/HeroSection';
import { generateMeta } from '@/lib/seo';
import { getPublicAlbums } from '@/lib/firebase/queries';
import { formatDate } from '@/lib/utils/format';

export const revalidate = 600;

export const metadata: Metadata = generateMeta({
  title: 'Gallery',
  description: 'Browse photos from Rotaract NYC events, service projects, and fellowship activities.',
  path: '/gallery',
});

const gradients = [
  'from-cranberry-400 to-cranberry-700',
  'from-gold-400 to-amber-700',
  'from-azure-400 to-blue-700',
  'from-emerald-400 to-emerald-700',
  'from-purple-400 to-purple-700',
];

export default async function GalleryPage() {
  const albums = await getPublicAlbums();

  return (
    <>
      <HeroSection title="Gallery" subtitle="Moments from our events, service projects, and fellowship gatherings." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          {albums.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">📷</p>
              <p className="text-gray-500 dark:text-gray-400 text-lg">Photos coming soon!</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Check back after our next event.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album, i) => (
                <Link
                  key={album.id}
                  href={`/gallery/${album.slug}`}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all duration-300"
                >
                  {/* Cover image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {album.coverPhotoUrl ? (
                      <Image
                        src={album.coverPhotoUrl}
                        alt={album.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center`}>
                        <span className="text-5xl opacity-50">📸</span>
                      </div>
                    )}
                    {/* Photo count badge */}
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Info */}
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

          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Members can view full albums with all photos in the member portal.
            </p>
            <Link href="/portal/login" className="btn-sm btn-outline">
              Member Login
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
