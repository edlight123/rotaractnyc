# 🚀 Production Deployment Checklist — Rotaract NYC

> Auto-generated from code audit on 2026-04-07.
> ✅ = verified from code  |  ⚠️ = needs manual action  |  ❌ = issue found

---

## 1. Environment Variables

### 1.1 Client-Exposed (`NEXT_PUBLIC_*`)

| Variable | Required | Used In | Status |
|----------|----------|---------|--------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ **Required** | `lib/firebase/client.ts` | ⚠️ Set in Vercel |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ **Required** | `lib/firebase/client.ts` | ⚠️ Set in Vercel |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ **Required** | `lib/firebase/client.ts`, `middleware.ts` | ⚠️ Set in Vercel |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ **Required** | `lib/firebase/client.ts` | ⚠️ Set in Vercel |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Optional | `lib/firebase/client.ts` (not in required list) | ⚠️ Set in Vercel |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ **Required** | `lib/firebase/client.ts` | ⚠️ Set in Vercel |
| `NEXT_PUBLIC_BASE_URL` | ✅ **Required** | Dues automation emails, event checkout | ⚠️ Set to `https://rotaractnyc.org` |
| `NEXT_PUBLIC_SITE_URL` | ✅ **Required** | Donate, dues, event checkout redirects | ⚠️ Set to `https://rotaractnyc.org` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ❌ Not used | `lib/analytics.ts` is no-op stubs | ✅ Safe to skip |

### 1.2 Server-Only

| Variable | Required | Used In | Status |
|----------|----------|---------|--------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ✅ **Required** (pick one method) | `lib/firebase/admin.ts` | ⚠️ Set in Vercel |
| `FIREBASE_SERVICE_ACCOUNT` | Alt. for above | `lib/firebase/admin.ts` | ⚠️ Alternative |
| `FIREBASE_PROJECT_ID` | Alt. method 3 | `lib/firebase/admin.ts` | ⚠️ Alternative |
| `FIREBASE_CLIENT_EMAIL` | Alt. method 3 | `lib/firebase/admin.ts` | ⚠️ Alternative |
| `FIREBASE_PRIVATE_KEY` | Alt. method 3 | `lib/firebase/admin.ts` | ⚠️ Alternative |
| `STRIPE_SECRET_KEY` | ✅ **Required** | `lib/stripe/client.ts`, donate, dues, events, webhook | ⚠️ Set in Vercel |
| `STRIPE_WEBHOOK_SECRET` | ✅ **Required** | `lib/stripe/client.ts`, webhook route | ⚠️ Set in Vercel |
| `RESEND_API_KEY` | ✅ **Required** | `lib/email/send.ts` | ⚠️ Set in Vercel |
| `RESEND_FROM_EMAIL` | Optional | `lib/email/send.ts` — defaults to `noreply@rotaractnyc.org` | ✅ Has default |
| `RESEND_TO_EMAIL` | Optional | `api/contact`, `api/membership-interest` — defaults to `rotaractnewyorkcity@gmail.com` | ✅ Has default |
| `ADMIN_ALLOWLIST` | Optional | `api/portal/auth/session` — comma-separated admin emails | ⚠️ Set in Vercel |
| `UPSTASH_REDIS_REST_URL` | **Recommended** | `lib/rateLimit.ts` | ⚠️ Set for prod rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | **Recommended** | `lib/rateLimit.ts` | ⚠️ Set for prod rate limiting |
| `CRON_SECRET` | Optional | `api/admin/dues/automation` — GitHub Actions auth | ⚠️ Set if using automation |

### 1.3 GitHub Actions Secrets (for dues automation)

| Secret | Purpose |
|--------|---------|
| `NEXT_PUBLIC_BASE_URL` | Production URL for cron API calls |
| `CRON_SECRET` | Auth header for automation endpoint |

---

## 2. Firebase

### 2.1 Firestore Rules — ✅ VERIFIED
- [x] Helper functions: `isAuthenticated()`, `isMember()`, `isBoard()`, `isTreasurer()`, `isPresident()`, `isOwner()`
- [x] **members** — members read directory; owners create pending profiles; owners edit (no role/status); board edits all; president deletes
- [x] **events** — public+published readable by anyone; members see all; board manages
- [x] **rsvps** — members read; members create/update own (UID-prefixed); board deletes
- [x] **articles** — published readable; members read all; board manages
- [x] **gallery** — publicly readable; board manages
- [x] **posts** — members read/create; likes update with append-only; board moderates; author deletes own
- [x] **posts/comments** — members read/create; author edits/deletes; board moderates
- [x] **documents** — members read; board manages
- [x] **serviceHours** — owner reads own + board reads all; members create own (pending); owner edits pending; board approves/deletes
- [x] **duesCycles** — members read; treasurer+ manages
- [x] **memberDues** — member reads own + treasurer reads all; treasurer manages; president deletes
- [x] **transactions** — treasurer+ only
- [x] **messages** — participants read; sender creates; recipient marks read; either party deletes
- [x] **settings** — publicly readable; board manages
- [x] **committees** — members read; writes via Admin SDK only (client writes disabled)
- [x] **documentFolders** — members read; board manages
- [x] **Catch-all deny** — `match /{document=**} { allow read, write: if false; }`

