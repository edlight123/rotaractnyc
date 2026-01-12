'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import DragDropFile from '@/components/admin/DragDropFile'
import { useCallback, useEffect, useMemo, useState } from 'react'

type GalleryRow = {
  id: string
  title: string
  alt: string
  imageUrl: string
  storagePath?: string
  order: number
}

export default function AdminGalleryPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<GalleryRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState<Omit<GalleryRow, 'id'>>({
    title: '',
    alt: '',
    imageUrl: '',
    storagePath: '',
    order: 1,
  })

  const refresh = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/gallery', { cache: 'no-store' })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to load gallery.'))
        return
      }
      const json: unknown = await res.json()
      const rows =
        typeof json === 'object' &&
        json &&
        Array.isArray((json as { items?: unknown }).items)
          ? ((json as { items: unknown[] }).items as unknown[])
          : []

      setItems(
        rows
          .map((g): GalleryRow => {
            const obj = typeof g === 'object' && g ? (g as Record<string, unknown>) : {}
            const order = Number(obj.order)
            return {
              id: String(obj.id ?? ''),
              title: String(obj.title ?? ''),
              alt: String(obj.alt ?? ''),
              imageUrl: String(obj.imageUrl ?? ''),
              storagePath: String(obj.storagePath ?? ''),
              order: Number.isFinite(order) ? order : 1,
            }
          })
          .filter((g) => g.id)
      )
    } catch {
      setError('Unable to load gallery.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (session.status === 'unauthenticated') router.push('/admin/login')
  }, [router, session.status])

  useEffect(() => {
    if (session.status === 'authenticated') refresh()
  }, [refresh, session.status])

  const sorted = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items])

  const startNew = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (row: GalleryRow) => {
    setEditingId(row.id)
    setFile(null)
    setForm({
      title: row.title,
      alt: row.alt,
      imageUrl: row.imageUrl,
      storagePath: row.storagePath || '',
      order: row.order,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingId(null)
    setFile(null)
    setShowForm(false)
    setForm({
      title: '',
      alt: '',
      imageUrl: '',
      storagePath: '',
      order: 1,
    })
  }

  const uploadIfNeeded = async () => {
    if (!file) return null

    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('folder', 'gallery')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Upload failed.'))
        return null
      }

      const json: unknown = await res.json()
      if (!json || typeof json !== 'object') {
        setError('Upload failed. Check Firebase Storage config.')
        return null
      }
      const obj = json as Record<string, unknown>
      const url = typeof obj.url === 'string' ? obj.url : ''
      const path = typeof obj.path === 'string' ? obj.path : ''
      if (!url || !path) {
        setError('Upload failed. Check Firebase Storage config.')
        return null
      }
      return { url, path }
    } catch {
      setError('Upload failed. Check Firebase Storage config.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const upload = await uploadIfNeeded()

      if (upload) {
        setForm((f) => ({ ...f, imageUrl: upload.url, storagePath: upload.path }))
        setFile(null)
      }

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: form.title,
        alt: form.alt,
        imageUrl: upload?.url || form.imageUrl,
        storagePath: upload?.path || form.storagePath,
        order: Number(form.order) || 1,
      }

      const res = await fetch('/api/admin/gallery', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to save gallery item.'))
        return
      }

      resetForm()
      await refresh()
    } catch {
      setError('Unable to save gallery item.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to delete gallery item.'))
        return
      }
      await refresh()
    } catch {
      setError('Unable to delete gallery item.')
    }
  }

  const seed = async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Seed failed.'))
        return
      }
      await refresh()
    } catch {
      setError('Seed failed.')
    }
  }

  if (session.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Breadcrumbs & Heading */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/admin/dashboard" className="hover:text-primary">Dashboard</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="font-medium text-slate-900 dark:text-white">Gallery</span>
            </nav>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Gallery</h2>
            <p className="text-slate-500 dark:text-slate-400">Manage gallery images and media.</p>
          </div>
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={startNew}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Image
              </button>
            )}
            <button
              onClick={seed}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <span className="material-symbols-outlined text-[18px]">backup</span>
              Seed Defaults
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {showForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Image' : 'Add New Image'}
              </h3>

              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                      placeholder="Event photos 2024"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={form.alt}
                      onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                      placeholder="Description for accessibility"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                      placeholder="1"
                      min="1"
                    />
                  </div>

                  <div>
                    <DragDropFile
                      label="Upload Image"
                      accept="image/*"
                      file={file}
                      onFile={setFile}
                      uploadedUrl={form.imageUrl || undefined}
                      hint="Upload to Firebase Storage"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Auto-filled when you upload a file
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving || uploading || !form.title || !form.alt || (!file && !form.imageUrl)}
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Uploading...
                      </span>
                    ) : saving ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </span>
                    ) : editingId ? (
                      'Save Changes'
                    ) : (
                      'Create Image'
                    )}
                  </button>
                  <button
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Gallery Images ({sorted.length})
              </h3>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined mb-2 text-[48px] opacity-50">photo_library</span>
                <p>No gallery images yet.</p>
                <p className="text-sm">Click &quot;Add Image&quot; to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Order {g.order}
                        </span>
                      </div>
                      <div className="mb-1 font-semibold text-slate-900 dark:text-white">{g.title}</div>
                      <div className="mb-1 text-sm text-slate-600 dark:text-slate-400">{g.alt}</div>
                      {g.imageUrl && (
                        <div className="mt-2">
                          <img
                            src={g.imageUrl}
                            alt={g.alt}
                            className="h-24 w-auto rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(g)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => remove(g.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
