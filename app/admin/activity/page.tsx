'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/admin/useAdminSession';
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
  metadata?: Record<string, any>;
}

const activityTypes = [
  { value: '', label: 'All Activities' },
  { value: 'member', label: 'Members' },
  { value: 'event', label: 'Events' },
  { value: 'post', label: 'Posts' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'message', label: 'Messages' },
  { value: 'page', label: 'Pages' },
  { value: 'settings', label: 'Settings' },
];

export default function ActivityPage() {
  const session = useAdminSession();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (session.status === 'authenticated') {
      fetchActivities();
    }
  }, [session.status, filter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter) params.append('type', filter);
      
      const response = await fetch(`/api/admin/activities?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      setActivities(data.activities || []);
      setHasMore(data.hasMore || false);
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

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'member':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'event':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'post':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'gallery':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'message':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
      case 'settings':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'page':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (session.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track all actions and changes across your club
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-wrap gap-2">
          {activityTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === type.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4 block">
              notifications_off
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No activities found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filter ? 'Try selecting a different filter' : 'Activities will appear here as actions are performed'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`size-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconColor(activity.type)}`}>
                    <span className="material-symbols-outlined text-[24px]">
                      {getIcon(activity.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {activity.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(activity.type)}`}>
                            {activity.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          {activity.userName && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">person</span>
                              <span>{activity.userName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            <span>{getRelativeTime(activity.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-600 whitespace-nowrap">
                        {new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {hasMore && !loading && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <button
              onClick={fetchActivities}
              className="text-sm font-medium text-primary hover:text-blue-700 transition-colors"
            >
              Load more activities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
