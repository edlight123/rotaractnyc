'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaArrowLeft, FaFileAlt, FaSignOutAlt } from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'
import { getFriendlyAdminApiError } from '@/lib/admin/apiError'
import {
  DEFAULT_PAGES,
  type EmphasisText,
  type FaqItem,
  type MembershipData,
  type SisterClubsData,
} from '@/lib/content/pages'

type CmsPageSlug = 'faq' | 'mission' | 'membership' | 'sisterclubs'

type FaqData = { faqs: FaqItem[] }

type CmsPageState = {
  slug: CmsPageSlug
  heroTitle: string
  heroSubtitle: string
  data: unknown
}

const SLUGS: { slug: CmsPageSlug; label: string }[] = [
  { slug: 'faq', label: 'FAQ' },
  { slug: 'mission', label: 'Mission/About' },
  { slug: 'membership', label: 'Membership' },
  { slug: 'sisterclubs', label: 'Sister Clubs' },
]

function safePrettyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

function coerceFaqData(input: unknown, fallback: FaqData): FaqData {
  const obj = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}
  const faqsRaw = obj.faqs
  const faqs: FaqItem[] = Array.isArray(faqsRaw)
    ? faqsRaw
        .map((f) => {
          const ff = typeof f === 'object' && f ? (f as Record<string, unknown>) : {}
          return {
            question: String(ff.question ?? ''),
            answer: String(ff.answer ?? ''),
          }
        })
        .filter((f) => f.question || f.answer)
    : fallback.faqs

  return { faqs }
}

function coerceMembershipData(input: unknown, fallback: MembershipData): MembershipData {
  const obj = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}

  const benefitsRaw = obj.benefits
  const benefits = Array.isArray(benefitsRaw)
    ? benefitsRaw.map((b) => String(b ?? '')).filter(Boolean)
    : fallback.benefits

  const membershipFormUrl = String(obj.membershipFormUrl ?? fallback.membershipFormUrl)
  const eligibilityIntro = String(obj.eligibilityIntro ?? fallback.eligibilityIntro)

  const reqsRaw = obj.eligibilityRequirements
  const eligibilityRequirements: EmphasisText[] = Array.isArray(reqsRaw)
    ? reqsRaw
        .map((r) => {
          const rr = typeof r === 'object' && r ? (r as Record<string, unknown>) : {}
          return {
            prefix: String(rr.prefix ?? ''),
            strong: String(rr.strong ?? ''),
            suffix: rr.suffix === undefined ? undefined : String(rr.suffix ?? ''),
          }
        })
        .filter((r) => r.strong || r.prefix || r.suffix)
    : fallback.eligibilityRequirements

  const duesIntro = String(obj.duesIntro ?? fallback.duesIntro)

  const typesRaw = obj.membershipTypes
  const membershipTypes = Array.isArray(typesRaw)
    ? typesRaw.map((t) => String(t ?? '')).filter(Boolean)
    : fallback.membershipTypes

  const duesOutro = String(obj.duesOutro ?? fallback.duesOutro)
  const treasurerEmail = String(obj.treasurerEmail ?? fallback.treasurerEmail)

  const pm =
    typeof obj.paymentMethods === 'object' && obj.paymentMethods
      ? (obj.paymentMethods as Record<string, unknown>)
      : {}
  const paymentMethods = {
    venmoLabel: String(pm.venmoLabel ?? fallback.paymentMethods.venmoLabel),
    venmoHandle: String(pm.venmoHandle ?? fallback.paymentMethods.venmoHandle),
  }

  return {
    benefits,
    membershipFormUrl,
    eligibilityIntro,
    eligibilityRequirements,
    duesIntro,
    membershipTypes,
    duesOutro,
    treasurerEmail,
    paymentMethods,
  }
}

function coerceSisterClubsData(input: unknown, fallback: SisterClubsData): SisterClubsData {
  const obj = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}

  const introRaw = obj.introParagraphs
  const introParagraphs = Array.isArray(introRaw)
    ? introRaw.map((p) => String(p ?? '')).filter(Boolean)
    : fallback.introParagraphs

  const clubsRaw = obj.clubs
  const clubs = Array.isArray(clubsRaw)
    ? clubsRaw
        .map((c) => {
          const cc = typeof c === 'object' && c ? (c as Record<string, unknown>) : {}
          return {
            name: String(cc.name ?? ''),
            sinceYear: String(cc.sinceYear ?? ''),
            location: String(cc.location ?? ''),
            presidents: String(cc.presidents ?? ''),
          }
        })
        .filter((c) => c.name || c.location || c.sinceYear || c.presidents)
    : fallback.clubs

  const benefitsRaw = obj.benefits
  const benefits = Array.isArray(benefitsRaw)
    ? benefitsRaw
        .map((b) => {
          const bb = typeof b === 'object' && b ? (b as Record<string, unknown>) : {}
          return {
            title: String(bb.title ?? ''),
            description: String(bb.description ?? ''),
          }
        })
        .filter((b) => b.title || b.description)
    : fallback.benefits

  return {
    introParagraphs,
    clubs,
    benefits,
  }
}

