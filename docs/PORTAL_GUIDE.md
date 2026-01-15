# Members Portal Documentation

## Overview

The Rotaract NYC Members Portal is a secure, role-based application for club members to access events, announcements, documents, member directory, and financial information.

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Authentication**: Firebase Auth (Google Sign-in)
- **Database**: Cloud Firestore
- **Authorization**: Firebase Custom Claims + Firestore Security Rules

## Architecture

### Collections

#### users/{uid}
- **Fields**: name, email, photoURL, role, status, committee, phoneOptIn, phone, whatsapp, linkedin, createdAt, updatedAt
- **Roles**: MEMBER, BOARD, TREASURER, ADMIN
- **Status**: active, inactive
- **Access**: Members can read active users; admins can manage roles

#### events/{eventId}
- **Fields**: title, description, startAt, endAt, location, visibility, createdBy, createdAt, updatedAt
- **Visibility**: public, member, board
- **RSVPs**: Subcollection at events/{eventId}/rsvps/{uid}
- **Access**: Members can read/RSVP; board+ can create/edit

#### announcements/{id}
- **Fields**: title, body, pinned, visibility, createdBy, createdAt
- **Access**: Members can read; board+ can create/edit

#### documents/{id}
- **Fields**: title, category, url, visibility, createdBy, createdAt
- **Access**: Members can read; board+ can create/edit

#### transactions/{id}
- **Fields**: date, vendor, category, eventId, amount, noteForMembers, receiptUrl, visibility, createdBy, createdAt
- **Access**: Members can read member-visible; treasurer+ can create/edit

#### monthlySummaries/{YYYY-MM}
- **Fields**: month, startingBalance, incomeTotal, expenseTotal, endingBalance, categoryTotals, notes, updatedAt
- **Access**: Members can read; treasurer+ can write

## Role Hierarchy

1. **MEMBER** - Basic access to member-visible content
2. **BOARD** - Can manage events, announcements, documents
3. **TREASURER** - Board + can manage finances
4. **ADMIN** - Full access + user management

## Key Features

### Authentication & Authorization
- Google Sign-in via Firebase Auth
- Session cookies for server-side auth
- Custom claims for role-based access
- Middleware protection for /portal routes

### Portal Pages

#### Dashboard (`/portal`)
- Welcome message with user info
- Quick links to all portal sections
- Upcoming events preview
- Recent announcements feed

#### Directory (`/portal/directory`)
- List of all active members
- Search by name, email, committee
- Filter by role and committee
- Contact information (email, phone, WhatsApp, LinkedIn)

#### Events (`/portal/events`)
- Upcoming events list
- Event details with date, time, location
- RSVP functionality (Going, Maybe, Can't Go)
- Real-time RSVP status updates

#### Announcements (`/portal/announcements`)
- Feed of club announcements
- Pinned announcements highlighted
- Chronological order (newest first)

#### Documents (`/portal/docs`)
- Categorized document library
- Filter by category
- Direct download links
- Upload date tracking

#### Finance (`/portal/finance`)
- Treasurer+ only
- Monthly financial summaries
- Income/expense breakdowns
- Category totals
- Transactions table with filters
- Receipt downloads

## API Routes

### Authentication
- `POST /api/portal/auth/session` - Create session cookie
- `DELETE /api/portal/auth/session` - Delete session cookie

### Admin
- `POST /api/portal/admin/set-role` - Set user role (admin only)

### Finance
- `POST /api/portal/finance/recompute-summary` - Recompute monthly summary (treasurer+ only)

## Security

### Firestore Rules
- Authentication required for all portal access
- Role-based read/write permissions via custom claims
- Members can only write their own RSVPs
- Visibility-based content filtering

### Middleware
- Redirects unauthenticated users to login
- Protects all `/portal/*` routes except `/portal/login`
- Session cookie validation

### Server-Side Authorization
- `getPortalSession()` - Get current session
- `requirePortalSession()` - Require authentication
- `requireRole(role)` - Require specific role

## Setup Instructions

### 1. Firebase Configuration

Set the following environment variables:

```env
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server)
FIREBASE_SERVICE_ACCOUNT_BASE64=  # Base64-encoded service account JSON
# OR use split variables:
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Create First Admin User

1. User signs in with Google
2. Run this script to promote them to admin:

```javascript
// Use Firebase Admin SDK or Cloud Function
const admin = require('firebase-admin');
admin.auth().setCustomUserClaims(uid, { role: 'ADMIN' });
```

Or use the API route (if you already have an admin):
```bash
curl -X POST https://your-domain.com/api/portal/admin/set-role \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","role":"ADMIN"}'
```

### 4. Seed Initial Data

Create a user document in Firestore for the first admin:

```javascript
db.collection('users').doc(uid).set({
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN',
  status: 'active',
  phoneOptIn: false,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## Development

### Run locally
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel --prod
```

## Future Enhancements

- [ ] Email notifications for new announcements/events
- [ ] Calendar integration (Google Calendar, iCal)
- [ ] Photo gallery from events
- [ ] Member profile editing
- [ ] Committee-specific pages
- [ ] Meeting minutes archive
- [ ] Attendance tracking
- [ ] Volunteer hours tracking
- [ ] Mobile app (React Native)

## Support

For issues or questions, contact the technical team at tech@rotaractnyc.org

## License

© 2026 Rotaract Club of New York City. All rights reserved.
