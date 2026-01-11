'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaNewspaper, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import { useCallback, useEffect, useMemo, useState } from 'react'

function slugifyTitle(input: string): string {
  const normalized = (input || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-{2,}/g, '-')

  return slug.length > 80 ? slug.slice(0, 80).replace(/-+$/, '') : slug
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
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [editingSlug, setEditingSlug] = useState<string | null>(null)

  const [form, setForm] = useState({
    slug: '',
    title: '',
    date: '',
    author: 'Rotaract NYC',
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
              author: String(obj.author ?? 'Rotaract NYC'),
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
    if (session.status === 'unauthenticated') router.push('/admin/login')
  }, [router, session.status])

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

  const resetForm = () => {
    setEditingSlug(null)
    setForm({
      slug: '',
      title: '',
      date: '',
      author: 'Rotaract NYC',
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

      const method = editingSlug ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/posts', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug.trim(),
          title: form.title,
          date: form.date,
          author: form.author,
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

      resetForm()
      await refresh()
    } catch {
      setError('Unable to save post.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (slug: string) => {
    if (!confirm('Delete this post?')) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/posts?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to delete post.'))
        return
      }
      await refresh()
    } catch {
      setError('Unable to delete post.')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-rotaract-darkpink flex items-center gap-2">
                <FaNewspaper /> News Posts
              </h1>
              <p className="text-gray-600 mt-1">Create, edit, and publish news posts</p>
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
                  {editingSlug ? 'Edit Post' : 'Add Post'}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Slug</label>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="my-post-slug"
                      disabled={Boolean(editingSlug)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                      />
                      Published
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value
                      setForm((f) => {
                        if (editingSlug) return { ...f, title }
                        return { ...f, title, slug: slugifyTitle(title) }
                      })
                    }}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date (text)</label>
                    <input
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="December 2023"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Author</label>
                    <input
                      value={form.author}
                      onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Excerpt</label>
                    <input
                      value={form.excerpt}
                      onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Content (paragraphs)</label>
                  <textarea
                    value={form.contentText}
                    onChange={(e) => setForm((f) => ({ ...f, contentText: e.target.value }))}
                    rows={8}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Write paragraphs separated by a blank line"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving || !form.slug.trim() || !form.title.trim()}
                    className="px-4 py-2 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : editingSlug ? 'Save Changes' : 'Create Post'}
                  </button>
                  {editingSlug ? (
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
              <h2 className="text-xl font-bold text-rotaract-darkpink mb-4">All Posts</h2>

              {loadingData ? (
                <div className="text-gray-600">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="text-gray-600">No posts yet.</div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((p) => (
                    <div
                      key={p.slug}
                      className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-500">
                            {p.published ? 'published' : 'draft'} · {p.category}
                          </div>
                          <div className="text-lg font-semibold text-rotaract-darkpink">{p.title}</div>
                          <div className="text-sm text-gray-600">/{p.slug}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(p)}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(p.slug)}
                            className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {p.excerpt ? <p className="mt-2 text-gray-700 text-sm">{p.excerpt}</p> : null}
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
