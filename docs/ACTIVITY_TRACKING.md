# Activity Tracking System

The activity tracking system logs all significant actions performed in the admin dashboard, providing a comprehensive audit trail of changes to members, events, posts, gallery items, and more.

## Features

- 📊 **Real-time Activity Logging**: Automatically tracks all admin actions
- 🔍 **Activity Filtering**: Filter by activity type (members, events, posts, etc.)
- 📅 **Chronological Timeline**: View all activities in reverse chronological order
- 👤 **User Attribution**: See who performed each action
- 🎨 **Visual Indicators**: Color-coded icons for different activity types
- 🔗 **Quick Navigation**: Link from activities to related resources

## Components

### 1. Activity Logging Library (`lib/admin/activities.ts`)

Core utilities for logging and retrieving activities:

```typescript
import { logActivity } from '@/lib/admin/activities'

// Log a new activity
await logActivity({
  type: 'member',
  action: 'created',
  title: 'New member joined',
  description: 'John Doe joined the club',
  userId: admin.uid,
  userName: admin.email,
  metadata: { memberId: '123', memberEmail: 'john@example.com' }
})
```

### 2. Recent Activity Component

Dashboard widget showing the 5 most recent activities:
- Location: [app/admin/_components/RecentActivity.tsx](app/admin/_components/RecentActivity.tsx)
- Fetches from `/api/admin/activities?limit=5`
- Auto-refreshes on dashboard load
- Links to full activity page

### 3. Activity Page

Full-page view of all activities with filtering:
- Location: [app/admin/activity/page.tsx](app/admin/activity/page.tsx)
- URL: `/admin/activity`
- Features:
  - Filter by activity type
  - View up to 50 activities at once
  - Displays full timestamp and user information
  - Color-coded badges and icons

### 4. API Endpoint

RESTful API for fetching activities:
- Endpoint: `/api/admin/activities`
- Query params:
  - `limit`: Number of activities to fetch (default: 20)
  - `type`: Filter by activity type (member, event, post, gallery, message, settings, page)

## Activity Types

| Type | Icon | Color | Description |
|------|------|-------|-------------|
| `member` | person_add | Blue | Member-related actions |
| `event` | event | Purple | Event creation/updates |
| `post` | article | Green | Blog post actions |
| `gallery` | photo_library | Orange | Gallery uploads |
| `message` | mail | Pink | Message-related actions |
| `settings` | settings | Gray | Settings changes |
| `page` | description | Indigo | Page modifications |

## Integration Guide

### Adding Activity Logging to a New Endpoint

1. Import the logging function:
```typescript
import { logActivity } from '@/lib/admin/activities'
```

2. Call after the action completes:
```typescript
await logActivity({
  type: 'event',
  action: 'created',
  title: 'Event created',
  description: `${eventTitle} was published`,
  userId: admin.uid,
  userName: admin.email || 'Admin',
  metadata: { eventId: docId, eventTitle }
})
```

### Metadata Guidelines

Include relevant context in the `metadata` field:
- IDs of affected resources
- Important field values
- Action-specific details

Example:
```typescript
metadata: {
  memberId: 'abc123',
  memberEmail: 'user@example.com',
  memberStatus: 'active'
}
```

## Database Schema

### Firestore Collection: `activities`

```typescript
{
  type: 'member' | 'event' | 'post' | 'gallery' | 'message' | 'settings' | 'page',
  action: string,           // e.g., 'created', 'updated', 'deleted', 'published'
  title: string,            // Short title for the activity
  description: string,      // Detailed description
  userId?: string,          // UID of the user who performed the action
  userName?: string,        // Name or email of the user
  userEmail?: string,       // User's email
  metadata?: object,        // Additional context
  createdAt: Timestamp      // When the activity occurred
}
```

### Indexes

Create these indexes in Firestore for optimal performance:

1. Single-field index:
   - Field: `createdAt`, Order: Descending

2. Composite indexes:
   - `type` (Ascending) + `createdAt` (Descending)

## Seeding Sample Data

To add sample activities for testing:

```bash
node scripts/seed-activities.js
```

This creates 6 sample activities spanning different types and timeframes.

## API Examples

### Fetch Recent Activities
```javascript
const response = await fetch('/api/admin/activities?limit=5')
const data = await response.json()
console.log(data.activities)
```

### Filter by Type
```javascript
const response = await fetch('/api/admin/activities?type=member&limit=10')
const data = await response.json()
```

## Relative Time Formatting

The system includes a helper to display human-readable timestamps:

```typescript
import { getRelativeTime } from '@/lib/admin/activities'

getRelativeTime(date) // "2 hours ago", "1 day ago", etc.
```

## Endpoints with Activity Logging

The following endpoints currently log activities:

- ✅ **Members API** (`/api/admin/members`)
  - POST: Log new member creation
  - PUT: Log member updates
  
- ✅ **Events API** (`/api/admin/events`)
  - POST: Log event creation/updates
  
- ✅ **Posts API** (`/api/admin/posts`)
  - POST: Log post creation
  
- ✅ **Gallery API** (`/api/admin/gallery`)
  - POST: Log gallery uploads

## Future Enhancements

Potential improvements for the activity system:

- [ ] Add activity search functionality
- [ ] Export activities to CSV
- [ ] Email notifications for critical activities
- [ ] Activity charts and analytics
- [ ] Bulk action logging
- [ ] Activity restoration/undo feature
- [ ] Webhook integration for external systems

## Troubleshooting

### Activities not appearing

1. Check Firestore permissions
2. Verify the admin is authenticated
3. Check browser console for API errors
4. Ensure `logActivity` is called after successful operations

### Missing activity details

Ensure all required fields are provided:
- `type`
- `action`
- `title`
- `description`

### Performance issues

- Limit query results (default: 20)
- Add Firestore indexes
- Consider pagination for large result sets

## Related Documentation

- [Admin Dashboard Guide](./ADMIN_POSTS_GUIDE.md)
- [Portal Architecture](./PORTAL_ARCHITECTURE.md)
- [API Documentation](./ARCHITECTURE.md)