export default function AdminPagesPage() {
  const router = useRouter()
  const session = useAdminSession()

  const [selected, setSelected] = useState<CmsPageSlug>('faq')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<CmsPageState>({
    slug: 'faq',
    heroTitle: '',
    heroSubtitle: '',
    data: { faqs: [] } satisfies FaqData,
  })

  const load = useCallback(async (slug: CmsPageSlug) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pages?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to load page content.'))
        return
      }
      const json: unknown = await res.json()
      const page =
        typeof json === 'object' &&
        json &&
        typeof (json as { page?: unknown }).page === 'object' &&
        (json as { page?: unknown }).page
          ? ((json as { page: unknown }).page as Record<string, unknown>)
          : null

      if (!page) {
        setError('Invalid response.')
        return
      }

      setState({
        slug,
        heroTitle: String(page.heroTitle ?? ''),
        heroSubtitle: String(page.heroSubtitle ?? ''),
        data: (() => {
          if (slug === 'faq') {
            const fallback = DEFAULT_PAGES.faq.data as FaqData
            return coerceFaqData(page.data, fallback)
          }
          if (slug === 'membership') {
            const fallback = DEFAULT_PAGES.membership.data as MembershipData
            return coerceMembershipData(page.data, fallback)
          }
          if (slug === 'sisterclubs') {
            const fallback = DEFAULT_PAGES.sisterclubs.data as SisterClubsData
            return coerceSisterClubsData(page.data, fallback)
          }
          return {}
        })(),
      })
    } catch {
      setError('Unable to load page content.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session.status === 'unauthenticated') router.push('/admin/login')
  }, [router, session.status])

  useEffect(() => {
    if (session.status === 'authenticated') load(selected)
  }, [load, selected, session.status])

  const canSave = useMemo(() => state.heroTitle.trim().length > 0, [state.heroTitle])

  if (session.status === 'loading') {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (session.status !== 'authenticated') return null

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: state.slug,
          heroTitle: state.heroTitle,
          heroSubtitle: state.heroSubtitle,
          data: state.data,
        }),
      })

      if (!res.ok) {
        setError(await getFriendlyAdminApiError(res, 'Unable to save page content.'))
        return
      }

      await load(state.slug)
    } catch {
      setError('Unable to save page content.')
    } finally {
      setSaving(false)
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
      await load(selected)
    } catch {
      setError('Seed failed.')
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaFileAlt className="text-primary" /> Pages
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Edit static page content (Firestore)</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white border border-slate-200/70 text-slate-700 dark:text-slate-300 dark:bg-slate-900/70 dark:hover:bg-slate-900 rounded-lg transition-colors"
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

      <div className="bg-white/80 dark:bg-slate-900/70 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Page</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value as CmsPageSlug)}
                className="px-3 py-2 border border-slate-200/70 dark:border-slate-700/70 rounded-lg bg-white/80 dark:bg-slate-900/80"
              >
                {SLUGS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={seed}
              className="px-3 py-2 text-sm bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-white dark:hover:bg-slate-900"
            >
              Seed Defaults
            </button>
          </div>

          {error ? (
            <div className="mb-4 bg-red-50/80 border border-red-200/70 text-red-700 px-4 py-3 rounded-2xl">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-slate-600 dark:text-slate-400">Loading…</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Hero Title</label>
                <input
                  value={state.heroTitle}
                  onChange={(e) => setState((s) => ({ ...s, heroTitle: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Hero Subtitle</label>
                <input
                  value={state.heroSubtitle}
                  onChange={(e) => setState((s) => ({ ...s, heroSubtitle: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {state.slug === 'faq' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-rotaract-darkpink">FAQs</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setState((s) => {
                          const data = coerceFaqData(s.data, { faqs: [] })
                          return {
                            ...s,
                            data: { faqs: [...data.faqs, { question: '', answer: '' }] } satisfies FaqData,
                          }
                        })
                      }
                      className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                    >
                      Add FAQ
                    </button>
                  </div>

                  {(coerceFaqData(state.data, { faqs: [] }).faqs.length ?? 0) === 0 ? (
                    <p className="text-gray-600 text-sm">No FAQs yet.</p>
                  ) : null}

                  <div className="space-y-4">
                    {coerceFaqData(state.data, { faqs: [] }).faqs.map((f, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-sm font-medium text-gray-700">FAQ #{idx + 1}</div>
                          <button
                            type="button"
                            onClick={() =>
                              setState((s) => {
                                const data = coerceFaqData(s.data, { faqs: [] })
                                return {
                                  ...s,
                                  data: { faqs: data.faqs.filter((_, i) => i !== idx) } satisfies FaqData,
                                }
                              })
                            }
                            className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Question</label>
                            <input
                              value={f.question}
                              onChange={(e) =>
                                setState((s) => {
                                  const data = coerceFaqData(s.data, { faqs: [] })
                                  const next = [...data.faqs]
                                  next[idx] = { ...next[idx], question: e.target.value }
                                  return { ...s, data: { faqs: next } satisfies FaqData }
                                })
                              }
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Answer</label>
                            <textarea
                              value={f.answer}
                              onChange={(e) =>
                                setState((s) => {
                                  const data = coerceFaqData(s.data, { faqs: [] })
                                  const next = [...data.faqs]
                                  next[idx] = { ...next[idx], answer: e.target.value }
                                  return { ...s, data: { faqs: next } satisfies FaqData }
                                })
                              }
                              rows={3}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {state.slug === 'membership' ? (
                (() => {
                  const fallback = DEFAULT_PAGES.membership.data as MembershipData
                  const data = coerceMembershipData(state.data, fallback)

                  const setData = (next: MembershipData) => setState((s) => ({ ...s, data: next }))

                  return (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-rotaract-darkpink">Membership Content</h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Membership Form URL</label>
                        <input
                          value={data.membershipFormUrl}
                          onChange={(e) => setData({ ...data, membershipFormUrl: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-medium text-gray-800">Benefits</div>
                          <button
                            type="button"
                            onClick={() => setData({ ...data, benefits: [...data.benefits, ''] })}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Add Benefit
                          </button>
                        </div>
                        <div className="space-y-2">
                          {data.benefits.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                value={b}
                                onChange={(e) => {
                                  const next = [...data.benefits]
                                  next[idx] = e.target.value
                                  setData({ ...data, benefits: next })
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = data.benefits.filter((_, i) => i !== idx)
                                  setData({ ...data, benefits: next })
                                }}
                                className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Eligibility Intro</label>
                        <textarea
                          value={data.eligibilityIntro}
                          onChange={(e) => setData({ ...data, eligibilityIntro: e.target.value })}
                          rows={3}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-medium text-gray-800">Eligibility Requirements</div>
                          <button
                            type="button"
                            onClick={() =>
                              setData({
                                ...data,
                                eligibilityRequirements: [
                                  ...data.eligibilityRequirements,
                                  { prefix: '', strong: '', suffix: '' },
                                ],
                              })
                            }
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Add Requirement
                          </button>
                        </div>

                        <div className="space-y-3">
                          {data.eligibilityRequirements.map((r, idx) => (
                            <div key={idx} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="text-sm font-medium text-gray-700">Requirement #{idx + 1}</div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = data.eligibilityRequirements.filter((_, i) => i !== idx)
                                    setData({ ...data, eligibilityRequirements: next })
                                  }}
                                  className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Prefix</label>
                                  <input
                                    value={r.prefix}
                                    onChange={(e) => {
                                      const next = [...data.eligibilityRequirements]
                                      next[idx] = { ...next[idx], prefix: e.target.value }
                                      setData({ ...data, eligibilityRequirements: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Bold Text</label>
                                  <input
                                    value={r.strong}
                                    onChange={(e) => {
                                      const next = [...data.eligibilityRequirements]
                                      next[idx] = { ...next[idx], strong: e.target.value }
                                      setData({ ...data, eligibilityRequirements: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Suffix</label>
                                  <input
                                    value={r.suffix ?? ''}
                                    onChange={(e) => {
                                      const next = [...data.eligibilityRequirements]
                                      next[idx] = { ...next[idx], suffix: e.target.value }
                                      setData({ ...data, eligibilityRequirements: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Dues Intro</label>
                        <textarea
                          value={data.duesIntro}
                          onChange={(e) => setData({ ...data, duesIntro: e.target.value })}
                          rows={3}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-medium text-gray-800">Membership Types</div>
                          <button
                            type="button"
                            onClick={() => setData({ ...data, membershipTypes: [...data.membershipTypes, ''] })}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Add Type
                          </button>
                        </div>
                        <div className="space-y-2">
                          {data.membershipTypes.map((t, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                value={t}
                                onChange={(e) => {
                                  const next = [...data.membershipTypes]
                                  next[idx] = e.target.value
                                  setData({ ...data, membershipTypes: next })
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = data.membershipTypes.filter((_, i) => i !== idx)
                                  setData({ ...data, membershipTypes: next })
                                }}
                                className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Dues Outro</label>
                        <textarea
                          value={data.duesOutro}
                          onChange={(e) => setData({ ...data, duesOutro: e.target.value })}
                          rows={3}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Treasurer Email</label>
                          <input
                            value={data.treasurerEmail}
                            onChange={(e) => setData({ ...data, treasurerEmail: e.target.value })}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Venmo Handle</label>
                          <input
                            value={data.paymentMethods.venmoHandle}
                            onChange={(e) =>
                              setData({
                                ...data,
                                paymentMethods: { ...data.paymentMethods, venmoHandle: e.target.value },
                              })
                            }
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : null}

              {state.slug === 'sisterclubs' ? (
                (() => {
                  const fallback = DEFAULT_PAGES.sisterclubs.data as SisterClubsData
                  const data = coerceSisterClubsData(state.data, fallback)
                  const setData = (next: SisterClubsData) => setState((s) => ({ ...s, data: next }))

                  return (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-rotaract-darkpink">Sister Clubs Content</h3>

                      <div className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-medium text-gray-800">Intro Paragraphs</div>
                          <button
                            type="button"
                            onClick={() => setData({ ...data, introParagraphs: [...data.introParagraphs, ''] })}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Add Paragraph
                          </button>
                        </div>
                        <div className="space-y-3">
                          {data.introParagraphs.map((p, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <textarea
                                value={p}
                                onChange={(e) => {
                                  const next = [...data.introParagraphs]
                                  next[idx] = e.target.value
                                  setData({ ...data, introParagraphs: next })
                                }}
                                rows={2}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = data.introParagraphs.filter((_, i) => i !== idx)
                                  setData({ ...data, introParagraphs: next })
                                }}
                                className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-medium text-gray-800">Clubs</div>
                          <button
                            type="button"
                            onClick={() =>
                              setData({
                                ...data,
                                clubs: [...data.clubs, { name: '', sinceYear: '', location: '', presidents: '' }],
                              })
                            }
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Add Club
                          </button>
                        </div>

                        <div className="space-y-3">
                          {data.clubs.map((club, idx) => (
                            <div key={idx} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="text-sm font-medium text-gray-700">Club #{idx + 1}</div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = data.clubs.filter((_, i) => i !== idx)
                                    setData({ ...data, clubs: next })
                                  }}
                                  className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Name</label>
                                  <input
                                    value={club.name}
                                    onChange={(e) => {
                                      const next = [...data.clubs]
                                      next[idx] = { ...next[idx], name: e.target.value }
                                      setData({ ...data, clubs: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Since Year</label>
                                  <input
                                    value={club.sinceYear}
                                    onChange={(e) => {
                                      const next = [...data.clubs]
                                      next[idx] = { ...next[idx], sinceYear: e.target.value }
                                      setData({ ...data, clubs: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Location</label>
                                  <input
                                    value={club.location}
                                    onChange={(e) => {
                                      const next = [...data.clubs]
                                      next[idx] = { ...next[idx], location: e.target.value }
                                      setData({ ...data, clubs: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Presidents</label>
                                  <input
                                    value={club.presidents}
                                    onChange={(e) => {
                                      const next = [...data.clubs]
                                      next[idx] = { ...next[idx], presidents: e.target.value }
                                      setData({ ...data, clubs: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-medium text-gray-800">Benefits</div>
                          <button
                            type="button"
                            onClick={() => setData({ ...data, benefits: [...data.benefits, { title: '', description: '' }] })}
                            className="px-3 py-2 text-sm bg-white border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg hover:bg-gray-50"
                          >
                            Add Benefit
                          </button>
                        </div>
                        <div className="space-y-3">
                          {data.benefits.map((b, idx) => (
                            <div key={idx} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="text-sm font-medium text-gray-700">Benefit #{idx + 1}</div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = data.benefits.filter((_, i) => i !== idx)
                                    setData({ ...data, benefits: next })
                                  }}
                                  className="px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Title</label>
                                  <input
                                    value={b.title}
                                    onChange={(e) => {
                                      const next = [...data.benefits]
                                      next[idx] = { ...next[idx], title: e.target.value }
                                      setData({ ...data, benefits: next })
                                    }}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600">Description</label>
                                  <textarea
                                    value={b.description}
                                    onChange={(e) => {
                                      const next = [...data.benefits]
                                      next[idx] = { ...next[idx], description: e.target.value }
                                      setData({ ...data, benefits: next })
                                    }}
                                    rows={2}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : null}

              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-sm text-rotaract-darkpink hover:underline"
                >
                  {showAdvanced ? 'Hide' : 'Show'} advanced JSON preview
                </button>
                {showAdvanced ? (
                  <pre className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-auto">
                    {safePrettyJson(state.data)}
                  </pre>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving || !canSave}
                  className="px-4 py-2 bg-rotaract-pink text-white rounded-lg hover:bg-rotaract-darkpink disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
