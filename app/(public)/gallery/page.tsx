import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import { generateMeta } from '@/lib/seo';
import { getGalleryImages } from '@/lib/firebase/queries';

export const revalidate = 600;

export const metadata: Metadata = generateMeta({
  title: 'Gallery',
  description: 'Browse photos from Rotaract NYC events, service projects, and fellowship activities.',
  path: '/gallery',
});

// Color gradients used when no real image is available
const gradients = [
  'from-cranberry-400 to-cranberry-600',
  'from-gold-400 to-gold-600',
  'from-azure-400 to-azure-600',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
];

export default async function GalleryPage() {
  const images = await getGalleryImages();

  return (
    <>
      <HeroSection title="Gallery" subtitle="Moments from our events, service projects, and fellowship gatherings." size="sm" />

      <section className="section-padding bg-white dark:bg-gray-950">
        <div className="container-page">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, i) => {
              const hasRealImage = img.url && !img.url.includes('placeholder');
              return (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
                >
                  {hasRealImage ? (
                    <Image
                      src={img.url}
                      alt={img.caption || (img.event ? `Photo from ${img.event}` : `Rotaract NYC gallery photo ${i + 1}`)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]}`} />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end p-4">
                    <p className="text-white font-semibold text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      {img.caption || img.event || 'Photo'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Members can view the full gallery with high-resolution photos in the member portal.
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
