'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import Spinner from '@/components/ui/Spinner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeroSlide {
  id: string;
  url: string;
  storagePath: string;
  order: number;
  createdAt: string;
}

interface GalleryImage {
  id: string;
  url: string;
  storagePath?: string;
  caption?: string;
  event?: string;
  createdAt: string;
}

// ─── Section config ───────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: 'hero',
    label: 'Home Page — Hero Carousel',
    icon: '🏠',
    description: 'These photos cycle on the public homepage background. Recommended size: 1920×1080 (landscape). Max 10 MB per image.',
    hint: 'Upload 3–6 high-quality landscape photos.',
  },
  {
    key: 'gallery',
    label: 'Public Gallery',
    icon: '🖼️',
    description: 'Photos shown on the public /gallery page. Square crops look best. Max 10 MB per image.',
    hint: 'You can add an optional caption and event name for each photo.',
  },
  {
    key: 'albums',
    label: 'Photo Albums',
    icon: '📸',
    description: 'Organize photos into albums. Public albums are shown on the /gallery page with a preview — full access requires sign-in.',
    hint: 'Create albums for events and activities, then upload photos to each album.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const { toast } = useToast();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/media?section=hero');
      setSlides(data);
    } catch {
      toast('Failed to load hero slides', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSlides(); }, [fetchSlides]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const err = validateFile(file, { maxSizeMB: 10, allowedTypes: ['image/'] });
      if (err) { toast(err, 'error'); continue; }

      try {
        const { url, path: storagePath } = await uploadFile(
          file, 'site-media', 'hero',
          (pct) => setUploadProgress(Math.round(((i / files.length) + pct / 100 / files.length) * 100)),
        );
        await apiFetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'hero', url, storagePath, order: slides.length + i }),
        });
      } catch (e: unknown) {
        toast(`Failed to upload ${file.name}: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await fetchSlides();
    toast('Hero slide(s) uploaded', 'success');
  };

  const handleDelete = async (slide: HeroSlide) => {
    if (!confirm(`Delete this slide? This cannot be undone.`)) return;
    setDeletingId(slide.id);
    try {
      await apiFetch(`/api/admin/media?id=${slide.id}`, { method: 'DELETE' });
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      toast('Slide deleted', 'success');
    } catch {
      toast('Failed to delete slide', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {slides.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <p className="text-4xl mb-3">📷</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No slides yet. Upload your first photo below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {slides.map((slide, idx) => (
                <div key={slide.id} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(slide)}
                      disabled={deletingId === slide.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {deletingId === slide.id ? <Spinner size="sm" /> : '🗑️'} Delete
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-cranberry text-white rounded-xl text-sm font-semibold hover:bg-cranberry-700 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><Spinner size="sm" /> Uploading… {uploadProgress}%</>
            ) : (
              <>
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Upload Photo{slides.length > 0 ? 's' : ''}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Gallery Section ──────────────────────────────────────────────────────────

function GallerySection() {
  const { toast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingMeta, setPendingMeta] = useState<{ caption: string; event: string }>({ caption: '', event: '' });
  const [showMeta, setShowMeta] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/gallery');
      setImages(data);
    } catch {
      toast('Failed to load gallery', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingFiles(files);
    setPendingMeta({ caption: '', event: '' });
    setShowMeta(true);
  };

  const handleUpload = async () => {
    if (!pendingFiles) return;
    setShowMeta(false);
    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const err = validateFile(file, { maxSizeMB: 10, allowedTypes: ['image/'] });
      if (err) { toast(err, 'error'); continue; }

      try {
        const { url, path: storagePath } = await uploadFile(
          file, 'gallery', undefined,
          (pct) => setUploadProgress(Math.round(((i / pendingFiles.length) + pct / 100 / pendingFiles.length) * 100)),
        );
        await apiFetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, storagePath, caption: pendingMeta.caption, event: pendingMeta.event }),
        });
      } catch (e: unknown) {
        toast(`Failed to upload ${file.name}: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
      }
    }

    setUploading(false);
    setUploadProgress(0);
    setPendingFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await fetchImages();
    toast('Gallery photo(s) uploaded', 'success');
  };

  const handleDelete = async (image: GalleryImage) => {
    if (!confirm(`Delete this photo? This cannot be undone.`)) return;
    setDeletingId(image.id);
    try {
      await apiFetch(`/api/gallery?id=${image.id}`, { method: 'DELETE' });
      setImages((prev) => prev.filter((img) => img.id !== image.id));
      toast('Photo deleted', 'success');
    } catch {
      toast('Failed to delete photo', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Meta dialog */}
      {showMeta && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Add details for {pendingFiles?.length === 1 ? 'this photo' : `these ${pendingFiles?.length} photos`} (optional)
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Caption</label>
              <input
                type="text"
                value={pendingMeta.caption}
                onChange={(e) => setPendingMeta((p) => ({ ...p, caption: e.target.value }))}
                placeholder="e.g. Volunteers at the food bank"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Event name</label>
              <input
                type="text"
                value={pendingMeta.event}
                onChange={(e) => setPendingMeta((p) => ({ ...p, event: e.target.value }))}
                placeholder="e.g. Spring Service Day 2025"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              className="px-4 py-2 bg-cranberry text-white text-sm font-semibold rounded-lg hover:bg-cranberry-700 transition-colors"
            >
              Upload
            </button>
            <button
              onClick={() => { setShowMeta(false); setPendingFiles(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {images.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <p className="text-4xl mb-3">🖼️</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No photos yet. Upload your first photo below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.caption || 'Gallery photo'} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors">
                    <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.caption && <p className="text-white text-[10px] font-semibold line-clamp-1">{img.caption}</p>}
                      {img.event && <p className="text-white/70 text-[9px] line-clamp-1">{img.event}</p>}
                    </div>
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(img)}
                        disabled={deletingId === img.id}
                        className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingId === img.id ? <Spinner size="sm" /> : '🗑️'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || showMeta}
            className="flex items-center gap-2 px-4 py-2.5 bg-cranberry text-white rounded-xl text-sm font-semibold hover:bg-cranberry-700 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><Spinner size="sm" /> Uploading… {uploadProgress}%</>
            ) : (
              <>
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Photo{images.length > 0 ? 's' : ''}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Albums Section ───────────────────────────────────────────────────────────

function AlbumsSection() {
  const { toast } = useToast();
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ title: '', date: '', description: '', isPublic: true });

  // Album detail state
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/portal/albums');
      setAlbums(data);
    } catch {
      toast('Failed to load albums', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const fetchPhotos = useCallback(async (albumId: string) => {
    setPhotosLoading(true);
    try {
      const data = await apiFetch(`/api/portal/albums/${albumId}/photos`);
      setAlbumPhotos(data.photos || []);
    } catch {
      toast('Failed to load photos', 'error');
    } finally {
      setPhotosLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedAlbumId) fetchPhotos(selectedAlbumId);
  }, [selectedAlbumId, fetchPhotos]);

  const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleCreateAlbum = async () => {
    if (!newAlbum.title.trim() || !newAlbum.date) {
      toast('Title and date are required', 'error');
      return;
    }
    setCreating(true);
    try {
      await apiFetch('/api/portal/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAlbum, slug: slugify(newAlbum.title) }),
      });
      toast('Album created!', 'success');
      setShowCreateForm(false);
      setNewAlbum({ title: '', date: '', description: '', isPublic: true });
      await fetchAlbums();
    } catch (e: any) {
      toast(e.message || 'Failed to create album', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedAlbumId) return;
    setUploading(true);
    setUploadProgress(0);

    const urls: string[] = [];
    const storagePaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const err = validateFile(file, { maxSizeMB: 10, allowedTypes: ['image/'] });
      if (err) { toast(err, 'error'); continue; }

      try {
        const { url, path } = await uploadFile(
          file, 'albums', selectedAlbumId,
          (pct) => setUploadProgress(Math.round(((i / files.length) + pct / 100 / files.length) * 100)),
        );
        urls.push(url);
        storagePaths.push(path);
      } catch (e: any) {
        toast(`Failed to upload ${file.name}`, 'error');
      }
    }

    if (urls.length > 0) {
      try {
        await apiFetch(`/api/portal/albums/${selectedAlbumId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls, storagePaths }),
        });
        toast(`${urls.length} photo(s) uploaded`, 'success');
        await fetchPhotos(selectedAlbumId);
        // Update local album count
        setAlbums((prev) => prev.map((a) => a.id === selectedAlbumId ? { ...a, photoCount: (a.photoCount || 0) + urls.length } : a));
      } catch {
        toast('Failed to save photo records', 'error');
      }
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedAlbumId || !confirm('Delete this photo?')) return;
    setDeletingPhotoId(photoId);
    try {
      await apiFetch(`/api/portal/albums/${selectedAlbumId}/photos?photoId=${photoId}`, { method: 'DELETE' });
      setAlbumPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setAlbums((prev) => prev.map((a) => a.id === selectedAlbumId ? { ...a, photoCount: Math.max(0, (a.photoCount || 0) - 1) } : a));
      toast('Photo deleted', 'success');
    } catch {
      toast('Failed to delete photo', 'error');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSetCover = async (photoUrl: string) => {
    if (!selectedAlbumId) return;
    try {
      await apiFetch('/api/portal/albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAlbumId, coverPhotoUrl: photoUrl }),
      });
      setAlbums((prev) => prev.map((a) => a.id === selectedAlbumId ? { ...a, coverPhotoUrl: photoUrl } : a));
      toast('Cover photo updated', 'success');
    } catch {
      toast('Failed to update cover', 'error');
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Delete this album and all its photos? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/portal/albums?id=${albumId}`, { method: 'DELETE' });
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      if (selectedAlbumId === albumId) setSelectedAlbumId(null);
      toast('Album deleted', 'success');
    } catch {
      toast('Failed to delete album', 'error');
    }
  };

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId);

  // ── Album Detail View ──
  if (selectedAlbumId && selectedAlbum) {
    return (
      <div>
        <button
          onClick={() => { setSelectedAlbumId(null); setAlbumPhotos([]); }}
          className="group text-sm text-gray-500 hover:text-cranberry mb-4 flex items-center gap-1.5 transition-colors"
        >
          <svg aria-hidden="true" className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to albums
        </button>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white">{selectedAlbum.title}</h3>
            <p className="text-sm text-gray-500">{selectedAlbum.photoCount || 0} photos</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDeleteAlbum(selectedAlbumId)}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Delete Album
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleUploadPhotos(e.target.files)}
        />

        {photosLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <>
            {albumPhotos.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <p className="text-4xl mb-3">📷</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No photos yet. Upload photos to this album.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                {albumPhotos.map((photo: any) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 dark:bg-gray-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.thumbnailUrl || photo.url} alt={photo.caption || 'Photo'} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors">
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => handleSetCover(photo.url)}
                          className="bg-white/90 hover:bg-white text-gray-700 text-[10px] font-bold px-2 py-1 rounded-lg"
                          title="Set as album cover"
                        >
                          ⭐ Cover
                        </button>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={deletingPhotoId === photo.id}
                          className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg disabled:opacity-50"
                        >
                          {deletingPhotoId === photo.id ? '…' : '🗑️'}
                        </button>
                      </div>
                      {photo.caption && (
                        <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[10px] font-semibold line-clamp-1">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-cranberry text-white rounded-xl text-sm font-semibold hover:bg-cranberry-700 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><Spinner size="sm" /> Uploading… {uploadProgress}%</>
              ) : (
                <>
                  <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Upload Photos
                </>
              )}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Album List View ──
  return (
    <div>
      {/* Create Album Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Album</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
              <input
                type="text"
                value={newAlbum.title}
                onChange={(e) => setNewAlbum((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Gala 2025"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry"
              />
              <p className="text-[10px] text-gray-400 mt-1">Slug: {slugify(newAlbum.title) || '—'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date *</label>
              <input
                type="date"
                value={newAlbum.date}
                onChange={(e) => setNewAlbum((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={newAlbum.description}
              onChange={(e) => setNewAlbum((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Brief description of this album..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cranberry resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={newAlbum.isPublic}
              onChange={(e) => setNewAlbum((p) => ({ ...p, isPublic: e.target.checked }))}
              className="rounded border-gray-300 text-cranberry focus:ring-cranberry"
            />
            Show on public gallery (preview only — full access for members)
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleCreateAlbum}
              disabled={creating}
              className="px-4 py-2 bg-cranberry text-white text-sm font-semibold rounded-lg hover:bg-cranberry-700 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Album'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewAlbum({ title: '', date: '', description: '', isPublic: true }); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {albums.length === 0 && !showCreateForm ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <p className="text-4xl mb-3">📸</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No albums yet. Create your first album below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {albums.map((album: any) => (
                <button
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className="group text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:border-cranberry-200 dark:hover:border-cranberry-800 transition-all"
                >
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {album.coverPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={album.coverPhotoUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cranberry-200 to-cranberry-400 dark:from-cranberry-800 dark:to-cranberry-900 flex items-center justify-center">
                        <span className="text-3xl opacity-50">📸</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${album.isPublic ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                        {album.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {album.photoCount || 0} 📷
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-cranberry transition-colors truncate">{album.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{album.date}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-cranberry text-white rounded-xl text-sm font-semibold hover:bg-cranberry-700 transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Album
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MediaManagerPage() {
  const { member, loading } = useAuth();
  const router = useRouter();

  const hasAccess = member?.role === 'president' || member?.role === 'board' || member?.role === 'treasurer';

  useEffect(() => {
    if (!loading && (!member || !hasAccess)) {
      router.push('/portal');
    }
  }, [member, loading, hasAccess, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner /></div>
    );
  }

  if (!member || !hasAccess) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Media Manager</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Upload and manage photos for the public website. All images are stored in Firebase — nothing goes to GitHub.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          {/* Section header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">{section.label}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
            <p className="text-xs text-cranberry mt-1 font-medium">💡 {section.hint}</p>
          </div>

          {/* Section content */}
          {section.key === 'hero' && <HeroSection />}
          {section.key === 'gallery' && <GallerySection />}
          {section.key === 'albums' && <AlbumsSection />}
        </div>
      ))}
    </div>
  );
}
