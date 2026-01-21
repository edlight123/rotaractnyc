# Members Portal - Quick Start Guide

## 🚀 What's Been Implemented

A complete members portal with Firebase Auth + Firestore, featuring:

- ✅ **Authentication**: Google Sign-in with session cookies
- ✅ **Role-based Access**: 4 roles (MEMBER, BOARD, TREASURER, ADMIN)
- ✅ **6 Portal Pages**:
  - Dashboard with quick links and summaries
  - Member Directory with search/filters
  - Events with RSVP functionality
  - Announcements feed
  - Documents library
  - Finance dashboard (treasurer+ only)
- ✅ **Firestore Security Rules**: Role-based read/write permissions
- ✅ **API Routes**: Session management, role setting, finance aggregation
- ✅ **Admin Tools**: User role management, data seeding

## 📂 Key Files Created

### Core Authentication & Types
- `types/portal.ts` - TypeScript interfaces for all collections
- `lib/firebase/auth.tsx` - Auth context provider with Google sign-in
- `lib/portal/auth.ts` - Server-side session utilities
- `lib/portal/roles.ts` - Role guard functions

### Portal Pages
- `app/portal/layout.tsx` - Portal layout with navigation
- `app/portal/login/page.tsx` - Login page
- `app/portal/page.tsx` - Dashboard
- `app/portal/directory/page.tsx` - Member directory
- `app/portal/events/page.tsx` - Events with RSVP
- `app/portal/announcements/page.tsx` - Announcements feed
- `app/portal/docs/page.tsx` - Documents library
- `app/portal/finance/page.tsx` - Finance dashboard

### Components
- `app/portal/_components/PortalNav.tsx` - Navigation bar

### API Routes
- `app/api/portal/auth/session/route.ts` - Session management
- `app/api/portal/admin/set-role/route.ts` - Set user roles
- `app/api/portal/finance/recompute-summary/route.ts` - Recompute monthly summaries

### Configuration & Utilities
- `firestore.rules` - Updated with role-based security rules
- `middleware.ts` - Updated to protect /portal routes
- `scripts/seed-portal.js` - Seed script for initial data
- `docs/PORTAL_GUIDE.md` - Comprehensive documentation

## 🔧 Setup Steps

### 1. Install Dependencies (if needed)
```bash
npm install
```

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 3. Create First Admin
After a user signs in with Google, promote them to admin:

```bash
npm run seed:portal -- --admin user@example.com
```

Or manually using Firebase Console:
1. Go to Firebase Console → Authentication
2. Find the user
3. Copy their UID
4. Go to Firestore → Create document in `users` collection:
```json
{
  "uid": "user-uid-here",
  "name": "Admin Name",
  "email": "admin@example.com",
  "role": "ADMIN",
  "status": "active",
  "phoneOptIn": false,
  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z"
}
```

### 4. Optional: Add Sample Data
```bash
npm run seed:portal -- --sample-data
```

## 🎯 How to Use

### Accessing the Portal
1. Navigate to `/portal`
2. Click "Sign in with Google"
3. Authorize with your Google account
4. You'll be redirected to the dashboard

### Managing Users (Admin Only)
Use the API endpoint to set user roles:

```bash
curl -X POST https://your-domain.com/api/portal/admin/set-role \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","role":"BOARD"}'
```

### Adding Content
Content is managed through Firestore. You can:
1. Use Firebase Console to manually add documents
2. Build admin UI pages (similar to existing admin panel)
3. Use Firebase Admin SDK in scripts

### Finance Management
Treasurers can:
1. Add transactions to Firestore
2. Call `/api/portal/finance/recompute-summary` to update monthly totals
3. View summaries and transactions on `/portal/finance`

## 🔐 Security

### Role Hierarchy
- **MEMBER**: Can view member-visible content, RSVP to events
- **BOARD**: Member + can manage events, announcements, documents
- **TREASURER**: Board + can manage finances
- **ADMIN**: Full access + can manage user roles

### Firestore Rules
All portal collections have role-based rules:
- Authentication required
- Custom claims checked for role
- Visibility field controls access
- Members can only edit their own RSVPs

### Session Management
- Session cookies (14-day expiry)
- HTTP-only, secure in production
- Server-side validation on all protected routes

## 📊 Collections Schema

### users/{uid}
```typescript
{
  name: string
  email: string
  photoURL?: string
  role: 'MEMBER' | 'BOARD' | 'TREASURER' | 'ADMIN'
  status: 'active' | 'inactive'
  committee?: string
  phoneOptIn: boolean
  phone?: string
  whatsapp?: string
  linkedin?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### events/{eventId}
```typescript
{
  title: string
  description: string
  startAt: Timestamp
  endAt: Timestamp
  location: string
  visibility: 'public' | 'member' | 'board'
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### events/{eventId}/rsvps/{uid}
```typescript
{
  status: 'going' | 'maybe' | 'not'
  updatedAt: Timestamp
}
```

See `types/portal.ts` for complete type definitions.

## 🧪 Testing

1. **Test Authentication**:
   - Visit `/portal`
   - Should redirect to `/portal/login`
   - Sign in with Google
   - Should redirect to dashboard

2. **Test Role Guards**:
   - As MEMBER: Can't access `/portal/finance`
   - As TREASURER: Can access all pages

3. **Test RSVP**:
   - Go to `/portal/events`
   - Click RSVP buttons
   - Verify status updates

## 🚧 Next Steps

Consider adding:
- [ ] Admin UI for content management (events, announcements, etc.)
- [ ] Email notifications via Resend
- [ ] Profile editing page
- [ ] Calendar export (iCal)
- [ ] Search functionality across all content
- [ ] Activity feed
- [ ] Mobile responsiveness improvements

## 📝 Notes

- **No Prisma/SQL**: Pure Firebase/Firestore implementation
- **Server-side privileged operations**: Use Firebase Admin SDK
- **Client-side reads only**: Members use Firebase Client SDK with security rules
- **Custom claims**: Roles stored as Firebase custom claims for security rules

## 🆘 Troubleshooting

**Problem**: User can't access portal after login
- Check if user document exists in Firestore
- Verify user has `status: 'active'`
- Ensure custom claims are set (may need to sign out/in)

**Problem**: "Unauthorized" errors
- Check session cookie exists
- Verify middleware is protecting routes
- Check Firestore rules are deployed

**Problem**: Finance page shows "insufficient permissions"
- User needs TREASURER or ADMIN role
- Call `/api/portal/admin/set-role` to update

## 📚 Documentation

See [`docs/PORTAL_GUIDE.md`](docs/PORTAL_GUIDE.md) for comprehensive documentation.
