'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRelativeTime } from '@/lib/admin/activities';

interface ActivityItem {
  id: string;
  type: 'member' | 'event' | 'post' | 'gallery' | 'message' | 'settings' | 'page';
  action: string;
  title: string;
  description: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/admin/activities?limit=5');
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };
  const getIcon = (type: string) => {
    switch (type) {
      case 'member':
        return 'person_add';
      case 'event':
        return 'event';
      case 'post':
        return 'article';
      case 'gallery':
        return 'photo_library';
      case 'message':
        return 'mail';
      case 'settings':
        return 'settings';
      case 'page':
        return 'description';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'member':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'event':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'post':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'gallery':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case 'message':
        return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
      case 'settings':
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
      case 'page':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Latest updates across your club
          </p>
        </div>
        <div className="p-8 text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Latest updates across your club
        </p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-700 mb-2">
              notifications_off
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconColor(activity.type)}`}>
                  <span className="material-symbols-outlined text-[20px]">{getIcon(activity.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.userName && (
                      <>
                        <span className="text-xs text-gray-400">{activity.userName}</span>
                        <span className="text-xs text-gray-300 dark:text-gray-700">•</span>
                      </>
                    )}
                    <span className="text-xs text-gray-400">{getRelativeTime(activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Link 
          href="/admin/activity" 
          className="block w-full text-center text-sm font-medium text-primary hover:text-blue-700 transition-colors"
        >
          View all activity
        </Link>
      </div>
    </div>
  );
}
