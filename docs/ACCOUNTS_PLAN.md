# Public Accounts & Member Portal — Implementation Plan

**Status:** Phases 0–1 implemented — Phases 2–6 proposed
**Author:** Engineering
**Last updated:** 2026-06-16

This document specifies how to introduce **public/supporter accounts** alongside the
existing **member portal**, structured as **two account types backed by two
collections**, with a dedicated `/account` area for supporters and the existing
`/portal` area reserved for verified members.

It is written to be reviewed *before* any code is written. Nothing here changes
member-facing behavior until the phases are implemented in order.

---

## 1. Goals

1. Let anyone outside the club create a lightweight **supporter account** to manage
   tickets, receipts, RSVPs, donations, saved payment info, and newsletter/volunteer
   preferences — and to **apply for membership**.
2. Keep the **member portal** (directory, minutes, dues, committees, elections,
   internal docs) strictly gated to verified, dues-paying members.
3. **Never force account creation to buy a ticket.** Guest checkout stays exactly as
   it is today (name + email). Accounts are offered *after* checkout, and prior
   purchases appear automatically once the guest activates an account.
4. Add **email/password** and **passwordless magic-link** sign-in in addition to the
   existing Google sign-in.

### Non-goals (for this iteration)

- Replacing Google sign-in for existing members.
- Migrating finance/dues data models.
- A full marketing-newsletter platform (we define the integration seam, not the ESP).

---

## 2. Locked decisions

| Decision | Choice |
| --- | --- |
| Account types | **Two**: Supporter (public) and Member (internal), with Guest below and Board/Admin above. |
| Storage | **Two collections**: new `accounts/{uid}` (identity for everyone signed in) + existing `members/{uid}` (verified members only). |
| Supporter route surface | **`/account/*`** (new). `/portal/*` stays member-only. |
| Auth methods | Google (existing) **+ Email/Password + Email magic link**. |
| Session cookie | **Keep `rotaract_portal_session`** for both areas; centralize the name in a `SESSION_COOKIE_NAME` constant. No rename → no forced re-login. |
| Newsletter ESP | **Resend Audiences** (reuses the existing Resend transactional setup). |
| Member visiting `/account` | **Unified hub** — `/account` is the shared base experience for everyone; members additionally have `/portal`. No redirect. |
| Existing pending members | **Auto-convert** current `status: 'pending'` self-signups to supporter accounts + a draft application on migration. |
| Custom claims | **Adopt in Phase 0** — set `{ accountType, role }` claims on the token; force refresh on promotion. |

---

## 3. Role model

Four conceptual roles, derived from which documents exist for a user:

| Role | How it's determined | Access |
| --- | --- | --- |
| **Guest** | Not signed in. Identified only by email on a purchase/donation. | Public events, checkout, tickets/receipts by email link, announcements. |
| **Supporter** | Signed in + has `accounts/{uid}`, **no** `members/{uid}`. | Guest access **+** saved profile, donation history, saved payments, RSVP management, waitlist, newsletter/volunteer prefs, **apply for membership**. |
| **Member** | Has `accounts/{uid}` **and** `members/{uid}` with `status == 'active'`. | Supporter access **+** internal portal: directory, minutes/docs, committees, dues, service hours, members-only events, elections, member email. |
| **Board/Admin** | Member with `role in ['board','treasurer','president']`. | Member access **+** management, reporting, approvals, communications. |

**Key invariant:** `accounts/{uid}` is the base identity for *every* signed-in person.
A **member is an account that also has a `members/{uid}` doc.** This keeps the existing
`isMember()` predicate (and every internal rule built on it) unchanged, while supporters
get a purely *additive* surface.

```
Guest ─activate→ Supporter ─apply + board approval→ Member ─role change→ Board/Admin
  │                  │                                   │
  └ guest_rsvps      └ accounts/{uid}                    └ accounts/{uid} + members/{uid}
    donors/{email}
```

---

## 4. Data model

### 4.1 New collection: `accounts/{uid}`

Created for **every** authenticated user (supporter *and* member). Keyed by Firebase
Auth `uid`, so a member's `accounts/{uid}` and `members/{uid}` share the same id.

