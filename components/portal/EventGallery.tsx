'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { GalleryImage } from '@/types';
import { uploadFile } from '@/lib/firebase/upload';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import GalleryLightbox from './GalleryLightbox';

interface EventGalleryProps {
  eventId: string;
  eventTitle: string;
  canUpload?: boolean;
}

export default function EventGallery({ eventId, eventTitle, canUpload = false }: EventGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ------------------------------------------------------------------
  // Fetch gallery images for this event
  // ------------------------------------------------------------------
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/portal/gallery?eventId=${encodeURIComponent(eventId)}`);
      if (!res.ok) throw new Error('Failed to fetch gallery');
      const data: GalleryImage[] = await res.json();
      setImages(data);
    } catch (err) {
      console.error('Error fetching event gallery:', err);
      setError('Could not load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // ------------------------------------------------------------------
  // Handle file selection & upload
  // ------------------------------------------------------------------
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    setUploading(true);
    setUploadCount({ done: 0, total: fileList.length });
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const result = await uploadFile(fileList[i], 'gallery', eventId, (pct) => {
          // Weighted progress across all files
          const base = (i / fileList.length) * 100;
          const filePortion = pct / fileList.length;
          setUploadProgress(Math.round(base + filePortion));
        });
        uploadedUrls.push(result.url);
        setUploadCount((prev) => ({ ...prev, done: prev.done + 1 }));
      }

      // Register in Firestore via our API
      const res = await fetch('/api/portal/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: uploadedUrls,
          eventId,
          eventTitle,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save photos');
      }

      // Refresh gallery
      await fetchImages();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadCount({ done: 0, total: 0 });
      // Reset file input so the same files can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Photos
          {images.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({images.length})</span>
          )}
        </h3>

        {canUpload && (
          <div className="flex items-center gap-3">
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size="sm" />
                <span>
                  Uploading {uploadCount.done}/{uploadCount.total} ({uploadProgress}%)
                </span>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Photos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
              disabled={uploading}
            />
          </div>
        )}
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-2 rounded-full bg-cranberry transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 py-16 dark:border-gray-700">
          <svg
            className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No photos yet</p>
          {canUpload && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Click &quot;Add Photos&quot; to upload event photos
            </p>
          )}
        </div>
      )}

      {/* Photo grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cranberry focus-visible:ring-offset-2"
            >
              <Image
                src={img.url}
                alt={img.caption || `Photo from ${eventTitle}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="truncate text-xs font-medium text-white">{img.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <GalleryLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
