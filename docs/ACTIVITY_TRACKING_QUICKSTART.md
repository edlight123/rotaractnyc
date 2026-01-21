# Activity Tracking System - Quick Start

## Overview
Dynamic activity tracking system that logs all admin actions (members, events, posts, gallery uploads) with real-time updates.

## What's New

### 1. Recent Activity Widget (Dashboard)
- Shows 5 most recent activities
- Auto-refreshes on page load
- Links to full activity log
- Location: Admin Dashboard (right column)

### 2. Full Activity Page
- URL: `/admin/activity`
- Filter by activity type
- Shows up to 50 activities
- Full timestamps and user attribution

### 3. API Endpoint
```
GET /api/admin/activities?limit=20&type=member
```

## Quick Usage

### View Activities in Dashboard
1. Navigate to admin dashboard
2. See "Recent Activity" widget on the right
3. Click "View all activity" to see full log

### Filter Activities
1. Go to `/admin/activity`
2. Click filter buttons at the top
3. Activities update instantly

### Seed Sample Data
```bash
node scripts/seed-activities.js
```

## Integration Points

Activity logging is automatically triggered for:
- ✅ Member creation/updates
- ✅ Event creation/updates
- ✅ Post creation
- ✅ Gallery uploads

## Files Created/Modified

### New Files
- `lib/admin/activities.ts` - Core activity utilities
- `app/api/admin/activities/route.ts` - API endpoint
- `app/admin/activity/page.tsx` - Full activity page
- `hooks/useActivities.ts` - React hook for fetching
- `scripts/seed-activities.js` - Sample data seeder
- `docs/ACTIVITY_TRACKING.md` - Full documentation

### Modified Files
- `app/admin/_components/RecentActivity.tsx` - Now fetches real data
- `app/api/admin/members/route.ts` - Logs member activities
- `app/api/admin/events/route.ts` - Logs event activities
- `app/api/admin/posts/route.ts` - Logs post activities
- `app/api/admin/gallery/route.ts` - Logs gallery activities

## Database Collection

Collection: `activities`

```typescript
{
  type: 'member' | 'event' | 'post' | 'gallery' | 'message' | 'settings' | 'page',
  action: 'created' | 'updated' | 'deleted' | 'published',
  title: string,
  description: string,
  userId: string,
  userName: string,
  metadata: object,
  createdAt: Timestamp
}
```

## Required Firestore Indexes

1. `createdAt` (Descending)
2. `type` (Ascending) + `createdAt` (Descending)

These will be created automatically on first query, or you can create them manually in Firebase Console.

## Testing

1. **Seed data**: `node scripts/seed-activities.js`
2. **View dashboard**: Navigate to admin dashboard
3. **Create something**: Add a member, event, or post
4. **Check activity log**: Should appear in Recent Activity and `/admin/activity`

## Next Steps

To add activity logging to a new feature:

```typescript
import { logActivity } from '@/lib/admin/activities'

// After successful operation
await logActivity({
  type: 'member',
  action: 'created',
  title: 'New member joined',
  description: `${name} joined the club`,
  userId: admin.uid,
  userName: admin.email,
  metadata: { memberId: id }
})
```

## Support

See full documentation: [docs/ACTIVITY_TRACKING.md](./ACTIVITY_TRACKING.md)
