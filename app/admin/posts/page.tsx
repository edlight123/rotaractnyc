'use client'

import Link from 'next/link'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { slugify } from '@/lib/slugify'

const DEFAULT_AUTHOR = 'Rotaract Club of New York at the United Nations'

function formatPublishedDate(dt: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  }).format(dt)
}

type PostRow = {
  slug: string
  title: string
  date: string
  author: string
  category: string
  excerpt: string
  content: string[]
  published: boolean
}

export default function AdminPostsPage() {
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list')

  const [form, setForm] = useState({
    slug: '',
    title: '',
    date: '',
    author: DEFAULT_AUTHOR,
    category: 'Club News',
    excerpt: '',
    contentText: '',
    published: true,
  })

  const refresh = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/posts', { cache: 'no-store' })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to load posts.'))
        return
      }
      const json: unknown = await res.json()
      const rows =
        typeof json === 'object' &&
        json &&
        Array.isArray((json as { posts?: unknown }).posts)
          ? ((json as { posts: unknown[] }).posts as unknown[])
          : []

      setPosts(
        rows
          .map((p): PostRow => {
            const obj = typeof p === 'object' && p ? (p as Record<string, unknown>) : {}
            const slug = String(obj.slug ?? obj.id ?? '')
            const contentRaw = obj.content
            return {
              slug,
              title: String(obj.title ?? ''),
              date: String(obj.date ?? ''),
              author: String(obj.author ?? DEFAULT_AUTHOR),
              category: String(obj.category ?? 'News'),
              excerpt: String(obj.excerpt ?? ''),
              content: Array.isArray(contentRaw) ? contentRaw.map((x) => String(x)) : [],
              published: obj.published !== false,
            }
          })
          .filter((p) => p.slug)
      )
    } catch {
      setError('Unable to load posts.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (session.status === 'unauthenticated') {
      window.location.href = '/admin/login'
    }
  }, [session.status])

  useEffect(() => {
    if (session.status === 'authenticated') refresh()
  }, [refresh, session.status])

  const sorted = useMemo(() => {
    return [...posts].sort((a, b) => b.slug.localeCompare(a.slug))
  }, [posts])

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  const startEdit = (row: PostRow) => {
    setEditingSlug(row.slug)
    setSlugManuallyEdited(true)
    setMode('edit')
    setForm({
      slug: row.slug,
      title: row.title,
      date: row.date,
      author: row.author,
      category: row.category,
      excerpt: row.excerpt,
      contentText: row.content.join('\n\n'),
      published: row.published,
    })
  }

  const startNew = () => {
    setEditingSlug(null)
    setSlugManuallyEdited(false)
    setMode('new')
    setForm({
      slug: '',
      title: '',
      date: formatPublishedDate(new Date()),
      author: DEFAULT_AUTHOR,
      category: 'Club News',
      excerpt: '',
      contentText: '',
      published: true,
    })
  }

  const backToList = () => {
    setEditingSlug(null)
    setSlugManuallyEdited(false)
    setMode('list')
    setForm({
      slug: '',
      title: '',
      date: '',
      author: DEFAULT_AUTHOR,
      category: 'Club News',
      excerpt: '',
      contentText: '',
      published: true,
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const content = form.contentText
        .split(/\n\s*\n/g)
        .map((p) => p.trim())
        .filter(Boolean)

      const isEdit = mode === 'edit' && Boolean(editingSlug)
      const res = await fetch('/api/admin/posts', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug.trim(),
          title: form.title,
          date: form.date.trim() ? form.date : formatPublishedDate(new Date()),
          author: form.author.trim() ? form.author : DEFAULT_AUTHOR,
          category: form.category,
          excerpt: form.excerpt,
          content,
          published: form.published,
        }),
      })

      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to save post.'))
        return
      }

      backToList()
      await refresh()
    } catch {
      setError('Unable to save post.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Breadcrumbs & Heading */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/admin/dashboard" className="hover:text-primary">Dashboard</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="font-medium text-slate-900 dark:text-white">News & Articles</span>
            </nav>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">News & Articles</h2>
            <p className="text-slate-500 dark:text-slate-400">Create, edit, and publish news and article updates.</p>
          </div>
          {mode === 'list' && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Article
            </button>
          )}
        </div>

        <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === 'list' ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">All Articles</h3>
              {loadingData ? (
                <div className="text-slate-600 dark:text-slate-400">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="text-slate-600 dark:text-slate-400">No posts yet.</div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => startEdit(p)}
                      className="w-full text-left border border-slate-200 rounded-lg p-4 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {p.published ? 'published' : 'draft'} · {p.category}
                          </div>
                          <div className="text-lg font-semibold text-slate-900 dark:text-white">{p.title}</div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {p.date ? <span>{p.date}</span> : <span className="italic">No publish date</span>} · {p.author}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">/{p.slug}</div>
                          {p.excerpt && <p className="mt-2 text-slate-700 dark:text-slate-300 text-sm">{p.excerpt}</p>}
                        </div>
                        <div className="shrink-0 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-blue-700">
                          Edit
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {mode === 'edit' ? 'Edit Article' : 'New Article'}
                </h3>
                <button
                  onClick={backToList}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                >
                  Back to List
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug</label>
                    <input
                      value={form.slug}
                      onChange={(e) => {
                        const value = e.target.value
                        setSlugManuallyEdited(true)
                        setForm((f) => ({ ...f, slug: value }))
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                      placeholder="my-post-slug"
                      disabled={Boolean(editingSlug)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                        className="rounded"
                      />
                      Published
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value
                      setForm((f) => {
                        if (editingSlug) return { ...f, title }
                        const nextAutoSlug = slugify(title)
                        const shouldAutoUpdateSlug = !slugManuallyEdited || !f.slug.trim()
                        return shouldAutoUpdateSlug ? { ...f, title, slug: nextAutoSlug } : { ...f, title }
                      })
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Publish Date</label>
                    <input
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                      placeholder={formatPublishedDate(new Date())}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <input
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Author</label>
                    <input
                      value={form.author}
                      onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Excerpt</label>
                    <input
                      value={form.excerpt}
                      onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content (paragraphs)</label>
                  <textarea
                    value={form.contentText}
                    onChange={(e) => setForm((f) => ({ ...f, contentText: e.target.value }))}
                    rows={10}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Write paragraphs separated by a blank line"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={save}
                    disabled={saving || !form.title.trim() || (!editingSlug && !form.slug.trim())}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Article'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
