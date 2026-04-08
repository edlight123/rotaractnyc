import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAlbumBySlug, getAlbumPhotos } from '@/lib/firebase/queries';
import { formatDate } from '@/lib/utils/format';
import { SITE } from '@/lib/constants';
import AlbumPreviewGrid from '@/components/public/AlbumPreviewGrid';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);
  if (!album) return {};
  return {
    title: `${album.title} | Gallery | ${SITE.shortName}`,
    description: album.description || `Browse photos from ${album.title}`,
    openGraph: {
      title: `${album.title} — ${SITE.shortName} Gallery`,
      description: album.description || `Browse photos from ${album.title}`,
      url: `${SITE.url}/gallery/${slug}`,
      ...(album.coverPhotoUrl && { images: [{ url: album.coverPhotoUrl }] }),
    },
    alternates: { canonical: `${SITE.url}/gallery/${slug}` },
  };
}

export default async function AlbumDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);

  if (!album) notFound();

  // Fetch preview photos (limited)
  const previewPhotos = await getAlbumPhotos(album.id, album.publicPreviewCount || 6);
  const remainingCount = Math.max(0, album.photoCount - previewPhotos.length);

  return (
    <>
      {/* Hero */}
      <section className="relative py-28 sm:py-36 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        {album.coverPhotoUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={album.coverPhotoUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-gray-900/40" />
          </>
        )}
        <div className="container-page relative z-10">
          <Link href="/gallery" className="inline-flex items-center gap-1 text-gray-300 hover:text-white text-sm mb-6 transition-colors">
            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Gallery
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold">{album.title}</h1>
          <div className="flex items-center gap-3 mt-4 text-gray-300 text-sm">
            <span>{formatDate(album.date)}</span>
            <span>·</span>
            <span>{album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}</span>
          </div>
          {album.description && (
            <p className="mt-4 text-gray-300 max-w-2xl text-lg">{album.description}</p>
          )}
        </div>
      </section>

      {/* Photos */}
      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <AlbumPreviewGrid
            photos={previewPhotos}
            totalCount={album.photoCount}
            remainingCount={remainingCount}
            albumSlug={album.slug}
          />
        </div>
      </section>
    </>
  );
}
