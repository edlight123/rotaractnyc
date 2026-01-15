# Members Portal Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Dashboard  │  │  Directory   │  │    Events    │          │
│  │  /portal     │  │  /directory  │  │   /events    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Announcements│  │  Documents   │  │   Finance    │          │
│  │/announcements│  │    /docs     │  │  /finance    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│                    ↕ AuthProvider                                │
│              (Firebase Client SDK)                               │
│                                                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ↓                       ↓
        ┌──────────────────┐    ┌──────────────────┐
        │  Firebase Auth   │    │   Firestore DB   │
        │   (Google SSO)   │    │  (Client Reads)  │
        └──────────────────┘    └──────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Middleware                             │ │
│  │  - Protect /portal routes                                   │ │
│  │  - Validate session cookies                                 │ │
│  │  - Redirect unauthenticated users                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│  ┌────────────────────────────┼──────────────────────────────┐ │
│  │         API Routes         │                               │ │
│  │  ┌─────────────────────────┴──────────────────┐           │ │
│  │  │  /api/portal/auth/session                  │           │ │
│  │  │    POST:   Create session cookie           │           │ │
│  │  │    DELETE: Clear session cookie            │           │ │
│  │  └────────────────────────────────────────────┘           │ │
│  │  ┌───────────────────────────────────────────────────────┐│ │
│  │  │  /api/portal/admin/set-role                           ││ │
│  │  │    POST: Set user role (admin only)                   ││ │
│  │  │    - Update custom claims                             ││ │
│  │  │    - Update Firestore user doc                        ││ │
│  │  └───────────────────────────────────────────────────────┘│ │
│  │  ┌───────────────────────────────────────────────────────┐│ │
│  │  │  /api/portal/finance/recompute-summary                ││ │
│  │  │    POST: Recompute monthly summary (treasurer+)       ││ │
│  │  │    - Calculate income/expense totals                  ││ │
│  │  │    - Generate category breakdowns                     ││ │
│  │  └───────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│  ┌────────────────────────────┼──────────────────────────────┐ │
│  │      Server Utilities      │                               │ │
│  │  ┌─────────────────────────┴──────────────────┐           │ │
│  │  │  lib/portal/auth.ts                        │           │ │
│  │  │    - getPortalSession()                    │           │ │
│  │  │    - requirePortalSession()                │           │ │
│  │  │    - requireRole(role)                     │           │ │
│  │  └────────────────────────────────────────────┘           │ │
│  │  ┌────────────────────────────────────────────┐           │ │
│  │  │  lib/portal/firestore.ts                   │           │ │
│  │  │    - CRUD operations for all collections   │           │ │
│  │  │    - Type-safe Admin SDK wrapper           │           │ │
│  │  └────────────────────────────────────────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ↓                       ↓
        ┌──────────────────┐    ┌──────────────────┐
        │  Firebase Auth   │    │   Firestore DB   │
        │  (Admin SDK)     │    │ (Admin SDK)      │
        │  - Set claims    │    │ - Privileged ops │
        │  - Verify tokens │    │ - Server writes  │
        └──────────────────┘    └──────────────────┘
```

## Data Flow

### 1. Authentication Flow
```
User clicks "Sign in"
       ↓
Client: signInWithPopup(GoogleAuthProvider)
       ↓
Google OAuth
       ↓
Client: getIdToken()
       ↓
POST /api/portal/auth/session { idToken }
       ↓
Server: verifyIdToken() + createSessionCookie()
       ↓
Set HTTP-only cookie
       ↓
Redirect to /portal
```

### 2. Authorization Flow (Page Load)
```
User visits /portal/events
       ↓
Middleware: Check session cookie
       ↓
Valid? → Continue
Invalid? → Redirect to /portal/login
       ↓
Page: Load user data from Firestore (client SDK)
       ↓
Check role for UI elements
       ↓
Fetch events (filtered by visibility)
       ↓
Render page
```

### 3. RSVP Flow
```
User clicks "Going" on event
       ↓
Client: setDoc(events/{id}/rsvps/{uid}, { status: 'going' })
       ↓
Firestore: Check security rules
  - User authenticated? ✓
  - Writing own RSVP? ✓
  - Has MEMBER+ role? ✓
       ↓
Write succeeds
       ↓
Update local state
       ↓
UI updates with new status
```

### 4. Role Management Flow (Admin)
```
Admin calls POST /api/portal/admin/set-role
       ↓
Server: requireRole('ADMIN')
       ↓
Server: getUserByEmail(email)
       ↓
Server: setCustomUserClaims(uid, { role })
       ↓
Server: Update Firestore user doc
       ↓
User must sign out/in for claims to refresh
       ↓
