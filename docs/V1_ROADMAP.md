# 🗺️ Rotaract NYC — V1 Release Roadmap

> **Created:** April 6, 2026
> **Target:** Production-ready V1 release
> **Source:** Full codebase audit (see `docs/AUDIT.md`)
> **Total Issues:** 15 critical · 49 medium · 32 low

---

## Table of Contents

- [Release Criteria](#release-criteria)
- [Phase Overview](#phase-overview)
- [Phase 1: Security & Critical Fixes](#phase-1-security--critical-fixes-week-1-2)
- [Phase 2: SEO, Metadata & Public Pages](#phase-2-seo-metadata--public-pages-week-2-3)
- [Phase 3: API Hardening & Data Integrity](#phase-3-api-hardening--data-integrity-week-3-4)
- [Phase 4: Accessibility & UX](#phase-4-accessibility--ux-week-4-5)
- [Phase 5: Payments & Finance](#phase-5-payments--finance-week-5-6)
- [Phase 6: Portal Polish & Error Handling](#phase-6-portal-polish--error-handling-week-6-7)
- [Phase 7: PWA, Performance & Infrastructure](#phase-7-pwa-performance--infrastructure-week-7-8)
- [Phase 8: Testing](#phase-8-testing-week-8-10)
- [Phase 9: Final Polish & Launch Prep](#phase-9-final-polish--launch-prep-week-10-11)
- [Out of Scope (Post-V1)](#out-of-scope-post-v1)
- [Definition of Done](#definition-of-done)

---

## Release Criteria

V1 is ready to ship when **all** of the following are true:

- [ ] Zero critical issues remaining
- [ ] All medium issues resolved or explicitly deferred with justification
- [ ] Security headers hardened (no `unsafe-eval`)
- [ ] All public pages have proper SEO metadata
- [ ] XSS vectors eliminated (article rendering sanitized)
- [ ] Rate limiting works in serverless environment
- [ ] Stripe webhooks are idempotent
- [ ] Keyboard navigation works on all interactive elements
- [ ] Test coverage ≥ 60% on API routes and utilities
- [ ] Lighthouse scores: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 90
- [ ] Clean build with zero TypeScript errors and zero ESLint errors
- [ ] All Firestore security rules reviewed and deployed
- [ ] PWA installable with offline fallback

---

## Phase Overview

| Phase | Focus | Duration | Audit IDs Resolved |
|-------|-------|----------|-------------------|
| **1** | Security & Critical Fixes | Week 1–2 | SEC-1–3, PUB-1, API-1–2, CFG-1–2 |
| **2** | SEO, Metadata & Public Pages | Week 2–3 | SEO-1–3, PUB-2–7 |
| **3** | API Hardening & Data Integrity | Week 3–4 | API-3–10, LIB-1–4, FBR-1–5, STR-1–2 |
| **4** | Accessibility & UX | Week 4–5 | A11Y-1–9, CMP-1–6 |
| **5** | Payments & Finance | Week 5–6 | PAY-1–6, SEC-6–7 |
| **6** | Portal Polish & Error Handling | Week 6–7 | PTL-1–5, CORE-1–2 |
| **7** | PWA, Performance & Infrastructure | Week 7–8 | PWA-1–7, PRF-1–4, CFG-3–6 |
| **8** | Testing | Week 8–10 | TST-1–6 |
| **9** | Final Polish & Launch Prep | Week 10–11 | Remaining low items |

---

## Phase 1: Security & Critical Fixes (Week 1–2)

> **Goal:** Eliminate all exploitable vulnerabilities and critical broken functionality.

### 1.1 — Sanitize Article HTML at Render Time
- **Audit ID:** SEC-3, PUB-1
- **Severity:** 🔴 Critical
- **File:** `app/(public)/news/[slug]/page.tsx`
- **Task:** Wrap all `dangerouslySetInnerHTML` content with DOMPurify sanitization. Since this is a server component, use `isomorphic-dompurify` or sanitize server-side before rendering.
- **Acceptance:** No unsanitized HTML rendered anywhere in the app. Verified by attempting to inject `<script>alert(1)</script>` via article content.
- **Effort:** S

### 1.2 — Harden Content Security Policy
- **Audit ID:** SEC-1, SEC-2
- **Severity:** 🔴 Critical
- **File:** `next.config.js`
- **Tasks:**
  - Remove `'unsafe-eval'` from `script-src`. Investigate which library requires it (likely `react-quill` or `novel`) and find alternatives or use nonce-based approach.
  - Replace `'unsafe-inline'` with nonce-based CSP using Next.js `nonce` support (available in Next.js 14.x via `headers` config or custom `_document`).
  - If nonce-based isn't feasible for V1, document the risk and keep `'unsafe-inline'` with a plan to remove post-V1.
- **Acceptance:** `'unsafe-eval'` removed. CSP tested against [CSP Evaluator](https://csp-evaluator.withgoogle.com/).
- **Effort:** M

### 1.3 — Replace In-Memory Rate Limiter
- **Audit ID:** API-1, API-3
- **Severity:** 🔴 Critical
- **File:** `lib/rateLimit.ts`
- **Task:** Replace the JS `Map`-based rate limiter with a serverless-compatible solution:
  - **Option A (Recommended):** Upstash Redis via `@upstash/ratelimit` — free tier supports 10K requests/day.
  - **Option B:** Vercel KV (Redis-compatible).
  - **Option C:** Vercel Edge Config for simpler use cases.
- **Acceptance:** Rate limiting persists across serverless invocations. Verified by hitting the contact endpoint >5 times in 60s and receiving 429.
- **Effort:** M

### 1.4 — Fix Contact Form Error Handling
- **Audit ID:** API-2, PUB-2
- **Severity:** 🔴 Critical
- **Files:** `app/(public)/contact/page.tsx`, `app/api/contact/route.ts`
- **Tasks:**
  - **Client:** Add `if (!response.ok)` check after fetch. Show styled error toast instead of success.
  - **Server:** Return 500 when Resend email sending fails instead of swallowing the error and returning 200.
  - Replace `window.alert()` with a proper toast notification.
- **Acceptance:** Server returns 500 on email failure. Client shows error state. No false "Message Sent!" on failures.
- **Effort:** S

### 1.5 — Add Tailwind Typography Plugin
- **Audit ID:** CFG-1
- **Severity:** 🔴 Critical
- **Files:** `package.json`, `tailwind.config.js`
- **Tasks:**
  - `npm install @tailwindcss/typography`
  - Add `require('@tailwindcss/typography')` to Tailwind plugins array.
- **Acceptance:** Article content pages render with proper prose styling. Verified visually on a news article.
- **Effort:** XS

### 1.6 — Re-enable ESLint During Builds
- **Audit ID:** CFG-2, SEC-4
- **Severity:** 🟡 Medium
- **File:** `next.config.js`
- **Task:** Set `eslint.ignoreDuringBuilds` to `false`. Fix any existing lint errors that surface.
- **Acceptance:** `npm run build` passes with zero ESLint errors.
- **Effort:** S–M (depends on number of existing lint errors)

---

## Phase 2: SEO, Metadata & Public Pages (Week 2–3)

> **Goal:** Every public page has proper SEO metadata and correct error handling.

### 2.1 — Add SEO Metadata to Contact Page
- **Audit ID:** SEO-1
- **Severity:** 🔴 Critical
- **File:** `app/(public)/contact/page.tsx`
- **Task:** Refactor into a thin server component wrapper that exports `metadata`, with the form extracted into a `ContactForm` client component.
  ```
  app/(public)/contact/
    page.tsx          ← Server component with metadata export
    ContactForm.tsx   ← 'use client' form component
  ```
- **Acceptance:** `<title>` and OpenGraph tags render in page source. Verified via View Source.
- **Effort:** S

### 2.2 — Add SEO Metadata to Donate Page
- **Audit ID:** SEO-2
- **Severity:** 🔴 Critical
- **File:** `app/(public)/donate/page.tsx`
- **Task:** Same pattern as contact — thin server component + client `DonateForm` child.
- **Acceptance:** `<title>` and OpenGraph tags render in page source.
- **Effort:** S

### 2.3 — Centralize Hardcoded Stats
- **Audit ID:** SEO-3
- **Severity:** 🟢 Low
- **Files:** `app/(public)/page.tsx`, `app/(public)/about/page.tsx`, `lib/constants.ts`
- **Task:** Move stats (`5,000+` service hours, `120+` members, etc.) to `lib/constants.ts` and import in both pages.
- **Acceptance:** Stats defined in one place. Changing the constant updates both pages.
- **Effort:** XS

### 2.4 — Replace `<img>` with Next.js `<Image>` in News Listing
- **Audit ID:** PUB-3
- **Severity:** 🟡 Medium
- **File:** `app/(public)/news/page.tsx`
- **Task:** Replace native `<img>` with `next/image` `<Image>` component. Set proper `width`, `height`, and `alt` attributes.
- **Acceptance:** News cover images use `<Image>` with lazy loading and proper sizing. No eslint-disable comments.
- **Effort:** XS

### 2.5 — Improve Gallery Alt Text
- **Audit ID:** PUB-5, A11Y-8
- **Severity:** 🟡 Medium
- **File:** `app/(public)/gallery/page.tsx`
- **Task:** Use descriptive alt text: combine event name, date, and caption. Fallback to `"Photo from [event name]"` instead of generic "Gallery photo".
- **Acceptance:** Every gallery image has a meaningful, unique `alt` attribute.
- **Effort:** XS

### 2.6 — Add `aria-label` to Homepage Sections
- **Audit ID:** PUB-6
- **Severity:** 🟢 Low
- **File:** `app/(public)/page.tsx`
- **Task:** Add `aria-label` or `aria-labelledby` to each `<section>` on the homepage.
- **Acceptance:** Screen reader announces section names when navigating.
- **Effort:** XS

### 2.7 — Replace Gallery `<a>` with Next.js `<Link>`
- **Audit ID:** PUB-7
- **Severity:** 🟢 Low
- **File:** `app/(public)/gallery/page.tsx`
- **Task:** Replace raw `<a href="/portal/login">` with `<Link href="/portal/login">`.
- **Acceptance:** Client-side navigation used for portal login link.
- **Effort:** XS

---

## Phase 3: API Hardening & Data Integrity (Week 3–4)

> **Goal:** All API routes validate inputs, handle errors properly, and protect data integrity.

### 3.1 — Validate RSVP Status
- **Audit ID:** API-6
- **Severity:** 🟡 Medium
- **File:** `app/api/portal/events/route.ts`
- **Task:** Validate `status` field against `['going', 'maybe', 'not']` enum. Return 400 for invalid values.
- **Acceptance:** Invalid RSVP statuses rejected with 400 error.
- **Effort:** XS

### 3.2 — Restrict Member Directory to Active Members
- **Audit ID:** API-4
- **Severity:** 🟡 Medium
- **File:** `app/api/portal/members/route.ts`
- **Task:** Add `status == 'active'` check — either filter the query results or check the requesting user's status before returning data.
- **Acceptance:** Pending members can't see the full directory.
- **Effort:** XS

### 3.3 — Sanitize Stripe Error Messages
- **Audit ID:** API-5
- **Severity:** 🟡 Medium
- **File:** `app/api/donate/route.ts`
- **Task:** Replace `error.message` in response with a generic "Payment processing failed. Please try again." message. Log the actual error server-side.
- **Acceptance:** No Stripe-specific internal details exposed to the client.
- **Effort:** XS

### 3.4 — Add Rate Limiting to Portal Mutation Endpoints
- **Audit ID:** API-7
- **Severity:** 🟡 Medium
- **Files:** All portal POST/PUT/DELETE routes
- **Task:** Add rate limiting to: messages (10/60s), posts (5/60s), RSVP (20/60s), upload (10/60s). Use the new persistent rate limiter from Phase 1.3.
- **Acceptance:** Portal mutation endpoints have rate limits. Verified by exceeding limits and receiving 429.
- **Effort:** S

### 3.5 — Validate Firebase Client Env Vars
- **Audit ID:** LIB-1
- **Severity:** 🟡 Medium
- **File:** `lib/firebase/client.ts`
- **Task:** Add runtime validation that all `NEXT_PUBLIC_FIREBASE_*` env vars are defined. Throw a clear error message at initialization if any are missing.
- **Acceptance:** Missing env var produces a human-readable error instead of cryptic Firebase failure.
- **Effort:** XS

### 3.6 — Fix Auth State Change Error Handling
- **Audit ID:** LIB-3, LIB-4
- **Severity:** 🟡 Medium
- **File:** `lib/firebase/auth.ts`
- **Tasks:**
  - Wrap the `onAuthStateChanged` callback in comprehensive try/catch.
  - Handle each step independently: member lookup, invite migration, member creation, cookie setting.
  - If invite migration fails, log the error but continue with a new member record rather than leaving the user in a broken state.
  - Consider making the invite migration atomic with a Firestore batch write.
- **Acceptance:** Auth state change handles all error paths gracefully. No broken states.
- **Effort:** M

### 3.7 — Harden Firestore Security Rules
- **Audit ID:** FBR-1, FBR-2, FBR-3, FBR-4
- **Severity:** 🟡 Medium
- **File:** `firestore.rules`
- **Tasks:**
  - **Events:** Add `resource.data.status == 'published'` check alongside `isPublic == true` for public reads.
  - **Posts likes:** Replace `hasOnly(['likes'])` with a rule that validates the likes array only grows (new value contains all old values + one new UID), or move likes to a subcollection.
  - **Settings:** Change write permission from `isTreasurer()` to `isBoard()`.
  - **Data validation:** Add basic field type and required field validation for members, events, and posts.
- **Acceptance:** Firestore rules deployed and tested. Draft events not readable by public. Likes can't be wiped.
- **Effort:** M

### 3.8 — Harden Storage Rules
- **Audit ID:** STR-1, STR-2
- **Severity:** 🟡 Medium
- **File:** `storage.rules`
- **Tasks:**
  - **Post attachments:** Add content type validation — allow images + PDFs + common document types.
  - **Receipts:** Restrict to images + PDF.
- **Acceptance:** Attempting to upload an executable or ZIP to post-attachments or receipts is rejected.
- **Effort:** XS

### 3.9 — Fix `useDues` Hardcoded Cycle
- **Audit ID:** Related to LIB issues
- **Severity:** 🟡 Medium
- **File:** `hooks/useDues.ts`
- **Task:** Replace hardcoded `'2025-2026'` with dynamic calculation using `rotaryYear()` from `lib/utils/rotaryYear.ts`.
- **Acceptance:** Dues cycle name updates automatically when the Rotary year changes in July.
- **Effort:** XS

### 3.10 — Fix `useFirestore` Reactivity Bug
- **Audit ID:** Related to hook issues
- **Severity:** 🟡 Medium
- **File:** `hooks/useFirestore.ts`
- **Task:** Properly include `constraints` in the `useEffect` dependency array. Serialize constraints to a stable key (e.g., JSON.stringify) to avoid infinite re-renders while still being reactive.
- **Acceptance:** Changing filter parameters triggers a new Firestore subscription.
- **Effort:** S

### 3.11 — Tighten Upload File Type Validation
- **Audit ID:** API-10
- **Severity:** 🟢 Low
- **File:** `app/api/upload/route.ts`
- **Task:** Replace `startsWith` with explicit MIME type whitelist: `['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']`.
- **Acceptance:** Only whitelisted MIME types accepted. Edge cases rejected.
- **Effort:** XS

### 3.12 — Add `/finance/` to robots.txt
- **Audit ID:** CFG-4
- **Severity:** 🟢 Low
- **File:** `public/robots.txt`
- **Task:** Add `Disallow: /finance/` line.
- **Acceptance:** Crawlers blocked from finance routes.
- **Effort:** XS

---

## Phase 4: Accessibility & UX (Week 4–5)

> **Goal:** Meet WCAG 2.1 AA compliance on all public pages and core portal flows.

### 4.1 — Fix Navbar Keyboard Navigation
- **Audit ID:** A11Y-1, CMP-3
- **Severity:** 🟡 Medium
- **File:** `components/public/Navbar.tsx`
- **Tasks:**
  - Add `onKeyDown` handler for Enter/Space to toggle dropdown.
  - Add `aria-haspopup="true"` and `aria-expanded` to dropdown trigger.
  - Add `role="menu"` to dropdown and `role="menuitem"` to dropdown items.
  - Support arrow key navigation within dropdown.
  - Close dropdown on Escape.
- **Acceptance:** Dropdown fully operable via keyboard. Tested with keyboard-only navigation.
- **Effort:** M

### 4.2 — Add Focus Trap to Mobile Menu
- **Audit ID:** A11Y-2
- **Severity:** 🟡 Medium
- **File:** `components/public/Navbar.tsx`
- **Task:** Implement focus trap when mobile menu is open. Focus returns to hamburger button on close.
- **Acceptance:** Tab key cycles only within the mobile menu when open.
- **Effort:** S

### 4.3 — Respect `prefers-reduced-motion`
- **Audit ID:** A11Y-3
- **Severity:** 🟡 Medium
- **Files:** `components/public/Navbar.tsx`, `tailwind.config.js`, `app/globals.css`
- **Task:** Add `@media (prefers-reduced-motion: reduce)` styles that disable or reduce animations. Use Tailwind's `motion-reduce:` variant.
- **Acceptance:** Animations disabled when user has motion reduction preference enabled.
- **Effort:** S

### 4.4 — Fix PortalShell Sidebar Accessibility
- **Audit ID:** A11Y-4, A11Y-5, CMP-4
- **Severity:** 🟡 Medium
- **File:** `components/portal/PortalShell.tsx`
- **Tasks:**
  - Move focus to sidebar when it opens on mobile.
  - Add `aria-current="page"` to the active nav item.
  - Add focus trap to sign-out confirmation popover.
  - Add `role="dialog"` and `aria-modal="true"` to the sign-out popover.
  - Return focus to sign-out button when popover closes.
- **Acceptance:** Screen reader announces sidebar opening. Active page announced. Popover traps focus.
- **Effort:** M

### 4.5 — Add `aria-pressed` to Donate Preset Buttons
- **Audit ID:** A11Y-6
- **Severity:** 🟡 Medium
- **File:** `app/(public)/donate/page.tsx`
- **Task:** Add `aria-pressed={selectedAmount === amount}` to each preset button.
- **Acceptance:** Screen reader announces "pressed" state for selected amount.
- **Effort:** XS

### 4.6 — Add `aria-hidden` to Decorative SVGs
- **Audit ID:** A11Y-7, CMP-2
- **Severity:** 🟢 Low
- **Files:** All component files with inline SVGs
- **Task:** Audit all SVGs and add `aria-hidden="true"` to decorative icons. Add `role="img"` and `aria-label` to meaningful SVGs.
- **Acceptance:** Screen reader doesn't announce decorative SVGs. Meaningful SVGs have labels.
- **Effort:** S

### 4.7 — Create Reusable ErrorBoundary Component
- **Audit ID:** CMP-1, CMP-6
- **Severity:** 🟡 Medium
- **File:** `components/ui/ErrorBoundary.tsx` (new)
- **Task:** Create a class-based `<ErrorBoundary>` component with fallback UI. Wrap key portal components (`FinanceCharts`, `PostComposer`, `EventCheckoutModal`, etc.) in error boundaries.
- **Acceptance:** A component crash shows a "Something went wrong" fallback without crashing the entire page.
- **Effort:** M

---

## Phase 5: Payments & Finance (Week 5–6)

> **Goal:** Stripe integration is robust, idempotent, and tracks all transactions.

### 5.1 — Add Stripe Webhook Idempotency
- **Audit ID:** PAY-1
- **Severity:** 🔴 Critical
- **File:** `lib/stripe/client.ts`
- **Task:** Before processing a webhook event, check if a transaction with the `session.id` already exists in Firestore. If so, skip processing and return 200.
- **Acceptance:** Sending the same webhook event twice doesn't create duplicate transactions.
- **Effort:** S

### 5.2 — Use Stripe Singleton in Donate Route
- **Audit ID:** PAY-2
- **Severity:** 🔴 Critical
- **File:** `app/api/donate/route.ts`
- **Task:** Import and use the `getStripe()` singleton from `lib/stripe/client.ts` instead of creating `new Stripe()` per request.
- **Acceptance:** Donate route uses the same Stripe instance as all other routes.
- **Effort:** XS

### 5.3 — Fix Donate Success Verification
- **Audit ID:** SEC-7
- **Severity:** 🟡 Medium
- **Files:** `app/api/donate/route.ts`, `app/(public)/donate/page.tsx`
- **Task:** Replace `?success=true` with Stripe's `{CHECKOUT_SESSION_ID}` template. On the donate page, verify the session ID server-side before showing the thank-you message.
- **Acceptance:** Navigating to `/donate?success=true` without a valid session doesn't show thank-you.
- **Effort:** M

### 5.4 — Validate Redirect URL in Donate Flow
- **Audit ID:** SEC-6
- **Severity:** 🟡 Medium
- **File:** `app/(public)/donate/page.tsx`
- **Task:** Before redirecting to `data.url`, validate that the URL starts with `https://checkout.stripe.com/`.
- **Acceptance:** Only Stripe checkout URLs are followed. Other URLs rejected.
- **Effort:** XS

### 5.5 — Handle Stripe Metadata Null Case
- **Audit ID:** PAY-4
- **Severity:** 🟡 Medium
- **File:** `lib/stripe/client.ts`
- **Task:** Replace `session.metadata!` non-null assertion with a proper null check. If metadata is null, log an error and return gracefully.
- **Acceptance:** Null metadata doesn't crash the webhook handler.
- **Effort:** XS

### 5.6 — Track Donations in Firestore
- **Audit ID:** PAY-6
- **Severity:** 🟢 Low
- **Files:** `app/api/donate/route.ts`, `lib/stripe/client.ts`
- **Task:** After successful donation checkout, record the donation as a transaction in Firestore (via webhook or checkout success callback).
- **Acceptance:** Donations appear in finance reports alongside dues and event payments.
- **Effort:** M

### 5.7 — Handle Expired Checkout Sessions
- **Audit ID:** PAY-5
- **Severity:** 🟡 Medium
- **File:** `lib/stripe/client.ts`
- **Task:** Add a `checkout.session.expired` event handler in the webhook. Log abandoned checkouts for analytics.
- **Acceptance:** Expired sessions logged. No user-facing errors.
- **Effort:** S

---

## Phase 6: Portal Polish & Error Handling (Week 6–7)

> **Goal:** Portal has proper error recovery, loading states, and consistent UX.

### 6.1 — Add `global-error.tsx`
- **Audit ID:** CORE-1
- **Severity:** 🟡 Medium
- **File:** `app/global-error.tsx` (new)
- **Task:** Create a global error boundary that catches root layout crashes. Must include its own `<html>` and `<body>` tags since it replaces the entire root layout.
- **Acceptance:** Root layout crash shows a branded error page instead of a white screen.
- **Effort:** S

### 6.2 — Add Portal Error Boundary
- **Audit ID:** PTL-2
- **Severity:** 🟡 Medium
- **File:** `app/portal/error.tsx` (new)
- **Task:** Create a portal-specific error boundary that renders within the `PortalShell` chrome (sidebar + header).
- **Acceptance:** Portal page crash shows error with sidebar still visible and a "Try again" button.
- **Effort:** S

### 6.3 — Fix 404 Page to Include Public Layout
- **Audit ID:** CORE-2
- **Severity:** 🟡 Medium
- **File:** `app/(public)/not-found.tsx` (new) or adjust routing
- **Task:** Create a `not-found.tsx` inside the `(public)` route group that renders with Navbar/Footer. Keep the root `not-found.tsx` as a fallback for non-public routes.
- **Acceptance:** 404 on public routes shows page with Navbar and Footer.
- **Effort:** S

### 6.4 — Add Portal Page Titles
- **Audit ID:** PTL-4
- **Severity:** 🟢 Low
- **File:** `app/portal/layout.tsx`
- **Task:** Use `useEffect` to set `document.title` dynamically based on the current route, or create individual `metadata` exports for portal pages that aren't `'use client'`.
- **Acceptance:** Browser tabs show descriptive titles like "Events — Rotaract Portal".
- **Effort:** S

### 6.5 — Add Portal Loading Skeleton
- **Audit ID:** PTL-5
- **Severity:** 🟢 Low
- **File:** `app/portal/loading.tsx` (new)
- **Task:** Create a portal-specific loading state with skeleton UI that renders within the PortalShell chrome.
- **Acceptance:** Portal route transitions show skeleton instead of generic spinner.
- **Effort:** S

### 6.6 — Strengthen Middleware JWT Handling
- **Audit ID:** PTL-1
- **Severity:** 🟡 Medium
- **File:** `middleware.ts`
- **Task:** While full verification must remain in API routes (Firebase Admin can't run in middleware), add additional checks:
  - Validate JWT header `alg` is `RS256`.
  - Validate `iss` matches the Firebase project.
  - Add a reasonable max-age check beyond just `exp` (e.g., token not older than 14 days).
- **Acceptance:** Crafted tokens with wrong issuer or algorithm are rejected at middleware.
- **Effort:** S

---

## Phase 7: PWA, Performance & Infrastructure (Week 7–8)

> **Goal:** PWA is production-quality, performance is optimized, infrastructure is up to date.

### 7.1 — Automate Service Worker Versioning
- **Audit ID:** PWA-1
- **Severity:** 🟡 Medium
- **File:** `public/sw.js`, `next.config.js`
- **Task:** Inject a build timestamp or content hash into the service worker at build time. Use a Next.js plugin or a custom build script.
- **Acceptance:** Service worker version updates automatically on each deployment without manual edits.
- **Effort:** S

### 7.2 — Add Offline Fallback Page
- **Audit ID:** PWA-2
- **Severity:** 🟡 Medium
- **Files:** `public/sw.js`, `public/offline.html` (new)
- **Task:** Create a branded offline fallback page. Pre-cache it in the service worker. Return it when navigation requests fail with no cached response.
- **Acceptance:** Turning off network shows a branded "You're offline" page instead of browser error.
- **Effort:** S

### 7.3 — Implement SW Update Prompt
- **Audit ID:** PWA-3, PWA-7
- **Severity:** 🟡 Medium
- **Files:** `public/sw.js`, `components/PWARegister.tsx`
- **Tasks:**
  - Remove `skipWaiting()` from SW install handler.
  - Add `updatefound` and `statechange` listeners in `PWARegister.tsx`.
  - Show a "New version available — Refresh" toast/banner when a new SW is waiting.
  - Call `skipWaiting()` only when user clicks refresh.
- **Acceptance:** Users see a non-intrusive update prompt. Clicking it activates the new SW.
- **Effort:** M

### 7.4 — Add Cache Size Limits
- **Audit ID:** PWA-4
- **Severity:** 🟢 Low
- **File:** `public/sw.js`
- **Task:** Implement LRU eviction with max 100 entries for the static assets cache. Evict oldest entries when limit is reached.
- **Acceptance:** Cache doesn't grow unbounded. Verified by inspecting cache in DevTools.
- **Effort:** S

### 7.5 — Complete PWA Manifest
- **Audit ID:** PWA-5, PWA-6
- **Severity:** 🟢 Low
- **File:** `public/manifest.json`
- **Task:** Add `id`, `scope`, `lang`, `prefer_related_applications: false`, `screenshots` array. Create a proper maskable icon with safe-zone padding. Add missing icon sizes (48, 72, 96, 128, 144).
- **Acceptance:** Chrome Lighthouse PWA audit passes with no warnings.
- **Effort:** S

### 7.6 — Optimize Finance Dashboard Queries
- **Audit ID:** PRF-1
- **Severity:** 🟡 Medium
- **File:** `lib/services/finance.ts`
- **Task:** Add server-side caching (`unstable_cache` or manual TTL cache) for the finance summary. Limit initial load to current month, with lazy loading for historical data.
- **Acceptance:** Finance dashboard loads in <2s. Repeated loads use cache.
- **Effort:** M

### 7.7 — Update Next.js Version
- **Audit ID:** CFG-3
- **Severity:** 🟡 Medium
- **File:** `package.json`
- **Task:** Update Next.js from 14.0.4 to latest stable 14.2.x. Review changelog for breaking changes. Run full test suite after update.
- **Acceptance:** All existing functionality works on updated Next.js. Build passes.
- **Effort:** M

### 7.8 — Add Vercel Region Configuration
- **Audit ID:** CFG-6
- **Severity:** 🟢 Low
- **File:** `vercel.json`
- **Task:** Add `"regions": ["iad1"]` for US East (NYC proximity).
- **Acceptance:** Serverless functions deploy to US East.
- **Effort:** XS

### 7.9 — Fix Tailwind Content Paths
- **Audit ID:** CFG-5
- **Severity:** 🟢 Low
- **File:** `tailwind.config.js`
- **Task:** Add `'./lib/**/*.{ts,tsx}'` to the content array.
- **Acceptance:** Tailwind classes in lib files are included in the production CSS bundle.
- **Effort:** XS

---

## Phase 8: Testing (Week 8–10)

> **Goal:** Achieve ≥ 60% test coverage on API routes and utilities. Critical paths covered.

### 8.1 — Portal API Route Tests (Priority 1)
- **Audit ID:** TST-1
- **Severity:** 🔴 Critical
- **Files:** New test files in `__tests__/api/portal/`
- **Task:** Write tests for:
  - `portal/members` — GET (auth check, status filter), POST (role validation)
  - `portal/events` — RSVP creation, status validation, auth check
  - `portal/service-hours` — POST (clamping, auth), GET (own hours only)
  - `portal/messages` — POST (rate limit, auth), GET (own messages only)
  - `portal/posts` — CRUD operations, auth checks
  - `portal/board` — GET response shape
  - `portal/dues` — GET, payment initiation
  - `finance/` routes — treasurer-only access, report generation
- **Acceptance:** ≥ 80% coverage on portal API routes. All auth checks verified.
- **Effort:** L

### 8.2 — Auth Flow Tests (Priority 1)
- **Audit ID:** TST-2
- **Severity:** 🔴 Critical
- **Files:** New test files in `__tests__/lib/`
- **Task:** Write tests for:
  - Session creation and verification
  - Session cookie expiry handling
  - Middleware JWT structure validation
  - Auth provider state transitions (signed out → signed in → member loaded)
- **Acceptance:** Auth flow edge cases covered. Mock Firebase Admin for unit tests.
- **Effort:** M

### 8.3 — Utility Function Tests (Priority 2)
- **Audit ID:** TST-5
- **Severity:** 🟡 Medium
- **Files:** New test files in `__tests__/lib/utils/`
- **Task:** Write tests for:
  - `sanitize.ts` — XSS payloads, edge cases, email validation
  - `formatDate.ts` — various date formats, relative time, edge cases
  - `slugify.ts` — special characters, unicode, empty strings
  - `calendar.ts` — Google Calendar URL generation, timezone handling
  - `rotaryYear.ts` — boundary dates (June 30 vs July 1), cycle name generation
  - `cn.ts` — class merging, Tailwind conflict resolution
- **Acceptance:** ≥ 95% coverage on utility functions. Edge cases documented.
- **Effort:** M

### 8.4 — Component Tests (Priority 2)
- **Audit ID:** TST-4
- **Severity:** 🟡 Medium
- **Files:** New test files in `__tests__/components/`
- **Task:** Write tests for:
  - Navbar — navigation links, mobile toggle, dropdown, search shortcut
  - Footer — link rendering, social icons
  - ContactForm — validation, submission, error states
  - DonateForm — preset selection, custom amount, submission
  - PortalShell — sidebar toggle, navigation, sign-out
- **Acceptance:** Core interactive components have tests. Accessibility assertions included.
- **Effort:** M

### 8.5 — E2E Test Foundation (Priority 3)
- **Audit ID:** TST-6
- **Severity:** 🟢 Low
- **Files:** `playwright.config.ts`, `e2e/` directory (new)
- **Task:** Set up Playwright. Write E2E tests for:
  - Public page navigation (home → events → event detail)
  - Contact form submission
  - Donate flow (up to Stripe redirect)
  - Portal login (mock Google OAuth)
- **Acceptance:** E2E tests run in CI. Critical user flows verified.
- **Effort:** L

---

## Phase 9: Final Polish & Launch Prep (Week 10–11)

> **Goal:** All loose ends tied up. Production deployment checklist completed.

### 9.1 — Clean Up Analytics Module
- **Audit ID:** LIB-5
- **Severity:** 🟢 Low
- **File:** `lib/analytics.ts`
- **Task:** Either integrate Google Analytics properly with a `<Script>` tag, or remove the GA module entirely if Vercel Analytics is sufficient.
- **Acceptance:** No dead code. Analytics module matches what's actually deployed.
- **Effort:** XS

### 9.2 — Fix Slugify Unicode Handling
- **Audit ID:** LIB-6
- **Severity:** 🟢 Low
- **File:** `lib/utils/slugify.ts`
- **Task:** Add `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` to handle accented characters.
- **Acceptance:** `slugify('café')` returns `'cafe'`.
- **Effort:** XS

### 9.3 — Fix Calendar URL Timezone
- **Audit ID:** LIB-7
- **Severity:** 🟢 Low
- **File:** `lib/utils/calendar.ts`
- **Task:** Strip trailing `Z` from ISO strings used in Google Calendar URLs, or pass timezone parameter.
- **Acceptance:** Calendar events created in the correct timezone.
- **Effort:** XS

### 9.4 — Email System Improvements
- **Audit ID:** EML-1, EML-2, EML-3, EML-4
- **Severity:** 🟡 Medium
- **Files:** `lib/email/send.ts`, `lib/email/templates.ts`
- **Tasks:**
  - Fast-fail when `RESEND_API_KEY` is missing instead of creating a client with `'missing'`.
  - Batch `sendBulkEmail` into chunks of 10 with `Promise.all` per chunk.
  - Add defense-in-depth HTML escaping inside email templates.
  - Add plain text fallback for all templates.
- **Acceptance:** Emails render in text-only clients. Bulk sends don't hit rate limits.
- **Effort:** M

### 9.5 — Lighthouse Audit
- **Severity:** Required for launch
- **Task:** Run Lighthouse on all public pages. Fix any issues to meet targets:
  - Performance ≥ 90
  - Accessibility ≥ 95
  - SEO ≥ 95
  - Best Practices ≥ 90
- **Acceptance:** All public pages meet Lighthouse targets.
- **Effort:** M

### 9.6 — Production Deployment Checklist
- **Task:** Verify the following before launch:
  - [ ] All env vars set in Vercel dashboard
  - [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
  - [ ] Storage rules deployed (`firebase deploy --only storage`)
  - [ ] Firestore indexes deployed (`firebase deploy --only firestore:indexes`)
  - [ ] Stripe webhooks configured for production endpoint
  - [ ] Resend verified domain configured
  - [ ] Custom domain DNS configured
  - [ ] CORS configuration deployed
  - [ ] GitHub Actions secrets set (`NEXT_PUBLIC_BASE_URL`, `AUTOMATION_API_KEY`)
  - [ ] PWA manifest icons at all required sizes
  - [ ] `robots.txt` pointing to correct sitemap URL
  - [ ] Vercel Analytics enabled
  - [ ] Error monitoring configured
  - [ ] Backup strategy for Firestore data
- **Effort:** S

---

## Out of Scope (Post-V1)

These items are intentionally deferred:

| Item | Reason |
|------|--------|
| Nonce-based CSP (if `unsafe-inline` remains) | Requires middleware changes that may impact performance; document the risk for V1 |
| Algolia or full-text search for member directory | Current approach works for club size (<500 members) |
| WebSocket real-time updates | Firestore listeners are sufficient for V1 |
| Admin panel rebuild | V1 is public site + member portal only |
| Multi-language support (i18n) | Single-language club for now |
| Native mobile app | PWA is sufficient for V1 |
| Advanced analytics dashboard | Vercel Analytics is sufficient for V1 |
| Automated visual regression testing | Nice-to-have, not critical |
| Server-side member directory pagination | Fine for <500 members |
| GA integration | Vercel Analytics covers V1 needs |

---

## Definition of Done

A task is **done** when:

1. ✅ Code change implemented and tested
2. ✅ TypeScript compiles with zero errors
3. ✅ ESLint passes with zero errors
4. ✅ Relevant tests written and passing
5. ✅ Manually tested in development
6. ✅ Code reviewed (self or peer)
7. ✅ Audit issue ID marked resolved

---

## Effort Key

| Size | Approximate Time |
|------|-----------------|
| **XS** | < 1 hour |
| **S** | 1–3 hours |
| **M** | 3–8 hours |
| **L** | 1–2 days |
| **XL** | 2–5 days |

---

## Estimated Total Effort

| Phase | Total Effort |
|-------|-------------|
| Phase 1: Security & Critical | ~3–4 days |
| Phase 2: SEO & Public Pages | ~2 days |
| Phase 3: API Hardening | ~3–4 days |
| Phase 4: Accessibility | ~3–4 days |
| Phase 5: Payments | ~3 days |
| Phase 6: Portal Polish | ~2–3 days |
| Phase 7: PWA & Performance | ~3–4 days |
| Phase 8: Testing | ~5–7 days |
| Phase 9: Final Polish | ~3–4 days |
| **Total** | **~27–34 working days** |

---

*Last updated: April 6, 2026*
*See also: `docs/AUDIT.md` · `docs/SECURITY.md` · `docs/ACCESSIBILITY.md` · `docs/TESTING_PLAN.md`*
