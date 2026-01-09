'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaSignOutAlt, FaUsers } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { useCallback, useEffect, useMemo, useState } from 'react'

type MemberRow = {
  id: string
  group: 'board' | 'member'
  title: string
  name: string
  role: string
  photoUrl?: string
  order: number
  active: boolean
}

export default function AdminMembersPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)
  const [form, setForm] = useState<Omit<MemberRow, 'id'>>({
    group: 'board',
    title: '',
    name: '',
    role: '',
    photoUrl: '',
    order: 1,
    active: true,
  })

  const refresh = useCallback(async () => {
    setLoadingData(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/members?group=board', { cache: 'no-store' })
      if (!res.ok) {
        setError('Unable to load members.')
        return
      }
      const json: unknown = await res.json()
      const rows =
        typeof json === 'object' &&
        json &&
        Array.isArray((json as { members?: unknown }).members)
          ? ((json as { members: unknown[] }).members as unknown[])
          : []

      setMembers(
        rows
          .map((m): MemberRow => {
            const obj = typeof m === 'object' && m ? (m as Record<string, unknown>) : {}
            const order = Number(obj.order)
            const group: MemberRow['group'] = obj.group === 'member' ? 'member' : 'board'
            return {
              id: String(obj.id ?? ''),
              group,
              title: String(obj.title ?? ''),
              name: String(obj.name ?? ''),
              role: String(obj.role ?? ''),
              photoUrl: String(obj.photoUrl ?? '') || undefined,
              order: Number.isFinite(order) ? order : 1,
              active: obj.active !== false,
            }
          })
          .filter((m) => m.id)
      )
    } catch {
      setError('Unable to load members.')
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

  const sorted = useMemo(() => [...members].sort((a, b) => a.order - b.order), [members])

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  const startEdit = (row: MemberRow) => {
    setEditingId(row.id)
    setHeadshotFile(null)
    setForm({
      group: row.group,
      title: row.title,
      name: row.name,
      role: row.role,
      photoUrl: row.photoUrl || '',
      order: row.order,
      active: row.active,
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setHeadshotFile(null)
    setForm({
      group: 'board',
      title: '',
      name: '',
      role: '',
      photoUrl: '',
      order: 1,
      active: true,
    })
  }

  const uploadHeadshot = async () => {
    if (!headshotFile) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', headshotFile)
      fd.append('folder', 'members')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        setError('Unable to upload headshot.')
        return
      }

      const json: unknown = await res.json()
      const url =
        typeof json === 'object' && json && typeof (json as { url?: unknown }).url === 'string'
          ? String((json as { url: string }).url)
          : ''

      if (!url) {
        setError('Upload succeeded but no URL returned.')
        return
      }

      setForm((f) => ({ ...f, photoUrl: url }))
      setHeadshotFile(null)
    } catch {
      setError('Unable to upload headshot.')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/members', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          ...form,
          order: Number(form.order) || 1,
        }),
      })

      if (!res.ok) {
        setError('Unable to save member.')
        return
      }

      resetForm()
      await refresh()
    } catch {
      setError('Unable to save member.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this member?')) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/members?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError('Unable to delete member.')
        return
      }
      await refresh()
    } catch {
      setError('Unable to delete member.')
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
                <FaUsers /> Members
              </h1>
              <p className="text-gray-600 mt-1">Manage board members</p>
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
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-rotaract-darkpink">Board Members</h2>
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

          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="md:w-1/2">
              <h3 className="text-lg font-semibold text-rotaract-darkpink mb-3">
                {editingId ? 'Edit Member' : 'Add Member'}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Club President"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role / Description</label>
                  <textarea
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Headshot</label>
                  <div className="mt-1 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setHeadshotFile(e.target.files?.[0] ?? null)}
                        className="w-full"
                      />
                      <button
                        type="button"
                        onClick={uploadHeadshot}
                        disabled={!headshotFile || uploading}
                        className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        {uploading ? 'Uploading…' : 'Upload'}
                      </button>
                    </div>

                    <input
                      value={form.photoUrl || ''}
                      onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://..."
                    />

                    {form.photoUrl ? (
                      <a
                        href={form.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-rotaract-darkpink hover:underline"
                      >
                        View current headshot
                      </a>
                    ) : null}
                  </div>
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
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                      />
                      Active
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving || !form.title.trim() || !form.name.trim()}
                    className="px-4 py-2 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Member'}
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
              <h3 className="text-lg font-semibold text-rotaract-darkpink mb-3">All Board Members</h3>

              {loadingData ? (
                <div className="text-gray-600">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="text-gray-600">No members yet.</div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((m) => (
                    <div key={m.id} className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-500">
                            order {m.order} · {m.active ? 'active' : 'inactive'}
                          </div>
                          <div className="text-lg font-semibold text-rotaract-darkpink">{m.title}</div>
                          <div className="text-sm text-gray-600">{m.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(m)}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(m.id)}
                            className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {m.role ? <p className="mt-2 text-gray-700 text-sm">{m.role}</p> : null}
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