```ts
// types/index.ts (additions)
export type AccountType = 'supporter' | 'member';

export interface Account {
  id: string;                 // == Firebase uid
  email: string;
  emailVerified: boolean;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  phone?: string;

  accountType: AccountType;   // 'supporter' until promoted to 'member'
  authProviders: ('google' | 'password' | 'emailLink')[];

  // Relationship / pipeline
  membershipApplicationId?: string;   // set when an application is in flight
  memberSince?: string;               // ISO when promoted to member

  // Payments
  stripeCustomerId?: string;          // created lazily on first save/purchase

  // Preferences
  subscriptions?: {
    newsletter?: boolean;
    volunteer?: boolean;
    eventReminders?: boolean;
  };

  // Audit
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}
```

### 4.2 New collection: `membershipApplications/{id}`

Replaces the current *implicit* "sign in → pending member doc → wait for approval"
flow with an **explicit** application.

```ts
export type MembershipApplicationStatus =
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export interface MembershipApplication {
  id: string;
  accountUid: string;          // accounts/{uid}
  email: string;
  name: string;
  memberType: 'professional' | 'student';
  occupation?: string;
  employer?: string;
  reason?: string;             // why they want to join
  referredBy?: string;
  status: MembershipApplicationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### 4.3 Changes to existing collections

| Collection | Change | Why |
| --- | --- | --- |
| `members` | Unchanged schema. **Stop auto-creating** a pending doc on sign-in. Created only via invite migration or approved application. | Members become explicit, not a side effect of signing in. |
| `guest_rsvps` | Add optional `accountUid?: string`. | Lets a claimed ticket attach to an account; enables fast queries. |
| `donors/{email}` | Add optional `accountUid?: string`. | Link donation history to an account on claim. |
| `transactions` | (Optional) add `accountUid?` when buyer is logged in. | Receipts list in `/account`. |
| `formResponses` | Already has `respondentEmail`. Used to surface past form submissions in `/account` (optional). | Continuity. |

### 4.4 New: `newsletterSubscribers/{email}` (logged-out capture)

For newsletter signups from the **public site** without an account. When the person
later creates an account, the claim step links/merges by email.

```ts
export interface NewsletterSubscriber {
  email: string;
  name?: string;
  source: 'footer' | 'event' | 'donate' | 'account';
  accountUid?: string;
  confirmed: boolean;          // double opt-in
  createdAt: string;
  unsubscribedAt?: string;
}
```

---

## 5. Authentication changes

### 5.1 Firebase console (no code)

- Enable **Email/Password** provider.
- Enable **Email link (passwordless)** sign-in.
- Add `/account/verify` to the authorized action URL allowlist; configure
  `actionCodeSettings.url`.
- Confirm authorized domains include production + preview domains.

### 5.2 Shared session, two entry points

Both `/account` and `/portal` use the **same Firebase session cookie**
(`rotaract_portal_session`) created by the existing session route. Role separation is
enforced at the **data/UI/rules** layer, not the cookie.

**Decision:** keep the existing `rotaract_portal_session` name (renaming would force a
one-time re-login for every current member for no functional gain). To avoid the name
spreading further, introduce a single `SESSION_COOKIE_NAME` constant in
[lib/constants.ts](../lib/constants.ts) and reference it from
[middleware.ts](../middleware.ts),
[app/api/portal/auth/session/route.ts](../app/api/portal/auth/session/route.ts), and the
ticket routes that read it (e.g.
[app/api/portal/events/[id]/cancel-ticket/route.ts](../app/api/portal/events/%5Bid%5D/cancel-ticket/route.ts)).
A future rename then becomes a one-line change.

- `/portal/login` — stays Google-only, titled "Member Portal" (existing).
- `/account/login` + `/account/signup` — Google **+** email/password **+** magic link.

### 5.3 Auth context split

[lib/firebase/auth.tsx](../lib/firebase/auth.tsx) currently:
- auto-creates a **pending member** on first sign-in (Step 4), and
- exposes only `{ user, member, ... }`.

Changes:
1. **Stop** auto-creating `members/{uid}`. Instead ensure `accounts/{uid}` exists
   (idempotent upsert), defaulting `accountType: 'supporter'`.
2. Expose both records: `{ user, account, member, loading, sessionReady, ... }`.
   `member` stays `null` for supporters.
3. Add methods:
   - `signInWithEmail(email, password)`
   - `signUpWithEmail(email, password, name)` → sends verification email
   - `sendMagicLink(email)` → `sendSignInLinkToEmail`
   - `completeMagicLink()` → `isSignInWithEmailLink` + `signInWithEmailLink`
4. Keep the existing session-cookie POST and invite-migration handshake.

The existing invite-migration path in
[app/api/portal/auth/session/route.ts](../app/api/portal/auth/session/route.ts) **stays**
(board pre-creates invited member docs → migrated to uid on first sign-in). We add one
step there: **always ensure `accounts/{uid}` exists**, and if a `members/{uid}` doc is
active, set `accountType: 'member'` on the account.

### 5.4 Custom claims (adopted — Phase 0)

Set Firebase custom claims `{ accountType, role }` so middleware/rules can read identity
from the token without a Firestore read.

- Claims are written server-side via the Admin SDK whenever `accounts/{uid}` is created
  (`accountType: 'supporter'`) and on promotion to member / role change.
- After any claim change the client **forces a token refresh** (`getIdToken(true)`) and
  re-establishes the session cookie so the new claims take effect immediately.
- **Firestore docs remain the source of truth.** Claims are a fast path; rules still fall
  back to `get()` where a claim may be stale, so a missed refresh can never *grant*
  access it shouldn't.

---

## 6. Routing & middleware

### 6.1 `/account` route tree (new)

```
app/account/
  layout.tsx          # AccountShell + AuthProvider (reused/extended)
  page.tsx            # Supporter dashboard
  login/page.tsx      # Google + email/password + magic link
  signup/page.tsx
  verify/page.tsx     # magic-link completion + email verification landing
  tickets/page.tsx    # purchased tickets (member + claimed guest rsvps)
  receipts/page.tsx   # Stripe receipts / transactions
  donations/page.tsx  # donation history (from donors/{email})
  rsvps/page.tsx      # manage RSVP details + join/leave waitlist
  billing/page.tsx    # saved payment methods (Stripe)
  profile/page.tsx    # saved profile + subscriptions
  membership/page.tsx # apply for membership / application status
