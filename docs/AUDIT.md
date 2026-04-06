# 🔍 Rotaract NYC — Full Website Audit

> **Audit Date:** April 6, 2026
> **Auditor:** Automated code review
> **Scope:** Entire codebase — public site, member portal, API routes, security, accessibility, performance, testing, infrastructure
> **Codebase:** Next.js 14 / React 18 / Firebase / Stripe / Tailwind CSS / Vercel

---

## Table of Contents

- [Scorecard](#scorecard)
- [1. App Layout & Core Pages](#1-app-layout--core-pages)
- [2. SEO & Metadata](#2-seo--metadata)
- [3. Public Pages](#3-public-pages)
- [4. API Routes](#4-api-routes)
- [5. Portal Pages](#5-portal-pages)
- [6. Components & UI](#6-components--ui)
- [7. Security](#7-security)
- [8. Accessibility](#8-accessibility)
- [9. Lib, Utils & Services](#9-lib-utils--services)
- [10. Types](#10-types)
- [11. Test Coverage](#11-test-coverage)
- [12. PWA & Offline](#12-pwa--offline)
- [13. Configuration & Infrastructure](#13-configuration--infrastructure)
- [14. Email System](#14-email-system)
- [15. Stripe & Payments](#15-stripe--payments)
- [16. Firebase Rules](#16-firebase-rules)
- [17. Performance](#17-performance)
- [Appendix: File Index](#appendix-file-index)

---

## Scorecard

| Area | Grade | Critical | Medium | Low |
|------|:-----:|:--------:|:------:|:---:|
| App Layout & Core | **A-** | 0 | 2 | 2 |
| SEO & Metadata | **B** | 2 | 0 | 1 |
| Public Pages | **B** | 2 | 3 | 2 |
| API Routes | **B-** | 2 | 5 | 3 |
| Portal Pages | **B+** | 0 | 3 | 2 |
| Components & UI | **B-** | 0 | 4 | 2 |
| Security | **B-** | 3 | 4 | 1 |
| Accessibility | **C+** | 0 | 6 | 3 |
| Lib/Utils/Services | **A-** | 0 | 4 | 3 |
| Types | **A** | 0 | 0 | 3 |
| Test Coverage | **D** | 3 | 2 | 1 |
| PWA & Offline | **C+** | 0 | 3 | 4 |
| Configuration | **B** | 1 | 3 | 2 |
| Email System | **B-** | 0 | 3 | 1 |
| Stripe & Payments | **B-** | 2 | 3 | 1 |
| Firebase Rules | **B** | 0 | 4 | 1 |
| **TOTAL** | **B** | **15** | **49** | **32** |

---

## 1. App Layout & Core Pages

### ✅ What's Working
- Root `app/layout.tsx` is well-structured: proper `<html lang>`, font loading via `next/font`, Vercel Analytics, PWA registration, `AuthProvider` wrapping, and a dark-mode flash-prevention script.
- Metadata uses Next.js `metadata` + `viewport` exports with OpenGraph, manifest, and template-based title system.
- Public layout (`app/(public)/layout.tsx`) uses semantic `<main>` with Navbar/Footer.
- Error/404 pages (`error.tsx`, `not-found.tsx`) have dark mode support and recovery actions.
- Loading state (`loading.tsx`) is clean with a centered spinner.
- Sitemap (`sitemap.ts`) dynamically fetches events + articles from Firestore with try/catch fallback.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| CORE-1 | 🟡 Medium | **No `global-error.tsx`** — `error.tsx` is the app-level error boundary but can't catch errors in the root layout itself (font loading, `AuthProvider` crash). A separate `app/global-error.tsx` is needed. | `app/` |
| CORE-2 | 🟡 Medium | **`not-found.tsx` renders without public layout chrome** — 404 pages show without Navbar/Footer since `not-found.tsx` is at the root, not inside `(public)/`. | `app/not-found.tsx` |
| CORE-3 | 🟢 Low | **Dark-mode script in layout uses `dangerouslySetInnerHTML`** — while acceptable for this purpose, there's no nonce-based CSP coordination. The CSP allows `'unsafe-inline'` which weakens it. | `app/layout.tsx` |
| CORE-4 | 🟢 Low | **`suppressHydrationWarning`** is only on `<html>` — should also be on `<body>` if any client-side class mutation occurs there. | `app/layout.tsx` |

---

## 2. SEO & Metadata

### ✅ What's Working
- Every static public page exports `metadata` via `generateMetadata()` — title, description, OpenGraph, Twitter card, and canonical URL.
- Dynamic pages (`events/[slug]`, `news/[slug]`) use `generateMetadata` with async params and fallback.
- JSON-LD structured data on homepage (Organization), FAQ (FAQPage), event detail (Event), news detail (Article).
- ISR/revalidation on all server pages: 300s for events/news, 600s for gallery/leadership.
- `notFound()` called properly when dynamic slugs don't resolve.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| SEO-1 | 🔴 Critical | **Contact page is `'use client'`** — cannot export `metadata`. Zero SEO metadata (no title, no OG tags, no canonical). Search engines see a blank/default title. | `app/(public)/contact/page.tsx` |
| SEO-2 | 🔴 Critical | **Donate page is `'use client'`** — same problem: no metadata export at all. | `app/(public)/donate/page.tsx` |
| SEO-3 | 🟢 Low | **Hardcoded stats duplicated** — `5,000+`, `120+`, etc. appear both on homepage and about page. Should be centralized in constants. | `app/(public)/page.tsx`, `app/(public)/about/page.tsx` |

---

## 3. Public Pages

### ✅ What's Working
- Semantic heading hierarchy (`h1` > `h2` > `h3`) on all pages.
- Event and news detail pages handle missing content gracefully via `notFound()`.
- Gallery page has lightbox functionality.
- FAQ uses accordion pattern with proper expand/collapse.
- Membership page has clear CTA flow.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| PUB-1 | 🔴 Critical | **Article content XSS** — `news/[slug]/page.tsx` renders HTML via `dangerouslySetInnerHTML` with **no sanitization at render time**. Even if escaped on write, a compromised admin account = stored XSS for all visitors. | `app/(public)/news/[slug]/page.tsx` |
| PUB-2 | 🔴 Critical | **Contact form shows success on server errors** — the `fetch()` call doesn't check `response.ok`. If server returns 400/500, the UI still shows "Message Sent!" because only network `catch` errors are handled. | `app/(public)/contact/page.tsx` |
| PUB-3 | 🟡 Medium | **News listing uses `<img>` instead of Next.js `<Image>`** — misses image optimization, lazy loading, and proper sizing. Has an eslint-disable comment. | `app/(public)/news/page.tsx` |
| PUB-4 | 🟡 Medium | **Contact page uses `window.alert()` for errors** — poor UX, blocks the thread, not styled. | `app/(public)/contact/page.tsx` |
| PUB-5 | 🟡 Medium | **Gallery images lack meaningful `alt` text** — falls back to generic "Gallery photo" for images without captions. | `app/(public)/gallery/page.tsx` |
| PUB-6 | 🟢 Low | **Homepage `<section>` elements lack `aria-label`** or `aria-labelledby` for screen readers. | `app/(public)/page.tsx` |
| PUB-7 | 🟢 Low | **Gallery uses `<a>` tag instead of Next.js `<Link>`** for portal login — loses client-side navigation. | `app/(public)/gallery/page.tsx` |

---

## 4. API Routes

### ✅ What's Working
- Rate limiting consistently applied: contact (5/60s), donate (10/60s), membership-interest (3/60s).
- Input validation: email format, required fields, HTML escaping via `sanitizeInput()`.
- Stripe integration: preset amount whitelisting, custom amount clamping, $10K cap, graceful 503 when unconfigured.
- Auth checks on portal routes: Firebase Admin `verifySessionCookie(cookie, true)` (checks revocation).
- Role-based access control: member creation requires board/president/treasurer, expenses check `isTreasurer`, finance routes restrict to treasurer/president.
- `export const dynamic = 'force-dynamic'` on all API routes.
- Email fallback: if `RESEND_API_KEY` not set, contact/membership interest still returns 200 (logged, gracefully degraded).

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| API-1 | 🔴 Critical | **In-memory rate limiter** — stores counts in a JS `Map` with `setInterval` cleanup. On Vercel serverless, each invocation may be a different instance. Provides **essentially no rate limiting** in production. | `lib/rateLimit.ts` |
| API-2 | 🔴 Critical | **Contact API returns 200 even when email fails** — the `catch` for Resend failure just logs but still returns success. User thinks message was sent when it wasn't. | `app/api/contact/route.ts` |
| API-3 | 🟡 Medium | **`setInterval` in module scope** for rate limit cleanup — creates a timer that never clears in serverless environments. Memory leak potential. | `lib/rateLimit.ts` |
| API-4 | 🟡 Medium | **Portal members GET returns all members** to any authenticated user — even pending members can see the full directory. Should check `status == 'active'`. | `app/api/portal/members/route.ts` |
| API-5 | 🟡 Medium | **Donate route exposes raw Stripe error messages** — `error.message` returned directly to clients. Could leak internal details. | `app/api/donate/route.ts` |
| API-6 | 🟡 Medium | **RSVP status accepts any string** — no validation that `status` is one of `'going' | 'maybe' | 'not'`. Client could write arbitrary data. | `app/api/portal/events/route.ts` |
| API-7 | 🟡 Medium | **No rate limiting on portal API routes** — authenticated routes (messages, posts, RSVP) have no rate limits. A compromised session could spam. | All portal routes |
| API-8 | 🟢 Low | **Service hours POST** clamps hours to 0.25–24 but doesn't validate `eventId` or `eventName` against real data. Could log hours for fake events. | `app/api/portal/service-hours/route.ts` |
| API-9 | 🟢 Low | **Finance expenses route** uses `as any` to cast Firestore query — suggests a typing issue that could mask bugs. | `app/api/finance/expenses/route.ts` |
| API-10 | 🟢 Low | **Upload route** validates file type but the `startsWith` check logic could be more strict. Should use an explicit whitelist. | `app/api/upload/route.ts` |

---

## 5. Portal Pages

### ✅ What's Working
- Auth protection at two layers: middleware checks cookie existence + JWT structure + expiry, API routes do full Firebase Admin `verifySessionCookie`.
- Portal layout wraps everything in `AuthProvider` and conditionally renders `PortalShell` (excluding login + onboarding success).
- Login page handles popup-blocked fallback to redirect, shows loading state, handles specific error codes, and auto-redirects post-auth.
- Dashboard provides quick actions, service hour progress, upcoming events, community feed, and dues status.
- Onboarding flow exists with auto-redirect for users with `needsOnboarding`.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| PTL-1 | 🟡 Medium | **Middleware JWT check is advisory only** — base64-decodes payload and checks `exp` but doesn't verify signature. A user could craft a fake JWT with a future `exp` and bypass middleware (API routes still verify properly). | `middleware.ts` |
| PTL-2 | 🟡 Medium | **No portal-level `error.tsx`** — if a portal page crashes, it falls through to the root `error.tsx` which has no portal chrome (no sidebar, no header). | `app/portal/` |
| PTL-3 | 🟡 Medium | **Dashboard loads multiple hooks simultaneously** (`useEvents`, `usePosts`, `useServiceHours`, `useDues`) with no suspense boundaries or prioritized loading. Could cause request waterfalls. | `app/portal/page.tsx` |
| PTL-4 | 🟢 Low | **All portal pages are `'use client'` with no metadata** — tabs all show the root title. Less critical for a private portal, but poor tab UX. | All portal pages |
| PTL-5 | 🟢 Low | **No portal-specific loading skeleton** — just the generic spinner from root `loading.tsx`. | `app/portal/` |

---

## 6. Components & UI

### ✅ What's Working
- Consistent design system: `cn()` utility, reusable Button, Card, Badge, Avatar, Modal, Input, Select, Textarea, Toast, Spinner components.
- `HeroSection` is clean and reusable with size variants.
- `Footer` includes proper accessibility: `<footer>` semantic tag, external links have proper `rel` attributes.
- `Navbar` handles scroll state, keyboard shortcuts (Cmd+K), mobile toggle, route-change cleanup.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| CMP-1 | 🟡 Medium | **No error boundaries** around any client components. If `FinanceCharts`, `PostComposer`, `EventCheckoutModal` throws, it crashes the entire page. | All client components |
| CMP-2 | 🟡 Medium | **SVG icons throughout components lack `aria-hidden="true"`** — screen readers announce them as empty images. | Multiple files |
| CMP-3 | 🟡 Medium | **Navbar dropdown opens on hover/click only** — keyboard users cannot open it. Needs `onFocus`/`onKeyDown` handlers, `aria-haspopup`, `aria-expanded`. | `components/public/Navbar.tsx` |
| CMP-4 | 🟡 Medium | **PortalShell sidebar**: no focus trap when open, no `aria-current="page"` on active nav item, sign-out modal has no focus management or `aria-modal`. | `components/portal/PortalShell.tsx` |
| CMP-5 | 🟢 Low | **DarkModeToggle** — no verification it has proper `aria-label` for accessibility. | `components/public/Navbar.tsx` |
| CMP-6 | 🟢 Low | **No reusable `<ErrorBoundary>` component** — error boundaries need to be class components in React, should have a shared wrapper. | `components/` |

---

## 7. Security

### ✅ What's Working
- Comprehensive security headers in `next.config.js`: HSTS with preload, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and detailed CSP.
- CSP whitelists specific domains for scripts, styles, images, connections, and frames (Firebase + Stripe + Google Auth + Vercel Analytics).
- Input sanitization (`sanitizeInput()`) used consistently in API routes before email rendering.
- Firebase Admin (`lib/firebase/admin.ts`) handles credential parsing robustly with fallback for mangled `\n` in private keys.
- Firestore rules are thorough with helper functions and deny-all default.
- Storage rules enforce size limits, image type validation, and owner-based writes.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| SEC-1 | 🔴 Critical | **CSP allows `'unsafe-eval'` for scripts** — significantly weakens XSS protection. `'unsafe-eval'` is especially dangerous as it allows `eval()`, `Function()`, `setTimeout('string')`, etc. | `next.config.js` |
| SEC-2 | 🔴 Critical | **`'unsafe-inline'` for scripts in CSP** — combined with `'unsafe-eval'`, this effectively disables CSP script protection. Should migrate to nonce-based CSP. | `next.config.js` |
| SEC-3 | 🔴 Critical | **Stored XSS in article rendering** — `dangerouslySetInnerHTML` with no sanitization at render time. `dompurify` is already a dependency but not used here. | `app/(public)/news/[slug]/page.tsx` |
| SEC-4 | 🟡 Medium | **`ignoreDuringBuilds: true`** for ESLint — silently swallows lint errors in production, potentially masking security issues. | `next.config.js` |
| SEC-5 | 🟡 Medium | **No CSRF protection** on mutation endpoints. Session cookie + same-origin provides some protection, but no `SameSite` attribute explicitly set on session cookie. | Portal API routes |
| SEC-6 | 🟡 Medium | **Open redirect risk** — donate page reads `data.url` from API response and does `window.location.href = data.url` without validating it's a Stripe domain. | `app/(public)/donate/page.tsx` |
| SEC-7 | 🟡 Medium | **Donate success spoofable** — success URL uses `?success=true` query param. User can navigate directly to see thank-you without donating. Should use Stripe's `{CHECKOUT_SESSION_ID}` + server verification. | `app/api/donate/route.ts` |
| SEC-8 | 🟢 Low | **Board GET endpoint** (`app/api/portal/board/route.ts`) has no authentication — returns board data to unauthenticated requests. Acceptable since data is semi-public, but inconsistent. | `app/api/portal/board/route.ts` |

---

## 8. Accessibility

### ✅ What's Working
- Navbar has a skip-to-content link.
- `<nav>` has `aria-label`.
- Mobile hamburger has `aria-label`, `aria-expanded`, `aria-controls`.
- Footer social links have `aria-label` and proper `rel` attributes.
- Semantic HTML (`<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`, `<article>`) used throughout.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| A11Y-1 | 🟡 Medium | **Navbar dropdown inaccessible via keyboard** — opens on hover/click only. Needs `onFocus`/`onKeyDown`, `aria-haspopup="true"`, `aria-expanded`, and `role="menu"` on dropdown items. | `components/public/Navbar.tsx` |
| A11Y-2 | 🟡 Medium | **No focus trap in mobile menu** — when open, Tab can escape to elements behind the overlay. | `components/public/Navbar.tsx` |
| A11Y-3 | 🟡 Medium | **Mobile menu animation** — `animate-slide-down` doesn't respect `prefers-reduced-motion`. | `components/public/Navbar.tsx` |
| A11Y-4 | 🟡 Medium | **PortalShell sidebar**: no focus management when sidebar opens (screen reader users won't know it opened), no `aria-current="page"` on active nav item. | `components/portal/PortalShell.tsx` |
| A11Y-5 | 🟡 Medium | **Sign-out confirmation popover** has no focus trap and no `role="dialog"` or `aria-modal` — keyboard users can interact with elements behind it. | `components/portal/PortalShell.tsx` |
| A11Y-6 | 🟡 Medium | **Donate page preset buttons** lack `aria-pressed` for toggle pattern. Screen readers don't announce selection state. | `app/(public)/donate/page.tsx` |
| A11Y-7 | 🟢 Low | **Decorative SVGs missing `aria-hidden="true"`** throughout the codebase — screen readers attempt to read them as images. | Multiple files |
| A11Y-8 | 🟢 Low | **Gallery images lack meaningful alt text** — generic "Gallery photo" fallback. | `app/(public)/gallery/page.tsx` |
| A11Y-9 | 🟢 Low | **Footer missing `role="contentinfo"`** — though `<footer>` implies this, explicit is better for older assistive tech. | `components/public/Footer.tsx` |

---

## 9. Lib, Utils & Services

### ✅ What's Working
- `seo.ts` is a clean helper producing consistent metadata across all pages.
- `formatDate`, `formatCurrency`, `formatRelativeTime` are solid, well-documented utilities.
- Firebase services (`members.ts`, `events.ts`, `dues.ts`) use try/catch with fallback to default data — the site never crashes even if Firestore is down.
- `serializedTimestamp()` properly handles Firestore `Timestamp`, `Date`, and nested objects recursively.
- `cn()` utility correctly combines `clsx` + `tailwind-merge`.
- `slugify()` is clean and handles edge cases.
- `rotaryYear()` correctly models the July–June Rotary year cycle.
- Constants (`lib/constants.ts`) are well-organized with `as const` for type safety.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| LIB-1 | 🟡 Medium | **Firebase client doesn't validate env vars** — `initializeApp()` will silently create a broken app if `NEXT_PUBLIC_FIREBASE_*` vars are missing. Should validate at init time. | `lib/firebase/client.ts` |
| LIB-2 | 🟡 Medium | **`generateCalendarUrl()` doesn't account for time zones** — `toISOString()` generates UTC, which may not match the event's local time. | `lib/utils/calendar.ts` |
| LIB-3 | 🟡 Medium | **Auth provider `onAuthStateChanged` callback is massive and async** — performs Firestore operations including invite migration. If any fail, the error is unhandled and could leave the user in a broken state (signed in but `member` is null). | `lib/firebase/auth.ts` |
| LIB-4 | 🟡 Medium | **Invite migration is not atomic** — writes new member doc then deletes invite doc. If delete fails, duplicate member records exist. | `lib/firebase/auth.ts` |
| LIB-5 | 🟢 Low | **Analytics module references GA** but there's no `<Script>` loading Google Analytics anywhere in the layout. GA setup appears incomplete (only Vercel Analytics is active). | `lib/analytics.ts` |
| LIB-6 | 🟢 Low | **`slugify()` doesn't handle Unicode/accented characters** — `café` → `caf` instead of `cafe`. | `lib/utils/slugify.ts` |
| LIB-7 | 🟢 Low | **`generateCalendarUrl()` removes `.` but not trailing `Z`** from ISO strings, which may cause timezone issues in Google Calendar. | `lib/utils/calendar.ts` |

---

## 10. Types

### ✅ What's Working
- `types/index.ts` is comprehensive and well-organized (498 lines). Covers: Members, Events, Articles, Posts, Comments, Service Hours, Dues, Finance/Transactions, Documents, Gallery, Messages, Settings, Committees, Activities, Expenses, Offline Payments, Onboarding, FAQ, and Navigation.
- Uses proper TypeScript patterns: union types for statuses, `as const` arrays for categories, optional fields marked with `?`, monetary values consistently in cents.
- `EVENT_CATEGORIES` is exported both as a type and a runtime array.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| TYP-1 | 🟢 Low | **`Member` type has both `title` and `boardTitle`** — comment says "be flexible" but creates confusion. | `types/index.ts` |
| TYP-2 | 🟢 Low | **`RateLimitConfig` type defined in `lib/rateLimit.ts`** instead of in the types file — inconsistent. | `lib/rateLimit.ts` |
| TYP-3 | 🟢 Low | **`NavItem` type defined but unused** — navigation is hardcoded in Navbar. | `types/index.ts` |

---

## 11. Test Coverage

### ✅ What's Working
- Jest properly configured with `node` environment, path aliases, and coverage collection from `app/api/**` and `lib/**`.
- API route tests are well-written (contact, donate, membership-interest): test missing fields, successful sends, graceful fallback.
- Library tests (constants, seo, sitemap) are clean and cover key behaviors.
- Mocking strategy is good: email sender and rate limiter are mocked.

### ⚠️ Issues Found

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| TST-1 | 🔴 Critical | **Zero tests for portal API routes** — members, profile, RSVP, service-hours, messages, posts, board, events/checkout, finance. These contain the most critical business logic. | `app/api/portal/` |
| TST-2 | 🔴 Critical | **Zero tests for auth flow** — `useAuth`, `AuthProvider`, session creation/verification. | `lib/firebase/auth.ts`, `hooks/useAuth.ts` |
| TST-3 | 🔴 Critical | **Only 6 test files** for a codebase with 44+ API routes, 33+ pages, and 30+ components. | `__tests__/` |
| TST-4 | 🟡 Medium | **Zero component tests** — no tests for Navbar, Footer, forms, portal components. | `components/` |
| TST-5 | 🟡 Medium | **Zero tests for utility functions** — `sanitize`, `formatDate`, `slugify`, `calendar`, `rotaryYear`. These are pure functions that are trivially testable. | `lib/utils/` |
| TST-6 | 🟢 Low | **No E2E tests** — no Playwright or Cypress setup for critical user flows. | Project root |

---

## 12. PWA & Offline

### ✅ What's Working
- Service worker has good cache versioning strategy.
- Network-first for HTML, cache-first for static assets.
- Properly skips non-GET requests and external URLs.
- Cleans up old caches on activation.
- Excludes `/api/`, `/admin/`, `/portal/` from caching.
- PWA manifest has proper display mode, theme color, shortcuts.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| PWA-1 | 🟡 Medium | **Manual SW version bumping** — `CACHE_VERSION = 'v6'` requires manual incrementing. Should use build-time injection or content hash. | `public/sw.js` |
| PWA-2 | 🟡 Medium | **No offline fallback page** — when network fails and there's no cache hit, users get a raw browser error. Should serve a branded offline page. | `public/sw.js` |
| PWA-3 | 🟡 Medium | **`skipWaiting()` called unconditionally** — can cause mid-session updates for active users. Should use "update available" prompt pattern. | `public/sw.js` |
| PWA-4 | 🟢 Low | **No cache size limit** — static asset cache grows unbounded. Should implement LRU or max entries eviction. | `public/sw.js` |
| PWA-5 | 🟢 Low | **PWA manifest missing fields**: `id`, `scope`, `lang`, `screenshots`, `prefer_related_applications`. Chrome recommends these for richer install UI. | `public/manifest.json` |
| PWA-6 | 🟢 Low | **Maskable icon reuses same 512×512 image** — maskable icons need safe-zone padding; reusing the same image may cause clipping. | `public/manifest.json` |
| PWA-7 | 🟢 Low | **PWARegister has no update handling** — only registers the SW, never checks for updates. No `updatefound`/`statechange` listeners or user notification. | `components/PWARegister.tsx` |

---

## 13. Configuration & Infrastructure

### ✅ What's Working
- Tailwind config has custom brand colors (cranberry, gold, azure) with full shade scales, display font family, custom animations, responsive breakpoints including `xs`.
- `next.config.js` has comprehensive security headers and proper remote image patterns.
- `firebase.json` correctly references rules and indexes files.
- `firestore.indexes.json` has 37 composite indexes across 15 collection groups.
- `robots.txt` correctly blocks `/portal/` and `/api/`.
- `vercel.json` has correct build/dev/install commands.
- TypeScript strict mode enabled.
- GitHub Actions workflow for dues automation (send reminders, overdue notices, enforce grace period).

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| CFG-1 | 🔴 Critical | **Missing `@tailwindcss/typography` plugin** — article content pages use `prose` classes which require this plugin. Article content styling is currently broken. | `tailwind.config.js` |
| CFG-2 | 🟡 Medium | **ESLint `ignoreDuringBuilds: true`** — silently swallows lint errors in production builds. | `next.config.js` |
| CFG-3 | 🟡 Medium | **Next.js 14.0.4 is outdated** — current stable is 14.2.x+ / 15.x. Missing bug fixes and performance improvements. | `package.json` |
| CFG-4 | 🟡 Medium | **`robots.txt` doesn't disallow `/finance/`** — authenticated area that crawlers could hit. | `public/robots.txt` |
| CFG-5 | 🟢 Low | **Tailwind content paths missing `lib/` directory** — any Tailwind classes used in lib files won't be scanned. | `tailwind.config.js` |
| CFG-6 | 🟢 Low | **`vercel.json` has no `regions` config** — if users are primarily NYC, specifying `"iad1"` (US East) could improve latency. | `vercel.json` |

---

## 14. Email System

### ✅ What's Working
- Graceful handling when `RESEND_API_KEY` is not set.
- Good template structure with branded header/footer.
- Bulk email support via `sendBulkEmail`.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| EML-1 | 🟡 Medium | **Resend client created with literal `'missing'` key** — when env var absent, API calls go to Resend's servers and fail remotely instead of fast-failing locally. | `lib/email/send.ts` |
| EML-2 | 🟡 Medium | **`sendBulkEmail` sends all in parallel via `Promise.all`** — at scale, could hit Resend's rate limits. Should batch in chunks. | `lib/email/send.ts` |
| EML-3 | 🟡 Medium | **Email templates directly interpolate values into HTML** — though inputs are escaped before calling the template, the template itself has no defense-in-depth escaping. | `lib/email/templates.ts` |
| EML-4 | 🟢 Low | **No plain text fallback** — `text` field is optional. Some email clients (text-only) won't render properly. | `lib/email/send.ts` |

---

## 15. Stripe & Payments

### ✅ What's Working
- Singleton pattern for Stripe instance in `lib/stripe/client.ts`.
- Webhook signature verification.
- Good separation of checkout session creation and webhook handling.
- Records dues payments and income transactions atomically.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| PAY-1 | 🔴 Critical | **Stripe webhook has no idempotency check** — if same webhook fires twice (Stripe retries), duplicate transactions created. Should deduplicate via `session.id`. | `lib/stripe/client.ts` |
| PAY-2 | 🔴 Critical | **Donate route creates new `Stripe()` per request** instead of using the singleton. Wasteful and inconsistent. | `app/api/donate/route.ts` |
| PAY-3 | 🟡 Medium | **Hardcoded Stripe API version** — `'2024-12-18.acacia'` cast as `any` which defeats type-checking. Should track installed SDK version. | `lib/stripe/client.ts` |
| PAY-4 | 🟡 Medium | **Non-null assertion on `session.metadata!`** — if Stripe returns null, runtime crash. Should handle the null case. | `lib/stripe/client.ts` |
| PAY-5 | 🟡 Medium | **No `checkout.session.expired` handler** — abandoned checkout sessions are not tracked or reported. | `lib/stripe/client.ts` |
| PAY-6 | 🟢 Low | **Donations not recorded in Firestore** — unlike dues/events, donations aren't tracked as transactions. No way to generate donation reports. | `app/api/donate/route.ts` |

---

## 16. Firebase Rules

### ✅ What's Working
- Well-structured helper functions (`isAuthenticated`, `isMember`, `isBoard`, `isTreasurer`, `isPresident`).
- Proper role hierarchy (member → board → treasurer → president).
- `affectedKeys()` used to prevent privilege escalation on member updates.
- Members can't change their own `role` or `status`.
- Service hours enforce `status == 'pending'` on creation.
- Messages enforce sender identity.
- Deny-all catch-all at bottom.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| FBR-1 | 🟡 Medium | **Events readable by anyone when `isPublic == true`** but rule doesn't check `status == 'published'`. Draft events with `isPublic: true` could leak. | `firestore.rules` |
| FBR-2 | 🟡 Medium | **Posts `likes` update uses `hasOnly(['likes'])`** — allows any member to overwrite the entire likes array. A malicious member could remove all likes. Should use subcollection or validate array growth. | `firestore.rules` |
| FBR-3 | 🟡 Medium | **Settings writable by `isTreasurer()`** — site settings (public content) controlled by treasurer role seems like a permissions mismatch. Should be `isBoard()` or have separate settings documents. | `firestore.rules` |
| FBR-4 | 🟡 Medium | **No data validation in rules** — rules don't validate field types, required fields, or string lengths for any collection. Arbitrary fields could be written. | `firestore.rules` |
| FBR-5 | 🟢 Low | **Multiple `memberDoc()` calls** per rule evaluation — while Firestore caches `get()` within a single evaluation, complex rules could approach the 10-get limit. | `firestore.rules` |

### Storage Rules Issues

| ID | Severity | Issue | File |
|----|----------|-------|------|
| STR-1 | 🟡 Medium | **Post attachments accept any content type** — `isValidSize()` checked but not `isImage()`. Users could upload arbitrary files. | `storage.rules` |
| STR-2 | 🟡 Medium | **Receipts accept any file type** — should restrict to images + PDF. | `storage.rules` |
| STR-3 | 🟢 Low | **10MB limit too generous for profile photos** — consider 2-5MB for profile photos specifically. | `storage.rules` |

---

## 17. Performance

### ✅ What's Working
- ISR/revalidation on public pages (300-600s).
- Next.js Image optimization on most pages.
- Dynamic imports for heavy components.
- Code splitting via App Router.

### ⚠️ Issues Found

| ID | Severity | Issue | File |
|----|----------|-------|------|
| PRF-1 | 🟡 Medium | **Finance summary fetches 500 transactions** into memory on every dashboard load — no caching. | `lib/services/finance.ts` |
| PRF-2 | 🟡 Medium | **Member search loads all active members into memory** and filters client-side. Doesn't scale. | `lib/services/members.ts` |
| PRF-3 | 🟢 Low | **No `unstable_cache` or request memoization** on server-side Firestore queries — every request hits Firestore directly. | `lib/firebase/queries.ts` |
| PRF-4 | 🟢 Low | **Dashboard loads 4+ hooks simultaneously** with no prioritization or Suspense boundaries. | `app/portal/page.tsx` |

---

## Appendix: File Index

Files referenced in this audit:

| Category | Files |
|----------|-------|
| **Core** | `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `app/sitemap.ts`, `app/globals.css` |
| **Config** | `next.config.js`, `package.json`, `tsconfig.json`, `tailwind.config.js`, `vercel.json`, `middleware.ts` |
| **Firebase** | `firestore.rules`, `storage.rules`, `firebase.json`, `firestore.indexes.json`, `lib/firebase/client.ts`, `lib/firebase/admin.ts`, `lib/firebase/auth.ts`, `lib/firebase/queries.ts`, `lib/firebase/storage.ts` |
| **Public Pages** | `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `app/(public)/contact/page.tsx`, `app/(public)/donate/page.tsx`, `app/(public)/events/page.tsx`, `app/(public)/events/[slug]/page.tsx`, `app/(public)/news/page.tsx`, `app/(public)/news/[slug]/page.tsx`, `app/(public)/gallery/page.tsx`, `app/(public)/about/page.tsx`, `app/(public)/faq/page.tsx`, `app/(public)/membership/page.tsx`, `app/(public)/leadership/page.tsx` |
| **Portal Pages** | `app/portal/layout.tsx`, `app/portal/page.tsx`, `app/portal/login/page.tsx`, `app/portal/events/page.tsx`, `app/portal/directory/page.tsx`, `app/portal/service-hours/page.tsx`, `app/portal/dues/page.tsx`, `app/portal/finance/page.tsx`, `app/portal/profile/page.tsx`, `app/portal/onboarding/page.tsx` |
| **API Routes** | `app/api/contact/route.ts`, `app/api/donate/route.ts`, `app/api/membership-interest/route.ts`, `app/api/events/route.ts`, `app/api/news/route.ts`, `app/api/gallery/route.ts`, `app/api/portal/*/route.ts`, `app/api/finance/*/route.ts`, `app/api/upload/route.ts`, `app/api/webhooks/route.ts` |
| **Components** | `components/public/Navbar.tsx`, `components/public/Footer.tsx`, `components/public/HeroSection.tsx`, `components/portal/PortalShell.tsx`, `components/PWARegister.tsx` |
| **Lib** | `lib/rateLimit.ts`, `lib/seo.ts`, `lib/analytics.ts`, `lib/constants.ts`, `lib/email/send.ts`, `lib/email/templates.ts`, `lib/stripe/client.ts`, `lib/services/*.ts`, `lib/utils/*.ts`, `lib/defaults/*.ts` |
| **Types** | `types/index.ts` |
| **Tests** | `__tests__/api/contact.test.ts`, `__tests__/api/donate.test.ts`, `__tests__/api/membership-interest.test.ts`, `__tests__/lib/constants.test.ts`, `__tests__/lib/seo.test.ts`, `__tests__/lib/sitemap.test.ts` |
| **PWA** | `public/sw.js`, `public/manifest.json`, `public/robots.txt` |
| **CI/CD** | `.github/workflows/dues-automation.yml` |

---

*This audit identified **15 critical**, **49 medium**, and **32 low** issues across the codebase. See `docs/V1_ROADMAP.md` for the prioritized remediation plan.*
