'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import AddPhotoModal from '@/components/admin/AddPhotoModal'
import { useCallback, useEffect, useMemo, useState } from 'react'

type GalleryRow = {
  id: string
  title: string
  alt: string
  imageUrl: string
  storagePath?: string
  order: number
  createdAt?: unknown
  updatedAt?: unknown
}

type ViewMode = 'masonry' | 'albums' | 'list'

type FilterMode = 'all' | 'uploaded' | 'external'
type SortMode =
  | 'order-asc'
  | 'order-desc'
  | 'title-asc'
  | 'title-desc'
  | 'updated-desc'
  | 'created-desc'

function timestampToMs(value: unknown): number | null {
  if (!value) return null

  if (typeof value === 'object' && value && 'toMillis' in value) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ms = (value as any).toMillis?.()
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : null
    } catch {
      return null
    }
  }

  if (typeof value === 'object' && value) {
    const obj = value as Record<string, unknown>
    const seconds =
      (typeof obj._seconds === 'number' ? obj._seconds : null) ??
      (typeof obj.seconds === 'number' ? obj.seconds : null)
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      return seconds * 1000
    }
  }

  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isFinite(ms) ? ms : null
  }

  return null
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Masonry Grid View Component
function MasonryView({
  items,
  selectedItems,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  items: GalleryRow[]
  selectedItems: Set<string>
  onToggleSelect: (id: string) => void
  onEdit: (item: GalleryRow) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="pb-24" style={{
      columnCount: 1,
      columnGap: '1.5rem',
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 640px) {
          .masonry-grid-container { column-count: 2; }
        }
        @media (min-width: 1024px) {
          .masonry-grid-container { column-count: 3; }
        }
        @media (min-width: 1280px) {
          .masonry-grid-container { column-count: 4; }
        }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 1.5rem;
        }
      `}} />
      <div className="masonry-grid-container">{items.map((item) => (
        <div
          key={item.id}
          className={`masonry-item group relative overflow-hidden rounded-xl bg-slate-100 shadow-sm transition-all duration-300 hover:shadow-lift-hover dark:bg-slate-800 ${
            selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''
          }`}
        >
          <img
            src={item.imageUrl}
            alt={item.alt}
            className="block h-auto w-full object-cover"
          />
          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex items-start justify-between">
              <label className="relative flex cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/50 bg-black/20 checked:border-primary checked:bg-primary transition-all"
                />
                <span className="material-symbols-outlined pointer-events-none absolute text-[16px] text-white opacity-0 peer-checked:opacity-100">
                  check
                </span>
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex justify-end gap-2 translate-y-4 transition-transform duration-300 delay-75 group-hover:translate-y-0">
                <button
                  onClick={() => onEdit(item)}
                  className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900"
                  title="Edit Caption"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="flex size-9 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-sm transition-colors hover:bg-red-600"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <div className="translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-white/70">{item.alt}</p>
              </div>
            </div>
          </div>
        </div>
      ))}</div>
    </div>
  )
}

// Albums Card View Component
function AlbumsView({
  items,
  onEdit,
  onDelete,
}: {
  items: GalleryRow[]
  onEdit: (item: GalleryRow) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="relative h-48 overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.alt}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute top-3 right-3 rounded bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
              {item.storagePath ? 'Uploaded' : 'External'}
            </div>
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10"></div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold leading-tight text-slate-900 transition-colors group-hover:text-primary dark:text-white">
                {item.title}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(item)}
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-[16px]">image</span>
              <span className="truncate">{item.alt}</span>
            </div>
            {(() => {
              const updatedMs = timestampToMs(item.updatedAt)
              const createdMs = timestampToMs(item.createdAt)
              const dateMs = updatedMs ?? createdMs
              if (!dateMs) return null
              return (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>
                    {new Date(dateMs).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                    })}
                  </span>
                  {updatedMs ? (
                    <>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span>Updated {formatRelativeTime(updatedMs)}</span>
                    </>
                  ) : null}
                </div>
              )
            })()}
          </div>
        </div>
      ))}
    </div>
  )
}

// List/Table View Component
function ListView({
  items,
  selectedItems,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  items: GalleryRow[]
  selectedItems: Set<string>
  onToggleSelect: (id: string) => void
  onEdit: (item: GalleryRow) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Table Header */}
      <div className="grid grid-cols-[48px_80px_2fr_1fr_100px] items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex justify-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Select</span>
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Preview</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Order</div>
        <div className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</div>
      </div>
      {/* Table Body */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <div
            key={item.id}
            className="group grid grid-cols-[48px_80px_2fr_1fr_100px] items-center gap-4 px-6 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
          >
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={selectedItems.has(item.id)}
                onChange={() => onToggleSelect(item.id)}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 bg-transparent text-primary focus:ring-primary"
              />
            </div>
            <div>
              <img
                src={item.imageUrl}
                alt={item.alt}
                className="h-12 w-16 rounded-md border border-slate-200 object-cover shadow-sm dark:border-slate-700"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 transition-colors group-hover:text-primary dark:text-slate-200">
                {item.title}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.alt}</p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                #{item.order}
              </span>
            </div>
            <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onEdit(item)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary"
                title="Edit"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
  const [editingItem, setEditingItem] = useState<GalleryRow | null>(null)
  const [showModal, setShowModal] = useState(false) // Modal state
  const [viewMode, setViewMode] = useState<ViewMode>('masonry')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('order-asc')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

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
              createdAt: obj.createdAt,
              updatedAt: obj.updatedAt,
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

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const filtered = items
      .filter((item) => {
        if (!query) return true
        return item.title.toLowerCase().includes(query) || item.alt.toLowerCase().includes(query)
      })
      .filter((item) => {
        if (filterMode === 'all') return true
        if (filterMode === 'uploaded') return Boolean(item.storagePath)
        return !item.storagePath
      })

    const sorted = [...filtered]
    const updatedMs = (row: GalleryRow) => timestampToMs(row.updatedAt) ?? 0
    const createdMs = (row: GalleryRow) => timestampToMs(row.createdAt) ?? 0

    sorted.sort((a, b) => {
      switch (sortMode) {
        case 'order-asc':
          return a.order - b.order
        case 'order-desc':
          return b.order - a.order
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        case 'updated-desc':
          return updatedMs(b) - updatedMs(a)
        case 'created-desc':
          return createdMs(b) - createdMs(a)
        default:
          return a.order - b.order
      }
    })

    return sorted
  }, [items, searchQuery, filterMode, sortMode])

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)))
    }
  }

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Delete ${selectedItems.size} selected items?`)) return

    setError(null)
    const errors: string[] = []

    for (const id of Array.from(selectedItems)) {
      try {
        const res = await fetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          errors.push(`Failed to delete item ${id}`)
        }
      } catch {
        errors.push(`Error deleting item ${id}`)
      }
    }

    if (errors.length > 0) {
      setError(errors.join(', '))
    }

    setSelectedItems(new Set())
    await refresh()
  }

  const startNew = () => {
    setEditingId(null)
    setEditingItem(null)
    setShowModal(true)
  }

  const startEdit = (row: GalleryRow) => {
    setEditingId(row.id)
    setEditingItem(row)
    setShowModal(true)
  }

  const closeModal = () => {
    setEditingId(null)
    setEditingItem(null)
    setShowModal(false)
  }

  const uploadIfNeeded = async (file: File | null) => {
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

  const handleSaveFromModal = async (formData: Omit<GalleryRow, 'id'>, file: File | null) => {
    setError(null)
    setSaving(true)

    try {
      // Upload file if provided
      const uploadData = await uploadIfNeeded(file)
      const finalUrl = uploadData?.url || formData.imageUrl

      if (!finalUrl) {
        setError('Please provide an image (either upload a file or provide a URL)')
        setSaving(false)
        return
      }

      const body = {
        ...formData,
        imageUrl: finalUrl,
        storagePath: uploadData?.path || formData.storagePath || '',
      }

      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId
        ? `/api/admin/gallery?id=${encodeURIComponent(editingId)}`
        : '/api/admin/gallery'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to save gallery item.'))
        setSaving(false)
        return
      }

      await refresh()
      closeModal()
    } catch (err) {
      setError('Unable to save gallery item.')
      console.error(err)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const seedData = async () => {
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
    <div className="flex min-h-screen flex-col bg-background-light dark:bg-background-dark">
      <div className="flex-1 p-4 lg:p-8">
        <div className="mx-auto max-w-[1440px] space-y-6">
          {/* Breadcrumbs & Header */}
          <div className="flex flex-col gap-4">
            <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/admin/dashboard" className="hover:text-primary transition-colors">
                Dashboard
              </Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">Gallery Management</span>
            </nav>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                  Gallery Management
                </h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Organize, tag, and manage the club&apos;s photo collections.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={startNew}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-dark active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  <span>Add Photo</span>
                </button>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {filteredItems.length} Photos
                  {items.length !== filteredItems.length ? ` (of ${items.length})` : ''}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Upload Hero Section */}
          {!showModal && (
            <div className="group relative w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-all duration-300 ease-out hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 md:p-12">
              <div
                onClick={startNew}
                className="flex flex-col items-center justify-center gap-4 text-center"
              >
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">Upload Photos</p>
                  <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Click to add high-resolution images to your gallery
                  </p>
                </div>
                <button className="mt-2 rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-primary shadow-sm transition-all group-hover:shadow-md dark:border-slate-600 dark:bg-slate-700">
                  Browse Files
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-background-light/95 py-4 backdrop-blur dark:border-slate-800 dark:bg-background-dark/95">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search photos by title or alt..."
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Filter */}
              <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="material-symbols-outlined text-[18px] text-slate-400">filter_list</span>
                <label className="sr-only" htmlFor="gallery-filter">Filter</label>
                <select
                  id="gallery-filter"
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                  className="h-full bg-transparent pr-6 text-sm outline-none"
                >
                  <option value="all">Filter: All</option>
                  <option value="uploaded">Filter: Uploaded</option>
                  <option value="external">Filter: External</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="material-symbols-outlined text-[18px] text-slate-400">sort</span>
                <label className="sr-only" htmlFor="gallery-sort">Sort</label>
                <select
                  id="gallery-sort"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="h-full bg-transparent pr-6 text-sm outline-none"
                >
                  <option value="order-asc">Sort: Order (Asc)</option>
                  <option value="order-desc">Sort: Order (Desc)</option>
                  <option value="title-asc">Sort: Title (A–Z)</option>
                  <option value="title-desc">Sort: Title (Z–A)</option>
                  <option value="updated-desc">Sort: Recently Updated</option>
                  <option value="created-desc">Sort: Recently Created</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'masonry'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  Masonry
                </button>
                <button
                  onClick={() => setViewMode('albums')}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'albums'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">photo_album</span>
                  Albums
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">list</span>
                  List
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {selectedItems.size === filteredItems.length ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span>{selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}</span>
              </button>
              <button
                onClick={seedData}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <span className="material-symbols-outlined text-[18px]">backup</span>
                Seed
              </button>
            </div>
          </div>

          {/* Content Views */}
          {loadingData ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <span className="material-symbols-outlined mb-2 text-[48px] text-slate-300 dark:text-slate-700">
                photo_library
              </span>
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No photos match your search.' : 'No gallery images yet.'}
              </p>
              {!searchQuery && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Click the upload area above to get started.
                </p>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'masonry' && <MasonryView items={filteredItems} selectedItems={selectedItems} onToggleSelect={toggleSelectItem} onEdit={startEdit} onDelete={remove} />}
              {viewMode === 'albums' && <AlbumsView items={filteredItems} onEdit={startEdit} onDelete={remove} />}
              {viewMode === 'list' && <ListView items={filteredItems} selectedItems={selectedItems} onToggleSelect={toggleSelectItem} onEdit={startEdit} onDelete={remove} />}
            </>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900 py-3 pl-5 pr-3 text-white shadow-2xl dark:border-slate-200/20 dark:bg-white dark:text-slate-900">
            <span className="mr-2 whitespace-nowrap text-sm font-bold">
              {selectedItems.size} Selected
            </span>
            <div className="h-5 w-px bg-white/20 dark:bg-black/10"></div>
            <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10 dark:hover:bg-black/5">
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={bulkDelete}
              className="ml-1 flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-red-600"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="ml-2 rounded-full p-1 text-white/60 transition-colors hover:bg-white/20 hover:text-white dark:text-black/40 dark:hover:bg-black/10 dark:hover:text-black"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      <AddPhotoModal
        isOpen={showModal}
        onClose={closeModal}
        editingItem={editingItem}
        onSave={handleSaveFromModal}
        saving={saving}
        uploading={uploading}
      />
    </div>
  )
}
