'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaImages, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
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
        setError('Unable to load gallery.')
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

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

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
  }

  const resetForm = () => {
    setEditingId(null)
    setFile(null)
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
        setError('Upload failed. Check Firebase Storage config.')
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
        setError('Unable to save gallery item.')
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
        setError('Unable to delete gallery item.')
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
        setError('Seed failed. Check Firebase Admin credentials.')
        return
      }
      await refresh()
    } catch {
      setError('Seed failed. Check Firebase Admin credentials.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-rotaract-darkpink flex items-center gap-2">
                <FaImages /> Gallery
              </h1>
              <p className="text-gray-600 mt-1">Manage gallery images</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg transition-colors"
              >
                <FaArrowLeft /> Dashboard
              </Link>
              <button
                onClick={async () => {
                  await adminSignOut()
                  router.push('/')
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="md:w-1/2">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-rotaract-darkpink">
                  {editingId ? 'Edit Item' : 'Add Item'}
                </h2>
                <button
                  onClick={seed}
                  className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                >
                  Seed Defaults
                </button>
              </div>

              {error ? (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              ) : null}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Alt text</label>
                  <input
                    value={form.alt}
                    onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Upload image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="mt-1 w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: upload to Firebase Storage.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://... or /my-image.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If you upload a file, this will be set automatically.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving || uploading || !form.title || !form.alt || (!file && !form.imageUrl)}
                    className="px-4 py-2 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50"
                  >
                    {uploading ? 'Uploading…' : saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Item'}
                  </button>
                  {editingId ? (
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="md:w-1/2">
              <h2 className="text-xl font-bold text-rotaract-darkpink mb-4">All Items</h2>

              {loadingData ? (
                <div className="text-gray-600">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="text-gray-600">No gallery items yet.</div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((g) => (
                    <div
                      key={g.id}
                      className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-500">order {g.order}</div>
                          <div className="text-lg font-semibold text-rotaract-darkpink">{g.title}</div>
                          <div className="text-sm text-gray-600 break-all">{g.imageUrl}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(g)}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(g.id)}
                            className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
