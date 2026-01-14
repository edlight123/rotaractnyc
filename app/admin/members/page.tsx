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
  email?: string
  photoUrl?: string
  order: number
  active: boolean
  membershipType?: 'active' | 'honorary' | 'alumni'
  duesStatus?: 'paid' | 'unpaid' | 'waived'
  joinDate?: string
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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'honorary' | 'alumni'>('all')
  const [duesFilter, setDuesFilter] = useState<'all' | 'paid' | 'unpaid' | 'waived'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<'name' | 'joinDate' | 'order'>('order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [form, setForm] = useState<Omit<MemberRow, 'id'>>({
    group: 'board',
    title: '',
    name: '',
    role: '',
    email: '',
    photoUrl: '',
    order: 1,
    active: true,
    membershipType: 'active',
    duesStatus: 'paid',
    joinDate: new Date().toISOString().split('T')[0],
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
            const membershipType = ['active', 'honorary', 'alumni'].includes(String(obj.membershipType))
              ? (obj.membershipType as 'active' | 'honorary' | 'alumni')
              : 'active'
            const duesStatus = ['paid', 'unpaid', 'waived'].includes(String(obj.duesStatus))
              ? (obj.duesStatus as 'paid' | 'unpaid' | 'waived')
              : 'paid'
            return {
              id: String(obj.id ?? ''),
              group,
              title: String(obj.title ?? ''),
              name: String(obj.name ?? ''),
              role: String(obj.role ?? ''),
              email: String(obj.email ?? '') || undefined,
              photoUrl: String(obj.photoUrl ?? '') || undefined,
              order: Number.isFinite(order) ? order : 1,
              active: obj.active !== false,
              membershipType,
              duesStatus,
              joinDate: String(obj.joinDate ?? '') || undefined,
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

  // Filtering and sorting
  const filtered = useMemo(() => {
    let result = members

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.email?.toLowerCase().includes(term) ||
          m.id.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.membershipType === statusFilter)
    }

    // Dues filter
    if (duesFilter !== 'all') {
      result = result.filter((m) => m.duesStatus === duesFilter)
    }

    return result
  }, [members, searchTerm, statusFilter, duesFilter])

  const sorted = useMemo(() => {
    const result = [...filtered]
    result.sort((a, b) => {
      let comparison = 0
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === 'joinDate') {
        comparison = (a.joinDate || '').localeCompare(b.joinDate || '')
      } else {
        comparison = a.order - b.order
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return result
  }, [filtered, sortField, sortDirection])

  const toggleSort = (field: 'name' | 'joinDate' | 'order') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sorted.map((m) => m.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Title', 'Membership Type', 'Dues Status', 'Join Date']
    const rows = sorted.map((m) => [
      m.id,
      m.name,
      m.email || '',
      m.title,
      m.membershipType || '',
      m.duesStatus || '',
      m.joinDate || '',
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const getMembershipBadge = (type?: string) => {
    switch (type) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            Active
          </span>
        )
      case 'honorary':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Honorary
          </span>
        )
      case 'alumni':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
            Alumni
          </span>
        )
      default:
        return null
    }
  }

  const getDuesBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
            Paid
          </span>
        )
      case 'unpaid':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
            Unpaid
          </span>
        )
      case 'waived':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Waived
          </span>
        )
      default:
        return null
    }
  }

  const startEdit = (row: MemberRow) => {
    setEditingId(row.id)
    setShowForm(true)
    setHeadshotFile(null)
    setForm({
      group: row.group,
      title: row.title,
      name: row.name,
      role: row.role,
      email: row.email || '',
      photoUrl: row.photoUrl || '',
      order: row.order,
      active: row.active,
      membershipType: row.membershipType || 'active',
      duesStatus: row.duesStatus || 'paid',
      joinDate: row.joinDate || new Date().toISOString().split('T')[0],
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
      email: '',
      photoUrl: '',
      order: 1,
      active: true,
      membershipType: 'active',
      duesStatus: 'paid',
      joinDate: new Date().toISOString().split('T')[0],
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
      email: '',
      photoUrl: '',
      order: 1,
      active: true,
      membershipType: 'active',
      duesStatus: 'paid',
      joinDate: new Date().toISOString().split('T')[0],
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

  // const seed = async () => {
  //   setError(null)
  //   try {
  //     const res = await fetch('/api/admin/seed', { method: 'POST' })
  //     if (!res.ok) {
  //       setError(await getFriendlyAdminApiError(res, 'Seed failed.'))
  //       return
  //     }
  //     await refresh()
  //   } catch {
  //     setError('Seed failed.')
  //   }
  // }

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex mb-6">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px] mr-2">home</span>
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                <span className="ms-1 text-sm font-medium text-slate-900 md:ms-2 dark:text-white">
                  Members Directory
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Members Directory</h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl">
              Manage active membership roster, track dues status, and update committee assignments.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportCSV}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px] mr-2">download</span>
              Export CSV
            </button>
            <button
              onClick={startNew}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px] mr-2">person_add</span>
              Add Member
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form Modal/Panel */}
        {showForm && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {editingId ? 'Edit Member' : 'Add New Member'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="john.doe@rotaractnyc.org"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="Club President"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Join Date
                  </label>
                  <input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role / Description
                </label>
                <textarea
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="Committee responsibilities, bio, etc."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Membership Type
                  </label>
                  <select
                    value={form.membershipType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, membershipType: e.target.value as 'active' | 'honorary' | 'alumni' }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="honorary">Honorary</option>
                    <option value="alumni">Alumni</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dues Status
                  </label>
                  <select
                    value={form.duesStatus}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duesStatus: e.target.value as 'paid' | 'unpaid' | 'waived' }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
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

                  {headshotFile && (
                    <button
                      type="button"
                      onClick={uploadHeadshot}
                      disabled={uploading}
                      className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 w-fit"
                    >
                      {uploading ? 'Uploading…' : 'Upload Photo'}
                    </button>
                  )}

                  <input
                    value={form.photoUrl || ''}
                    onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="Or paste image URL..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Active Member
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={save}
                  disabled={saving || !form.title.trim() || !form.name.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium"
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

        {/* Directory Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Search */}
            <div className="relative w-full lg:max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">
                  search
                </span>
              </div>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                placeholder="Search by name, email, or ID..."
                type="text"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors pr-8"
                >
                  <option value="all">Status: All</option>
                  <option value="active">Active</option>
                  <option value="honorary">Honorary</option>
                  <option value="alumni">Alumni</option>
                </select>
              </div>

              <div className="relative">
                <select
                  value={duesFilter}
                  onChange={(e) => setDuesFilter(e.target.value as typeof duesFilter)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors pr-8"
                >
                  <option value="all">Dues: All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="waived">Waived</option>
                </select>
              </div>

              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>

              <button
                onClick={refresh}
                className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh List"
              >
                <span className="material-symbols-outlined text-[20px]">refresh</span>
              </button>
            </div>
          </div>

          {/* Table */}
          {loadingData ? (
            <div className="p-12 text-center text-slate-600 dark:text-slate-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              Loading members...
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-slate-600 dark:text-slate-400">
              {searchTerm || statusFilter !== 'all' || duesFilter !== 'all'
                ? 'No members match your filters.'
                : 'No members yet. Click "Add Member" to get started.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === sorted.length && sorted.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer group hover:text-primary"
                        onClick={() => toggleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Member
                          <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-primary">
                            {sortField === 'name' ? (sortDirection === 'asc' ? 'arrow_downward' : 'arrow_upward') : 'unfold_more'}
                          </span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Membership Type
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Dues Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer group hover:text-primary"
                        onClick={() => toggleSort('joinDate')}
                      >
                        <div className="flex items-center gap-1">
                          Join Date
                          <span className="material-symbols-outlined text-[16px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            unfold_more
                          </span>
                        </div>
                      </th>
                      <th scope="col" className="relative px-6 py-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                    {sorted.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(member.id)}
                            onChange={() => toggleSelect(member.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {member.photoUrl ? (
                                <div
                                  className="h-10 w-10 rounded-full bg-slate-200 bg-cover bg-center"
                                  style={{ backgroundImage: `url("${member.photoUrl}")` }}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                  {member.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">{member.name}</div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                {member.email || member.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getMembershipBadge(member.membershipType)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getDuesBadge(member.duesStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(member.joinDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(member)}
                              className="text-slate-400 hover:text-primary transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button
                              onClick={() => remove(member.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white dark:bg-slate-900 px-4 py-3 border-t border-slate-200 dark:border-slate-800 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Showing <span className="font-medium text-slate-900 dark:text-white">{sorted.length}</span> of{' '}
                    <span className="font-medium text-slate-900 dark:text-white">{members.length}</span> members
                    {selectedIds.size > 0 && (
                      <span className="ml-2 text-primary">({selectedIds.size} selected)</span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
