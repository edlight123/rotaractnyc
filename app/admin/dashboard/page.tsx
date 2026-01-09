'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FaUsers,
  FaCalendar,
  FaNewspaper,
  FaImages,
  FaCog,
  FaFileAlt,
  FaSignOutAlt,
  FaChartLine,
  FaEnvelope,
} from 'react-icons/fa'
import { useAdminSession, adminSignOut } from '@/lib/admin/useAdminSession'

export default function AdminDashboard() {
  const router = useRouter()
  const session = useAdminSession()
  const stats = {
    members: 45,
    events: 12,
    posts: 28,
    gallery: 156,
  }

  if (session.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rotaract-pink"></div>
      </div>
    )
  }

  if (session.status !== 'authenticated') {
    return null
  }

  const menuItems = [
    { name: 'Members', icon: <FaUsers />, href: '/admin/members', count: stats.members },
    { name: 'Events', icon: <FaCalendar />, href: '/admin/events', count: stats.events },
    { name: 'News Posts', icon: <FaNewspaper />, href: '/admin/posts', count: stats.posts },
    { name: 'Gallery', icon: <FaImages />, href: '/admin/gallery', count: stats.gallery },
    { name: 'Messages', icon: <FaEnvelope />, href: '/admin/messages', count: 8 },
    { name: 'Settings', icon: <FaCog />, href: '/admin/settings', count: null },
    { name: 'Pages', icon: <FaFileAlt />, href: '/admin/pages', count: null },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-rotaract-darkpink">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {session.email || 'Admin'}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-white hover:bg-gray-50 border border-rotaract-pink/30 text-rotaract-darkpink rounded-lg transition-colors"
              >
                View Site
              </Link>
              <button
                onClick={async () => {
                  await adminSignOut()
                  router.push('/')
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <FaSignOutAlt />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Members</p>
                <p className="text-3xl font-bold text-rotaract-pink mt-1">{stats.members}</p>
              </div>
              <div className="text-4xl text-rotaract-pink">
                <FaUsers />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Events</p>
                <p className="text-3xl font-bold text-rotaract-pink mt-1">{stats.events}</p>
              </div>
              <div className="text-4xl text-rotaract-pink">
                <FaCalendar />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">News Posts</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.posts}</p>
              </div>
              <div className="text-4xl text-green-600">
                <FaNewspaper />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Gallery Items</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.gallery}</p>
              </div>
              <div className="text-4xl text-purple-600">
                <FaImages />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-rotaract-darkpink mb-2">{item.name}</h3>
                  {item.count !== null && (
                    <p className="text-gray-600">
                      {item.count} {item.count === 1 ? 'item' : 'items'}
                    </p>
                  )}
                </div>
                <div className="text-4xl text-rotaract-pink">{item.icon}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-rotaract-darkpink mb-4 flex items-center gap-2">
            <FaChartLine />
            Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="font-semibold">New member joined</p>
                <p className="text-sm text-gray-600">John Doe registered for membership - 2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="font-semibold">Event published</p>
                <p className="text-sm text-gray-600">Annual Fundraiser event created - 5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="font-semibold">New gallery images</p>
                <p className="text-sm text-gray-600">12 photos added to 2024 Gallery - 1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