New role active
```

## Security Layers

```
┌─────────────────────────────────────────────────┐
│         Layer 1: Middleware                     │
│  - Session cookie validation                    │
│  - Redirect unauthenticated users               │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│         Layer 2: Server Auth Checks             │
│  - requirePortalSession()                       │
│  - requireRole(minRole)                         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│         Layer 3: Firestore Rules                │
│  - Check custom claims (role)                   │
│  - Validate visibility field                    │
│  - Enforce collection-specific rules            │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│         Layer 4: Client Role Guards             │
│  - Hide UI elements based on role               │
│  - Prevent unauthorized actions                 │
└─────────────────────────────────────────────────┘
```

## Collections & Access Matrix

```
Collection          │ Read Access         │ Write Access
────────────────────┼────────────────────┼─────────────────────
users               │ All members         │ Admin (role/status)
                    │                     │ Self (limited fields)
────────────────────┼────────────────────┼─────────────────────
events              │ Members (visibility)│ Board+
                    │ Public (public)     │
────────────────────┼────────────────────┼─────────────────────
events/.../rsvps    │ Members             │ Self only
────────────────────┼────────────────────┼─────────────────────
announcements       │ Members (visibility)│ Board+
────────────────────┼────────────────────┼─────────────────────
documents           │ Members (visibility)│ Board+
────────────────────┼────────────────────┼─────────────────────
transactions        │ Members (visibility)│ Treasurer+
────────────────────┼────────────────────┼─────────────────────
monthlySummaries    │ Members             │ Treasurer+
```

## Role Hierarchy

```
      ADMIN (4)
         │
         │ Can manage users
         │
    TREASURER (3)
         │
         │ Can manage finances
         │
      BOARD (2)
         │
         │ Can manage content
         │
     MEMBER (1)
         │
         │ Can view & RSVP
         │
```

## Tech Stack

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  • Next.js 14 (App Router)                              │
│  • React 18                                              │
│  • TypeScript                                            │
│  • Tailwind CSS                                          │
│  • React Icons                                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   Authentication                         │
│  • Firebase Auth (Google OAuth)                         │
│  • Session Cookies (HTTP-only)                          │
│  • Custom Claims (role-based)                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                      Database                            │
│  • Cloud Firestore                                       │
│  • Security Rules                                        │
│  • Real-time updates                                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   Backend/Server                         │
│  • Next.js API Routes                                    │
│  • Firebase Admin SDK                                    │
│  • Server-side session validation                       │
└──────────────────────────────────────────────────────────┘
```

## File Structure

```
rotaractnyc/
├── app/
│   ├── portal/
│   │   ├── layout.tsx              # Auth provider wrapper
│   │   ├── page.tsx                # Dashboard
│   │   ├── login/page.tsx          # Login page
│   │   ├── directory/page.tsx      # Member directory
│   │   ├── events/page.tsx         # Events + RSVP
│   │   ├── announcements/page.tsx  # Announcements feed
│   │   ├── docs/page.tsx           # Documents
│   │   ├── finance/page.tsx        # Finance (treasurer+)
│   │   └── _components/
│   │       └── PortalNav.tsx       # Navigation
│   └── api/
│       └── portal/
│           ├── auth/session/       # Session management
│           ├── admin/set-role/     # Role management
│           └── finance/recompute/  # Finance aggregation
├── lib/
│   ├── firebase/
│   │   ├── admin.ts                # Admin SDK init
│   │   ├── client.ts               # Client SDK init
│   │   └── auth.tsx                # Auth context provider
│   └── portal/
│       ├── auth.ts                 # Server auth utilities
│       ├── roles.ts                # Role guards
│       └── firestore.ts            # CRUD helpers
├── types/
│   └── portal.ts                   # TypeScript types
├── firestore.rules                 # Security rules
├── middleware.ts                   # Route protection
└── scripts/
    └── seed-portal.js              # Seed script
```

## Key Design Decisions

### 1. **Session Cookies over Client Tokens**
- More secure (HTTP-only)
- Server-side validation
- Automatic CSRF protection

### 2. **Custom Claims for Roles**
- Can be used in Firestore rules
- Consistent across client/server
- No additional database lookups

### 3. **Client SDK for Reads, Admin SDK for Writes**
- Client: Read member-visible data
- Server: Privileged operations
- Security rules enforce access

### 4. **Role Hierarchy**
- Simple integer-based system
- Easy to check: userLevel >= requiredLevel
- Extensible for future roles

### 5. **Visibility Field Pattern**
- Consistent across collections
- Easy to filter in queries
- Supports graduated access (public → member → board)

---

**Architecture designed for security, scalability, and maintainability.**
