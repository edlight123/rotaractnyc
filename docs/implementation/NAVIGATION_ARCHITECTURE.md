# Admin & Portal Navigation Flow

## Navigation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ROTARACT NYC WEBSITE                      │
│                         (Public)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌───────────────────┐            ┌──────────────────┐
│  MEMBER PORTAL    │◄──────────►│  ADMIN PORTAL    │
│   /portal/*       │            │   /admin/*       │
└───────────────────┘            └──────────────────┘
        │                                 │
        │                                 │
        ▼                                 ▼
┌───────────────────┐            ┌──────────────────┐
│ Portal Features:  │            │ Admin Features:  │
│                   │            │                  │
│ • Community Feed  │            │ • Dashboard      │
│ • Announcements   │            │ • Members Mgmt   │
│ • Events Calendar │            │ • Events Mgmt    │
│ • Directory       │            │ • Content Mgmt   │
│ • Resources/Docs  │            │ • Gallery Mgmt   │
│ • Finance         │            │ • Messages       │
│   (Treasurer+)    │            │ • Pages Mgmt     │
│ • Settings        │            │ • Settings       │
└───────────────────┘            └──────────────────┘
```

## Cross-Navigation Points

### Portal → Admin
**Who can access:** Users with `role === 'ADMIN'`

**Access points:**
1. Top navigation bar (AdminNav)
   - "Admin" button with admin icon
   - Visible next to notifications
   
2. Profile dropdown menu
   - "Admin" option
   - Below "Settings", above "Sign out"

**Implementation:**
```typescript
{isAdmin(userData?.role) && (
  <Link href="/admin">
    <span className="material-symbols-outlined">admin_panel_settings</span>
    Admin
  </Link>
)}
```

### Admin → Portal
**Who can access:** All authenticated admin users

**Access points:**
1. Top navigation bar (AdminNav)
   - "Portal" button with groups icon
   - Next to notifications and profile
   
2. Sidebar navigation (AdminSidebar)
   - "Member Portal" link
   - In footer section above sign out

**Implementation:**
```typescript
<Link href="/portal">
  <span className="material-symbols-outlined">groups</span>
  Member Portal
</Link>
```

## Authentication Flow

### Portal Authentication
```
/portal/login → Firebase Auth → /portal (dashboard)
                                   ↓
                          Check userData.status
                                   ↓
                    'active' → Show portal content
                    'pending' → Show approval message
```

### Admin Authentication
```
/admin/login → Admin Session → /admin → /admin/dashboard
                                            ↓
                                Check session.status
                                            ↓
                        'authenticated' → Show admin content
                        'unauthenticated' → Redirect to login
```

## Component Hierarchy

### Portal Layout
```
app/portal/layout.tsx
├── AuthProvider
└── PortalNav
    ├── Logo
    ├── Search
    ├── Navigation Items
    └── User Actions
        ├── Admin Link (if isAdmin)
        ├── Notifications
        └── Profile Menu
            ├── Settings
            ├── Admin (if isAdmin)
            └── Sign Out
```

### Admin Layout
```
app/admin/layout.tsx
├── AdminShell (authenticated)
└── AdminNav
    ├── Logo + Admin Badge
    ├── Search
    ├── Navigation Items
    └── User Actions
        ├── Portal Link
        ├── Notifications
        └── Profile Menu
            ├── Settings
            └── Sign Out
```

## Role-Based Access Control

### Roles Hierarchy
```
MEMBER (1) ─┐
            ├─► Can access: Portal basic features
BOARD (2) ──┤
            ├─► Can access: + Board content, manage events/announcements
TREASURER (3)┤
            ├─► Can access: + Finance section
ADMIN (4) ──┘
            └─► Can access: + Admin portal (all features)
```

### Permission Functions
```typescript
// lib/portal/roles.ts
- isMember(role)              // MEMBER+
- isBoard(role)               // BOARD+
- isTreasurer(role)           // TREASURER+
- isAdmin(role)               // ADMIN only
- canManageFinances(role)     // TREASURER+
- canManageEvents(role)       // BOARD+
- canManageAnnouncements(role)// BOARD+
```

## Key Design Patterns

### Consistent Navigation
- Both portals use sticky top navigation
- Same icon library (Material Symbols)
- Similar color schemes and hover states
- Unified search bar design

### Responsive Design
- Mobile: Hamburger menu
- Tablet: Condensed navigation
- Desktop: Full navigation with labels

### Dark Mode Support
- Both portals support dark mode
- Consistent color tokens
- Automatic theme switching

### Loading States
- Spinner during authentication
- Skeleton screens for content
- Graceful error handling

## User Journeys

### Admin User Journey
```
1. Login to admin portal (/admin/login)
2. View dashboard with stats and activity
3. Perform admin tasks (manage members, events, etc.)
4. Switch to member portal to see member view
5. Return to admin portal when needed
```

### Board Member Journey
```
1. Login to member portal (/portal/login)
2. View community feed and announcements
3. Access board-specific features (manage events)
4. No admin link visible (not an admin)
5. Use portal features within role permissions
```

### Treasurer Journey
```
1. Login to member portal (/portal/login)
2. View community feed and announcements
3. Access finance section (treasurer privilege)
4. Manage financial records
5. No admin link visible (not an admin)
```

## Technical Implementation

### File Locations
- Portal Nav: `/app/portal/_components/PortalNav.tsx`
- Admin Nav: `/app/admin/_components/AdminNav.tsx`
- Admin Sidebar: `/app/admin/_components/AdminSidebar.tsx`
- Roles: `/lib/portal/roles.ts`
- Types: `/types/portal.ts`

### Key Technologies
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Authentication**: 
  - Portal: Firebase Auth
  - Admin: Custom session (useAdminSession)
- **State**: React Hooks (useState, useEffect)
- **Routing**: Next.js file-based routing
- **Icons**: Material Symbols Outlined

## Summary

✅ **Unified Experience**: Both portals feel cohesive and professional
✅ **Easy Navigation**: Clear paths between admin and member areas
✅ **Role-Based**: Appropriate features shown based on user role
✅ **Modern Design**: Card-based layouts, clean typography, smooth transitions
✅ **Accessible**: Keyboard navigation, ARIA labels, semantic HTML
✅ **Responsive**: Works on mobile, tablet, and desktop
✅ **Dark Mode**: Full support across both portals