### 2.2 Firestore Indexes — ✅ VERIFIED
Comprehensive indexes for all collections:
- `events` (3 indexes), `articles` (2), `members` (3), `posts` (1), `comments` (1), `rsvps` (3), `documents` (3), `serviceHours` (4), `memberDues` (4), `messages` (3), `transactions` (2), `activities` (2), `expenses` (3), `offlinePayments` (1), `gallery` (1), `site_media` (1)
- **Total: 37 composite indexes**

⚠️ **Deploy action:** Run `firebase deploy --only firestore:indexes` before go-live

### 2.3 Storage Rules — ✅ VERIFIED
- [x] `profile-photos/{userId}` — members read; owner writes (image, <10MB)
- [x] `post-attachments/{userId}` — members read; owner writes (image/PDF, <10MB)
- [x] `documents/` — members read; board manages
- [x] `event-images/` — publicly readable; board writes (image, <10MB)
- [x] `gallery/` — publicly readable; board writes
- [x] `article-images/` — publicly readable; board writes
- [x] `site-media/` — publicly readable; board writes
- [x] `receipts/` — board reads/writes (image/PDF, <10MB)
- [x] Catch-all deny

⚠️ **Deploy action:** Run `firebase deploy --only storage`

### 2.4 CORS Configuration — ✅ VERIFIED
- Origins: `rotaractnyc-henna.vercel.app`, `rotaractnyc.vercel.app`, `*.vercel.app`, `localhost:3000`
- Methods: GET, POST, PUT, DELETE, HEAD, OPTIONS
- ⚠️ **Production note:** If using a custom domain (e.g. `rotaractnyc.org`), **add it to cors.json** and re-apply with `gsutil cors set cors.json gs://rotaractnyc-ac453.firebasestorage.app`

---

## 3. Stripe

### 3.1 Webhook Endpoint — ✅ VERIFIED
- [x] Route exists at `app/api/webhooks/stripe/route.ts`
- [x] Verifies `stripe-signature` header
- [x] Constructs event with `STRIPE_WEBHOOK_SECRET`
- [x] Handles: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
- [x] Idempotency guard (checks `transactions` collection for `stripeSessionId`)
- [x] Returns 200 even on handler errors (prevents infinite Stripe retries)

⚠️ **Deploy action:** Register webhook endpoint in Stripe Dashboard:
  - URL: `https://rotaractnyc.org/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
  - Copy signing secret to `STRIPE_WEBHOOK_SECRET` env var

### 3.2 Stripe Price IDs — ✅ VERIFIED (no hardcoded IDs)
- Dues amounts are configured in `lib/constants.ts` (professional: $90, student: $70)
- All Stripe sessions use `price_data` with dynamic `unit_amount` — **no hardcoded Price IDs**
- Donation amounts use preset tiers ($25/$50/$100) or custom amount

### 3.3 Stripe Checkout Flows — ✅ VERIFIED
- [x] Donations: `api/donate/route.ts`
- [x] Dues payments: `api/portal/dues/route.ts`
- [x] Event tickets: `api/portal/events/checkout/route.ts`

---

## 4. PWA

### 4.1 manifest.json — ✅ VERIFIED
- [x] `name`, `short_name`, `description` set
- [x] `display: standalone`, `theme_color: #9B1B30`
- [x] Icons: 48px through 512px (using 192px and 512px source PNGs)
- [x] Maskable icon included
- [x] Shortcuts: Events, News, Member Portal
- ⚠️ **Minor:** `screenshots` array is empty — consider adding for better install prompt

### 4.2 Service Worker — ✅ VERIFIED
- [x] `public/sw.js` exists
- [x] Cache versioning via build date (auto-updated by `next.config.js`)
- [x] Pre-caches: `/`, `/events`, `/news`, `/about`, `/gallery`, `/manifest.json`, `/offline.html`
- [x] Network-first for HTML, cache-first for static assets
- [x] Skips API, admin, and portal routes
- [x] Old cache cleanup on activate
- [x] `SKIP_WAITING` message listener for update prompts

### 4.3 Offline Page — ✅ VERIFIED
- [x] `public/offline.html` exists (127-line styled fallback page)