```

### 6.2 Middleware

[middleware.ts](../middleware.ts) currently guards `/portal/:path*` and validates the
session JWT at the edge.

- Add `/account/:path*` to the matcher.
- For `/account/*` (except `/account/login`, `/account/signup`, `/account/verify`),
  apply the **same** cookie/JWT validity check as portal — but **do not** require member
  status (middleware never checked member status anyway; it only validates the cookie).
- `/portal/*` strict check is unchanged.
- The **portal shell** must redirect a signed-in **non-member** (supporter) to
  `/account` instead of rendering internal chrome. Today this never happens because every
  sign-in created a pending member; after 5.3 it can, so the portal layout needs an
  explicit "no member doc → redirect to /account" branch.

```ts
// middleware.ts matcher
export const config = { matcher: ['/portal/:path*', '/account/:path*'] };
```

---

## 7. Firestore rules

Add predicates (keep `isMember()` exactly as-is):

```
function isSignedIn() { return request.auth != null; }

function hasAccount() {
  return isSignedIn()
    && exists(/databases/$(database)/documents/accounts/$(request.auth.uid));
}

function emailVerified() {
  return isSignedIn() && request.auth.token.email_verified == true;
}

function ownsEmail(email) {
  return emailVerified() && request.auth.token.email == email;
}
```

New / changed collection rules:

```
// accounts — a user manages their own account doc
match /accounts/{uid} {
  allow read: if isOwner(uid) || isBoard();
  allow create: if isOwner(uid)
                && request.resource.data.accountType == 'supporter';
  allow update: if isOwner(uid)
                && !request.resource.data.diff(resource.data).affectedKeys()
                     .hasAny(['accountType','stripeCustomerId','memberSince']);
  allow update: if isBoard();          // promotion, stripe id set server-side
  allow delete: if isPresident();
}

// membershipApplications — supporter submits, board reviews
match /membershipApplications/{id} {
  allow read:   if isBoard()
                || (hasAccount() && resource.data.accountUid == request.auth.uid);
  allow create: if hasAccount()
                && request.resource.data.accountUid == request.auth.uid
                && request.resource.data.status == 'submitted';
  allow update: if isBoard()
                || (hasAccount()
                    && resource.data.accountUid == request.auth.uid
                    && request.resource.data.status == 'withdrawn');
  allow delete: if isPresident();
}

// guest_rsvps — let a verified owner read their own by email (board still reads all)
match /guest_rsvps/{rsvpId} {
  allow read: if isBoard() || ownsEmail(resource.data.email);
  allow write: if false;   // still Admin-SDK only
}

// donors — let a verified owner read their own donation history
match /donors/{email} {
  allow read: if isBoard() || ownsEmail(resource.data.email);
  allow write: if false;
}
```

> **Sensitive change:** opening `guest_rsvps`/`donors` reads to `ownsEmail(...)` is the
> only relaxation. It is safe because it requires `email_verified == true` **and** an
> exact token-email match. All writes remain Admin-SDK only.

Add `firestore.indexes.json` entries:
- `guest_rsvps` by `email` (+ `status`/`createdAt`).
- `membershipApplications` by `status` + `createdAt`, and by `accountUid`.

---

## 8. The guest → account claim flow (conversion-safe)

This is the central new mechanism and the explicit answer to *"don't require an account
for every ticket."*

```
1. Guest checks out with name + email only         → app/api/events/checkout (UNCHANGED)
2. Webhook records guest_rsvps + sends confirmation → lib/stripe/webhooks.ts
   • Confirmation email gains a CTA:
     "Create your free account to manage this ticket → /account/signup?email=…"
3. Guest creates an account (any method) & verifies email
4. /api/account/claim runs server-side:
   • verifies the Firebase user's email is verified
   • finds guest_rsvps WHERE email == verified email AND accountUid == null
   • finds donors/{verifiedEmail}, newsletterSubscribers/{verifiedEmail}
   • stamps accountUid onto each (Admin SDK)
5. /account/tickets, /account/donations now show prior history automatically
```

Reads use either the stamped `accountUid` or the `ownsEmail()` rule, so history appears
even before the claim job finishes (defense in depth).

**Security guardrails**
- Claim only ever matches the **verified** token email. Password signups must verify
  before claiming; magic-link and Google emails are inherently verified.
- Claim is idempotent and rate-limited.
- No PII is exposed cross-account: a user can only ever claim records whose email equals
  their own verified email.

---

## 9. Supporter hub UI (`/account`)

`components/account/AccountShell.tsx` — lighter chrome than `PortalShell`, public-site
styling. Dashboard surfaces:

- **Upcoming events** (public) with RSVP/buy buttons.
- **My tickets** — member RSVPs + claimed guest tickets, with QR codes (reuse
  `generateTicketQRCodeUrls`).
- **Receipts** — Stripe receipts/transactions by email/customer.
- **Donation history** — from `donors/{email}` (+ event-scoped donations).
- **RSVP management / waitlist** — edit details, leave, or join waitlist (reuse
  `/api/events/rsvp` and `/api/events/waitlist`).
- **Saved profile & preferences** — name, phone, photo, newsletter/volunteer toggles.
- **Saved payments** — Stripe billing portal.
- **Membership** — "Apply for membership" CTA or live application status.

`/portal` is unchanged for members; a member visiting `/account` sees the same supporter
hub (it's the base tier they also own).

---

## 10. Membership application pipeline (Supporter → Member)

1. Supporter opens `/account/membership` → submits `membershipApplications` doc
   (`status: 'submitted'`).
2. Board reviews in `/portal/admin` (new "Applications" view) → approve/reject.
3. **Approve** (server, Admin SDK):
   - Create/activate `members/{uid}` (reusing the existing member shape + onboarding
     state machine `INVITED → PENDING_PROFILE → PENDING_PAYMENT → ACTIVE`).
   - Set `accounts/{uid}.accountType = 'member'`, `memberSince = now`.
   - Set custom claims `{ accountType: 'member', role }` and force a token refresh on the
     member's next session.
   - Kick off dues via existing dues/onboarding flow.
4. **Reject** sets status + optional note; supporter keeps their account.

The existing email-only [app/api/membership-interest/route.ts](../app/api/membership-interest/route.ts)
stays as the **logged-out** "I'm interested" path; logged-in users get the richer
application instead.

---

## 11. Saved payments & receipts (Stripe)

- Lazily create a **Stripe Customer** on first save/purchase; store `stripeCustomerId`
  on `accounts/{uid}` (Admin-SDK write).
- **Save a card:** `SetupIntent` + Stripe **Customer Portal** (hosted) for management.
- **Reuse a saved card:** pass `customer` (+ `setup_future_usage`) into future Checkout
  Sessions in [app/api/events/checkout/route.ts](../app/api/events/checkout/route.ts) and
  [app/api/donate/route.ts](../app/api/donate/route.ts) when the buyer is logged in.
- **Receipts:** Stripe already emails them; `/account/receipts` lists them by
  customer/email.

New routes:
- `app/api/account/billing/setup-intent/route.ts`
- `app/api/account/billing/portal/route.ts`

---

## 12. Newsletter & volunteer subscriptions

- Logged-in: toggles on `accounts/{uid}.subscriptions`.
- Logged-out: public footer/event/donate forms write `newsletterSubscribers/{email}`
  (double opt-in), linked to an account later via the claim step.
- **ESP: Resend Audiences** — reuses the existing Resend transactional setup
  ([lib/email](../lib/email)), so no new vendor. A thin `lib/email/audience.ts` wrapper
  (`addContact`, `removeContact`, `sendBroadcast`) keeps the provider swappable. Sync is
  one-way: Firestore is the source of truth, mirrored into a Resend Audience on
  subscribe/unsubscribe and on account claim.

---

## 13. Phased rollout

Each phase is independently shippable and leaves members unaffected until cut over.

| Phase | Scope | Key files |
| --- | --- | --- |
| **0 — Foundations** ✅ | `accounts` collection + types + rules predicates; `SESSION_COOKIE_NAME` constant; custom claims `{accountType, role}` on account create; auth context creates `accounts` (not pending members); **auto-convert** existing `status:'pending'` self-signups to supporter accounts + draft application; portal redirects non-members to `/account` (+ minimal `/account` hub). | `types/index.ts`, `lib/constants.ts`, `lib/firebase/auth.tsx`, `app/api/portal/auth/session/route.ts`, `firestore.rules`, `app/portal/layout.tsx`, `components/portal/PortalShell.tsx`, `middleware.ts`, `app/account/*`, `scripts/migrate-pending-members.ts` |
| **1 — Auth methods** ✅ | Email/password + magic link + password reset; `/account/login`, `/account/signup`, `/account/verify`; middleware routes `/account` → `/account/login`. | `lib/firebase/auth.tsx`, `lib/firebase/authErrors.ts`, `components/account/authUi.tsx`, `app/account/login`, `app/account/signup`, `app/account/verify`, `middleware.ts`, `app/api/portal/auth/session/route.ts` |
| **2 — Supporter hub (read-only)** | `/account` shell + dashboard, tickets, receipts, donations, profile. | `components/account/AccountShell.tsx`, `app/account/*` |
| **3 — Claim flow** | Post-checkout activation CTA + `/api/account/claim`; `guest_rsvps.accountUid`. | `lib/stripe/webhooks.ts`, `lib/email/templates`, `app/api/account/claim/route.ts`, `app/api/events/checkout/route.ts` |
| **4 — Saved payments** | Stripe Customer + billing portal + reuse in checkout/donate. | `app/api/account/billing/*`, `app/api/events/checkout/route.ts`, `app/api/donate/route.ts`, `lib/stripe/webhooks.ts` |
| **5 — Membership pipeline** | `membershipApplications` + apply UI + board review/approve → member. | `types/index.ts`, `app/account/membership`, `app/api/account/membership/route.ts`, `app/portal/admin/*`, `firestore.rules` |
| **6 — Subscriptions & RSVP self-serve** | Newsletter/volunteer prefs, waitlist + RSVP management in `/account`. | `app/account/rsvps`, `app/account/profile`, `newsletterSubscribers`, `lib/email/audience.ts` |

---

## 14. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Forcing accounts hurts ticket conversion | Guest checkout stays untouched; accounts are *post-purchase* and optional. |
| Supporter data leaking into member-only views | `isMember()` unchanged; supporters only get *additive* `hasAccount()` access; internal rules untouched. |
| Cross-account history theft via email | Claim/read requires `email_verified == true` **and** exact token-email match; all writes Admin-SDK only. |
| Existing self-signup members mid-flight | One-time migration auto-converts current `status: 'pending'` self-signups to supporter accounts + a draft application; invited-member migration path preserved. |
| Custom-claim staleness | Firestore docs stay source of truth; claims are a fast path only and never *grant* access alone — rules fall back to `get()`. Token is force-refreshed on promotion. |
| Two manifests / PWA scope | Extend existing manifest-swap logic to add a supporter manifest. |

---

## 15. Resolved decisions

1. **Cookie name:** keep `rotaract_portal_session` for both areas; centralize as
   `SESSION_COOKIE_NAME` so a future rename is a one-line change. No forced re-login.
2. **ESP for newsletter:** **Resend Audiences**, wrapped by `lib/email/audience.ts`;
   Firestore stays source of truth and is mirrored one-way into the audience.
3. **Member visiting `/account`:** **unified hub** — `/account` is the shared base
   experience for everyone; members additionally get `/portal`. No redirect away from
   `/account`.
4. **Existing pending members:** **auto-convert** — a one-time migration turns current
   `status: 'pending'` self-signups into supporter accounts with a draft membership
   application.
5. **Custom claims:** **adopted in Phase 0** — `{ accountType, role }` on the token,
   force-refreshed on promotion, with Firestore as the authoritative fallback.

---

## 16. File-by-file change checklist

**New**
- `app/account/{layout,page}.tsx`, `app/account/{login,signup,verify,tickets,receipts,donations,rsvps,billing,profile,membership}/page.tsx`
- `components/account/AccountShell.tsx`
- `app/api/account/claim/route.ts`
- `app/api/account/profile/route.ts`
- `app/api/account/membership/route.ts`
- `app/api/account/billing/{setup-intent,portal}/route.ts`
- `lib/email/audience.ts`
- `scripts/migrate-pending-members.ts` (one-time: pending self-signups → supporter accounts + draft applications)

**Modified**
- `types/index.ts` — `Account`, `AccountType`, `MembershipApplication`, `NewsletterSubscriber`, `subscriptions`
- `lib/constants.ts` — add `SESSION_COOKIE_NAME` constant
- `middleware.ts` — add `/account/:path*`; read cookie via `SESSION_COOKIE_NAME`
- `lib/firebase/auth.tsx` — account/member split; email + magic-link methods; stop auto pending-member; force token refresh after claim changes
- `app/api/portal/auth/session/route.ts` — ensure `accounts/{uid}`; set custom claims `{accountType, role}`; set `accountType` for members; use `SESSION_COOKIE_NAME`
- `app/portal/layout.tsx` — redirect non-members to `/account`
- `firestore.rules` — predicates + `accounts`, `membershipApplications`; relax `guest_rsvps`/`donors` reads to `ownsEmail`
- `firestore.indexes.json` — `guest_rsvps` by email; `membershipApplications` by status/accountUid
- `app/api/events/checkout/route.ts` — stamp `accountUid` when logged in; saved-card reuse
- `app/api/donate/route.ts` — saved-card reuse; link donor to account
- `lib/stripe/webhooks.ts` — Stripe customer attach; account linking; activation-CTA email
- `lib/email/templates` — "activate your account" CTA in confirmations
```
