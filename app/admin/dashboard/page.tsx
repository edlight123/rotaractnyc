'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdminSession } from '@/lib/admin/useAdminSession'
import StatCard from '../_components/StatCard'
import RecentActivity from '../_components/RecentActivity'
import QuickActions from '../_components/QuickActions'

type Stats = {
  members: number
  activeMembers: number
  events: number
  upcomingEvents: number
  posts: number
  publishedPosts: number
  fundsRaised: number
  recentMembers: number
  recentPosts: number
}

type Event = {
  id: string
  title: string
  date: string
  startDate?: string
  location?: string
  category: 'upcoming' | 'past'
}

type Member = {
  uid: string
  name: string
  email: string
  status: 'active' | 'pending' | 'inactive'
  createdAt?: any
}

export default function AdminDashboard() {
  const session = useAdminSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (session.status === 'authenticated') {
      fetchData()
    }
  }, [session.status])
  
  async function fetchData() {
    try {
      // Fetch stats
      const statsRes = await fetch('/api/admin/stats')
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }
      
      // Fetch events
      const eventsRes = await fetch('/api/admin/events')
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        // Get upcoming events only, sorted by date, limit to 3
        const upcomingEvents = eventsData.events
          ?.filter((e: Event) => e.category === 'upcoming')
          .slice(0, 3) || []
        setEvents(upcomingEvents)
      }
      
      // Fetch members
      const membersRes = await fetch('/api/admin/members')
      if (membersRes.ok) {
        const membersData = await membersRes.json()
        // Get recent members, limit to 3
        const recentMembers = membersData.users
          ?.sort((a: Member, b: Member) => {
            const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
            const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
            return bDate.getTime() - aDate.getTime()
          })
          .slice(0, 3) || []
        setMembers(recentMembers)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (session.status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session.status !== 'authenticated') {
    return null
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Failed to load dashboard stats</p>
      </div>
    )
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, Admin
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Here&apos;s what&apos;s happening with your club today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Members"
          value={stats.members}
          icon="group"
          iconColor="bg-primary/10 text-primary"
          trend={{ value: `${stats.recentMembers > 0 ? '+' : ''}${stats.recentMembers} New`, positive: stats.recentMembers > 0 }}
          subtitle="this month"
        />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          icon="calendar_month"
          iconColor="bg-purple-500/10 text-purple-500"
          trend={{ value: `${stats.events} Total`, neutral: true }}
          subtitle="events in database"
        />
        <StatCard
          title="Published Posts"
          value={stats.publishedPosts}
          icon="article"
          iconColor="bg-green-500/10 text-green-600"
          trend={{ value: `${stats.recentPosts > 0 ? '+' : ''}${stats.recentPosts}`, positive: stats.recentPosts > 0 }}
          subtitle="this month"
        />
        <StatCard
          title="Funds Raised"
          value={`$${stats.fundsRaised.toLocaleString()}`}
          icon="attach_money"
          iconColor="bg-orange-500/10 text-orange-600"
          trend={{ value: stats.fundsRaised > 0 ? 'Active' : 'No data', positive: stats.fundsRaised > 0 }}
          subtitle="total tracked"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Actions + Upcoming Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <QuickActions />

          {/* Upcoming Events */}
          <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upcoming Events</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Events scheduled in the next 30 days
                </p>
              </div>
              <Link
                href="/admin/events"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {events.length > 0 ? (
                events.map((event) => (
                  <EventRow
                    key={event.id}
                    title={event.title}
                    date={formatEventDate(event.date || event.startDate || '')}
                    location={event.location || 'TBD'}
                    status={event.category === 'upcoming' ? 'published' : 'draft'}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No upcoming events
                </div>
              )}
            </div>
          </div>

          {/* Recent Members */}
          <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Members</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Latest member registrations
                </p>
              </div>
              <Link
                href="/admin/members"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.length > 0 ? (
                members.map((member) => (
                  <MemberRow
                    key={member.uid}
                    name={member.name}
                    email={member.email}
                    status={member.status}
                    joined={formatTimeAgo(member.createdAt)}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No recent members
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>
    </main>
  )
}

function formatEventDate(dateStr: string): string {
  if (!dateStr) return 'TBD'
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  } catch {
    return dateStr
  }
}

function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return 'Recently'
  try {
    const date = timestamp?.toDate?.() || new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`
  } catch {
    return 'Recently'
  }
}

function EventRow({
  title,
  date,
  location,
  status,
}: {
  title: string
  date: string
  location: string
  status: 'published' | 'draft'
}) {
  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-600 text-[20px]">event</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {date} • {location}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
            status === 'published'
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-700/10'
              : 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-700/10'
          }`}
        >
          {status === 'published' ? '✓ Published' : '○ Draft'}
        </span>
      </div>
    </div>
  )
}

function MemberRow({
  name,
  email,
  status,
  joined,
}: {
  name: string
  email: string
  status: 'active' | 'pending' | 'inactive'
  joined: string
}) {
  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">person</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              status === 'active'
                ? 'bg-green-50 text-green-700'
                : status === 'pending'
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            {status === 'active' ? '✓ Active' : status === 'pending' ? '○ Pending' : '— Inactive'}
          </span>
          <p className="text-xs text-gray-400 mt-1">{joined}</p>
        </div>
      </div>
    </div>
  )
}