### 4.4 PWA Registration — ✅ VERIFIED
- [x] `<PWARegister />` component included in root layout

---

## 5. SEO

### 5.1 robots.txt — ✅ VERIFIED
- [x] `Allow: /` for all user agents
- [x] `Disallow: /portal/`, `/finance/`, `/api/`, `/sw.js`, `/manifest.json`
- [x] Sitemap URL: `https://rotaractnyc.org/sitemap.xml`

### 5.2 Sitemap — ✅ VERIFIED
- [x] `app/sitemap.ts` exists
- [x] Static routes: home, about, events, news, gallery, leadership, faq, membership, contact, donate, partners
- [x] Dynamic routes: event slugs from Firestore, article slugs from Firestore
- [x] Proper `changeFrequency` and `priority` values

### 5.3 Page Metadata — ✅ VERIFIED
All public pages use `generateMeta()` from `lib/seo.ts`:
- [x] Home (`/`)
- [x] About (`/about`)
- [x] Events (`/events`) + dynamic `[slug]` with `generateMetadata`
- [x] News (`/news`) + dynamic `[slug]` with `generateMetadata`
- [x] Gallery (`/gallery`)
- [x] Leadership (`/leadership`)
- [x] FAQ (`/faq`)
- [x] Membership (`/membership`)
- [x] Contact (`/contact`)
- [x] Donate (`/donate`)
- [x] Partners (`/partners`)

Each page gets: `title`, `description`, `openGraph`, `twitter`, `canonical URL`

### 5.4 Root Metadata — ✅ VERIFIED
- [x] `metadataBase` set to `https://rotaractnyc.org` (via `SITE.url`)
- [x] Template: `%s | Rotaract NYC`
- [x] Manifest link: `/manifest.json`
- [x] OpenGraph defaults: type=website, siteName, title, description
- [x] Favicons: ico, 16px, 32px, apple-touch-icon — all files exist

---

## 6. Security

### 6.1 HTTP Security Headers — ✅ VERIFIED (in `next.config.js`)
| Header | Value | Status |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | ✅ |
| `X-Frame-Options` | `SAMEORIGIN` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ |
| `X-DNS-Prefetch-Control` | `on` | ✅ |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | ✅ |
| **Content-Security-Policy** | Comprehensive CSP | ✅ (see notes) |

**CSP Notes:**
- `script-src` and `style-src` include `'unsafe-inline'` — documented as a known V1 trade-off due to styled-jsx, react-quill, novel editor, Google Identity Services, and Stripe.js
- `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'` are all present
- `connect-src` restricts outbound to Firebase, Stripe, and Vercel Analytics only

### 6.2 Middleware Auth Protection — ✅ VERIFIED
- [x] Protects all `/portal/*` routes except `/portal/login`
- [x] Checks for `rotaract_portal_session` cookie
- [x] Validates JWT structure (3 dot-separated segments)
- [x] Validates `alg: RS256`
- [x] Validates `exp` (expiration)
- [x] Validates `iss` (issuer matches Firebase project)
- [x] Validates `iat` (max 14-day age)
- [x] Clears cookie and redirects to login on any failure
- [x] Preserves original path as `?redirect=` parameter

### 6.3 Rate Limiting — ✅ VERIFIED
- [x] Upstash Redis-backed sliding window limiter (production)
- [x] In-memory fallback for development
- [x] Applied to: contact form (5/60s), membership interest (3/60s), donate (10/60s), portal auth (10/60s)
- ⚠️ **Production:** Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set — without them, rate limiting degrades to per-instance memory (ineffective in serverless)

### 6.4 Session Cookie Security — ✅ VERIFIED
- [x] `secure: true` in production (`process.env.NODE_ENV === 'production'`)
- [x] Firebase Admin `createSessionCookie()` with 14-day expiry

### 6.5 Input Validation — ✅ VERIFIED
- [x] `isValidEmail()` on contact and membership forms
- [x] `DOMPurify` in dependencies for HTML sanitization
- [x] `clampNumber()` for donation amounts

---

## 7. Build & Deployment Config

### 7.1 Vercel Config — ✅ VERIFIED
- [x] Framework: `nextjs`
- [x] Region: `iad1` (US East — Virginia)
- [x] Build command: `npm run build`
- [x] Output: `.next`

### 7.2 Next.js Config — ✅ VERIFIED
- [x] `eslint.ignoreDuringBuilds: false` — lint errors fail the build ✅
- [x] `typescript.ignoreBuildErrors: false` — type errors fail the build ✅
- [x] Remote image patterns: Firebase Storage, Google Photos, Unsplash, Squarespace
- [x] Build ID auto-generates from date (also stamps `sw.js` cache version)

