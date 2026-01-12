'use client'

import Link from 'next/link'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import DragDropFile from '@/components/admin/DragDropFile'
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
  const session = useAdminSession()

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
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
        setError(await getFriendlyAdminApiError(res, 'Unable to load members.'))
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
    if (session.status === 'unauthenticated') {
      window.location.href = '/admin/login'
    }
  }, [session.status])

  useEffect(() => {
    if (session.status === 'authenticated') refresh()
  }, [refresh, session.status])

  const sorted = useMemo(() => [...members].sort((a, b) => a.order - b.order), [members])

  const startEdit = (row: MemberRow) => {
    setEditingId(row.id)
    setShowForm(true)
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

  const startNew = () => {
    setEditingId(null)
    setShowForm(true)
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

  const resetForm = () => {
    setEditingId(null)
    setShowForm(false)
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
        setError(await getFriendlyAdminApiError(res, 'Unable to upload headshot.'))
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
        setError(await getFriendlyAdminApiError(res, 'Unable to save member.'))
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
        setError(await getFriendlyAdminApiError(res, 'Unable to delete member.'))
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
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
              <span className="font-medium text-slate-900 dark:text-white">Members</span>
            </nav>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Board Members</h2>
            <p className="text-slate-500 dark:text-slate-400">Manage board members and leadership team.</p>
          </div>
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={startNew}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Member
              </button>
            )}
          </div>
        </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {editingId ? 'Edit Member' : 'Add New Member'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Club President"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role / Description</label>
                <textarea
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Headshot</label>
                <div className="flex flex-col gap-2">
                  <DragDropFile
                    label="Upload headshot"
                    accept="image/*"
                    file={headshotFile}
                    onFile={setHeadshotFile}
                    uploadedUrl={form.photoUrl || undefined}
                    hint="PNG/JPG recommended."
                  />

                  <div>
                    <button
                      type="button"
                      onClick={uploadHeadshot}
                      disabled={!headshotFile || uploading}
                      className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>

                  <input
                    value={form.photoUrl || ''}
                    onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                      className="rounded"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={save}
                  disabled={saving || !form.title.trim() || !form.name.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Member'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">All Board Members</h3>
            <button
              onClick={seed}
              className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              Seed Defaults
            </button>
          </div>

          {loadingData ? (
            <div className="text-slate-600 dark:text-slate-400">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="text-slate-600 dark:text-slate-400">No members yet.</div>
          ) : (
            <div className="space-y-3">
              {sorted.map((m) => (
                <div key={m.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        order {m.order} · {m.active ? 'active' : 'inactive'}
                      </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">{m.title}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{m.name}</div>
                      {m.role && <p className="mt-2 text-slate-700 dark:text-slate-300 text-sm">{m.role}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(m)}
                        className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
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
  )
}
