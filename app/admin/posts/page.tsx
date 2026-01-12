'use client'

import Link from 'next/link'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { slugify } from '@/lib/slugify'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

const DEFAULT_AUTHOR = 'Rotaract Club of New York at the United Nations'

function formatPublishedDate(dt: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  }).format(dt)
}

function generateExcerpt(htmlContent: string): string {
  // Strip HTML tags and get first 150 characters
  const text = htmlContent.replace(/<[^>]*>/g, '').trim()
  return text.length > 150 ? text.substring(0, 150) + '...' : text
}

function htmlToContentArray(html: string): string[] {
  // Split by paragraph tags and clean up
  return html
    .split(/<\/p>|<br\s*\/?>/i)
    .map(p => p.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean)
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
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list')

  const [form, setForm] = useState({
    title: '',
    category: 'Club News',
    contentHtml: '',
    published: true,
  })

  // Predefined categories
  const predefinedCategories = [
    'Club News',
    'Events',
    'Community Service',
    'Fundraising',
    'International',
    'Social',
    'Professional Development',
    'Announcements',
  ]

  // Get unique categories from existing posts
  const existingCategories = useMemo(() => {
    const categories = new Set(posts.map(p => p.category).filter(Boolean))
    return Array.from(categories).sort()
  }, [posts])

  // Combine predefined and existing categories, remove duplicates
  const allCategories = useMemo(() => {
    const combined = new Set([...predefinedCategories, ...existingCategories])
    return Array.from(combined).sort()
  }, [existingCategories])

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryDropdown])

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
    setMode('edit')
    setForm({
      title: row.title,
      category: row.category,
      contentHtml: row.content.join('<br><br>'),
      published: row.published,
    })
    setCategoryInput(row.category)
    setIsCustomCategory(!allCategories.includes(row.category))
  }

  const startNew = () => {
    setEditingSlug(null)
    setMode('new')
    setForm({
      title: '',
      category: 'Club News',
      contentHtml: '',
      published: true,
    })
    setCategoryInput('Club News')
    setIsCustomCategory(false)
  }

  const backToList = () => {
    setEditingSlug(null)
    setMode('list')
    setForm({
      title: '',
      category: 'Club News',
      contentHtml: '',
      published: true,
    })
    setCategoryInput('')
    setIsCustomCategory(false)
    setShowCategoryDropdown(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      // Auto-generate slug from title
      const slug = editingSlug || slugify(form.title)
      
      // Auto-generate excerpt from content
      const excerpt = generateExcerpt(form.contentHtml)
      
      // Convert HTML to content array
      const content = htmlToContentArray(form.contentHtml)
      
      // Get author from session or use default
      const author = session.email || DEFAULT_AUTHOR
      
      // Get current date
      const date = formatPublishedDate(new Date())

      const isEdit = mode === 'edit' && Boolean(editingSlug)
      const res = await fetch('/api/admin/posts', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: form.title,
          date,
          author,
          category: form.category,
          excerpt,
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
                  <div className="relative" ref={categoryDropdownRef}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                    <div className="relative">
                      {isCustomCategory ? (
                        <div className="flex gap-2">
                          <input
                            value={categoryInput}
                            onChange={(e) => {
                              setCategoryInput(e.target.value)
                              setForm((f) => ({ ...f, category: e.target.value }))
                            }}
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                            placeholder="Enter custom category"
                          />
                          <button
                            onClick={() => {
                              setIsCustomCategory(false)
                              setCategoryInput(form.category)
                              setShowCategoryDropdown(false)
                            }}
                            className="px-3 py-2.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            title="Use dropdown"
                          >
                            <span className="material-symbols-outlined text-[20px]">arrow_drop_down</span>
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white flex items-center justify-between"
                          >
                            <span>{form.category || 'Select category'}</span>
                            <span className="material-symbols-outlined text-[20px]">
                              {showCategoryDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}
                            </span>
                          </button>
                          {showCategoryDropdown && (
                            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 max-h-60 overflow-auto">
                              {allCategories.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setForm((f) => ({ ...f, category: cat }))
                                    setCategoryInput(cat)
                                    setShowCategoryDropdown(false)
                                  }}
                                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                    form.category === cat
                                      ? 'bg-primary/10 text-primary font-medium'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomCategory(true)
                                  setCategoryInput('')
                                  setShowCategoryDropdown(false)
                                  setForm((f) => ({ ...f, category: '' }))
                                }}
                                className="w-full text-left px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 text-primary hover:bg-primary/10 font-medium flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Add New Category
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary"
                      />
                      Published
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    placeholder="Enter article title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Content
                  </label>
                  <div className="rounded-lg border border-slate-300 overflow-hidden dark:border-slate-700">
                    <ReactQuill
                      theme="snow"
                      value={form.contentHtml}
                      onChange={(value) => setForm((f) => ({ ...f, contentHtml: value }))}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ list: 'ordered' }, { list: 'bullet' }],
                          ['blockquote', 'code-block'],
                          ['link', 'image'],
                          ['clean'],
                        ],
                      }}
                      className="bg-white dark:bg-slate-800"
                      style={{ height: '400px' }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Use the toolbar to format your text. Slug and excerpt will be auto-generated.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-16">
                  <button
                    onClick={save}
                    disabled={saving || !form.title.trim() || !form.contentHtml.trim()}
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : mode === 'edit' ? (
                      'Save Changes'
                    ) : (
                      'Create Article'
                    )}
                  </button>
                  <button
                    onClick={backToList}
                    className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
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