### 7.3 Firebase Config — ✅ VERIFIED
- [x] `firebase.json` points to correct rules and indexes files

---

## 8. Pre-Deployment Actions

### ⚠️ Must do before first production deploy:

| # | Action | Command / Location |
|---|--------|--------------------|
| 1 | Set ALL required env vars in Vercel | Vercel Dashboard → Settings → Environment Variables |
| 2 | Deploy Firestore rules | `firebase deploy --only firestore:rules` |
| 3 | Deploy Firestore indexes | `firebase deploy --only firestore:indexes` |
| 4 | Deploy Storage rules | `firebase deploy --only storage` |
| 5 | Apply CORS to storage bucket | `gsutil cors set cors.json gs://rotaractnyc-ac453.firebasestorage.app` |
| 6 | Add production domain to CORS | Edit `cors.json` → add `https://rotaractnyc.org` → re-apply |
| 7 | Register Stripe webhook | Dashboard → `https://rotaractnyc.org/api/webhooks/stripe` |
| 8 | Verify Resend domain | `rotaractnyc.org` must be verified in Resend for email sending |
| 9 | Create Upstash Redis database | https://console.upstash.com → copy REST URL + token |
| 10 | Add Firebase auth domain | Firebase Console → Authentication → Settings → Authorized domains → add `rotaractnyc.org` |
| 11 | Set `NEXT_PUBLIC_BASE_URL` to `https://rotaractnyc.org` | Vercel env vars |
| 12 | Set `NEXT_PUBLIC_SITE_URL` to `https://rotaractnyc.org` | Vercel env vars |
| 13 | Verify icon assets exist | All PWA icons confirmed present ✅ |
| 14 | Run production build locally | `npm run build` — check for errors |

### ⚠️ Post-deploy verification:

| # | Check | How |
|---|-------|----|
| 1 | All public pages load | Visit each route manually |
| 2 | Lighthouse PWA audit | Chrome DevTools → Lighthouse |
| 3 | Stripe test payment | Use test card `4242 4242 4242 4242` |
| 4 | Contact form sends email | Submit form, check Resend dashboard |
| 5 | Portal login works | Sign in with Google, verify session cookie |
| 6 | Webhook receives events | Check Stripe Dashboard → Webhooks → Logs |
| 7 | robots.txt accessible | `curl https://rotaractnyc.org/robots.txt` |
| 8 | sitemap.xml accessible | `curl https://rotaractnyc.org/sitemap.xml` |
| 9 | Security headers present | `curl -I https://rotaractnyc.org` |
| 10 | CSP violations | Check browser console for CSP errors |

---

## 9. Issues & Concerns Found

### ❌ Env Var Naming Inconsistency
- The code uses `RESEND_FROM_EMAIL` but the old `.env.local.example` had `RESEND_FROM` — **fixed** in the updated `.env.local.example`
- The code uses `RESEND_TO_EMAIL` but the old file had `RESEND_CONTACT_TO` — **fixed**
- `STRIPE_PUBLISHABLE_KEY` was in old `.env.local.example` but is never referenced in code (Stripe Checkout uses server-side redirects only) — **removed**
- `FIREBASE_SERVICE_ACCOUNT_BASE64` was in old `.env.local.example` but code reads `FIREBASE_SERVICE_ACCOUNT_KEY` / `FIREBASE_SERVICE_ACCOUNT` — **fixed**
- `MONGODB_URI` was in old `.env.local.example` but is not used anywhere in the codebase — **removed**

### ⚠️ Dual URL Variables
`NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_SITE_URL` serve the same purpose but both are checked in different files:
- `donate/route.ts` → `NEXT_PUBLIC_SITE_URL`
- `portal/events/checkout/route.ts` → `NEXT_PUBLIC_BASE_URL || NEXT_PUBLIC_SITE_URL`
- `portal/dues/route.ts` → `NEXT_PUBLIC_SITE_URL`
- `admin/dues/automation/route.ts` → `NEXT_PUBLIC_BASE_URL`

**Recommendation:** Set both to the same value in production. Consider consolidating to a single variable in a future refactor.

### ⚠️ CORS Missing Production Domain
`cors.json` includes `*.vercel.app` and `localhost:3000` but not the production custom domain (e.g. `https://rotaractnyc.org`). Add it before go-live.

### ⚠️ CSP `unsafe-inline`
Both `script-src` and `style-src` include `unsafe-inline`. This is documented and accepted as a V1 trade-off. The code has a clear post-V1 remediation plan tracking the Next.js nonce support issue.

### ✅ No Hardcoded Secrets
No API keys, tokens, or secrets found hardcoded in source files — all use `process.env`.
