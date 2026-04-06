# 🧪 Rotaract NYC — Testing Plan

> **Created:** April 6, 2026
> **Current Coverage:** ~5% (6 test files for 100+ modules)
> **Target Coverage:** ≥ 60% on API routes and utilities for V1
> **Framework:** Jest 30 + React Testing Library
> **Related:** `docs/AUDIT.md` · `docs/V1_ROADMAP.md` (Phase 8)

---

## Table of Contents

- [Current State](#current-state)
- [Testing Strategy](#testing-strategy)
- [Priority 1: API Route Tests](#priority-1-api-route-tests)
- [Priority 2: Utility & Service Tests](#priority-2-utility--service-tests)
- [Priority 3: Hook Tests](#priority-3-hook-tests)
- [Priority 4: Component Tests](#priority-4-component-tests)
- [Priority 5: E2E Tests](#priority-5-e2e-tests)
- [Test Infrastructure](#test-infrastructure)
- [Mocking Strategy](#mocking-strategy)
- [Coverage Targets](#coverage-targets)

---

## Current State

### Existing Tests

| File | What it Tests | Quality |
|------|--------------|---------|
| `__tests__/api/contact.test.ts` | Contact API — missing fields, success, email fallback | ✅ Good |
| `__tests__/api/donate.test.ts` | Donate API — presets, custom, min/max, Stripe 503, invalid | ✅ Good |
| `__tests__/api/membership-interest.test.ts` | Membership API — required fields, email, minimal fields | ✅ Good |
| `__tests__/lib/constants.test.ts` | Constants — values, structure | ✅ Good |
| `__tests__/lib/seo.test.ts` | SEO helper — metadata generation | ✅ Good |
| `__tests__/lib/sitemap.test.ts` | Sitemap — URL generation, Firestore fallback | ✅ Good |

### What's Missing

| Category | Module Count | Test Count | Gap |
|----------|:-----------:|:----------:|-----|
| Portal API routes | 15+ | 0 | 🔴 Critical |
| Auth flow | 3 | 0 | 🔴 Critical |
| Utility functions | 8 | 0 | 🟡 Medium |
| Services | 10 | 0 | 🟡 Medium |
| Hooks | 12 | 0 | 🟡 Medium |
| Components | 30+ | 0 | 🟡 Medium |
| E2E flows | — | 0 | 🟢 Low |

---

## Testing Strategy

### Test Pyramid

```
        ╱╲
       ╱ E2E ╲          5% — Critical user flows only
      ╱────────╲
     ╱Integration╲      25% — API routes, auth flow
    ╱──────────────╲
   ╱  Component Tests  ╲  20% — Interactive components
  ╱──────────────────────╲
 ╱    Unit Tests           ╲ 50% — Utils, services, hooks
╱────────────────────────────╲
```

### Principles

1. **Test behavior, not implementation** — Test what the function/component does, not how.
2. **Mock at boundaries** — Mock Firebase, Stripe, Resend. Don't mock internal utilities.
3. **Arrange-Act-Assert** — Every test follows this pattern.
4. **One concern per test** — Each `it()` tests one specific behavior.
5. **Descriptive test names** — `it('returns 401 when session cookie is missing')` not `it('works')`.

---

## Priority 1: API Route Tests

> **Goal:** ≥ 80% coverage on all API routes
> **Effort:** Large (1-2 days)
> **Roadmap Phase:** 8.1

### File Structure

```
__tests__/
  api/
    contact.test.ts            ← Existing
    donate.test.ts             ← Existing
    membership-interest.test.ts ← Existing
    portal/
      auth-session.test.ts     ← NEW
      members.test.ts          ← NEW
      events.test.ts           ← NEW
      posts.test.ts            ← NEW
      service-hours.test.ts    ← NEW
      messages.test.ts         ← NEW
      board.test.ts            ← NEW
      dues.test.ts             ← NEW
    finance/
      expenses.test.ts         ← NEW
      reports.test.ts          ← NEW
    upload.test.ts             ← NEW
    webhooks.test.ts           ← NEW
```

### Test Specifications

#### `portal/auth-session.test.ts`
```
describe('POST /api/portal/auth/session')
  ✓ creates session cookie from valid ID token
  ✓ returns 401 for invalid ID token
  ✓ returns 400 when ID token is missing
  ✓ sets cookie with correct attributes (HttpOnly, Secure, SameSite)
  ✓ cookie expires in 14 days

describe('DELETE /api/portal/auth/session')
  ✓ clears the session cookie
  ✓ revokes Firebase session
```

#### `portal/members.test.ts`
```
describe('GET /api/portal/members')
  ✓ returns member list for authenticated active members
  ✓ returns 401 without session cookie
  ✓ returns 401 with expired session cookie
  ✓ returns 401 with revoked session
  ✓ filters out non-active members from results (after fix)

describe('POST /api/portal/members')
  ✓ creates member with valid data and board+ role
  ✓ returns 403 for regular member role
  ✓ validates required fields
  ✓ prevents duplicate member creation
```

#### `portal/events.test.ts`
```
describe('GET /api/portal/events')
  ✓ returns events for authenticated members
  ✓ returns 401 without auth

describe('POST /api/portal/events (RSVP)')
  ✓ creates RSVP with valid status ('going')
  ✓ creates RSVP with valid status ('maybe')
  ✓ creates RSVP with valid status ('not')
  ✓ returns 400 for invalid RSVP status (after fix)
  ✓ returns 401 without auth
  ✓ updates existing RSVP
```

#### `portal/service-hours.test.ts`
```
describe('GET /api/portal/service-hours')
  ✓ returns only user's own service hours
  ✓ board members can see all service hours
  ✓ returns 401 without auth

describe('POST /api/portal/service-hours')
  ✓ creates entry with valid data
  ✓ clamps hours to 0.25-24 range
  ✓ sets status to 'pending' automatically
  ✓ returns 400 for missing required fields
  ✓ returns 401 without auth
```

#### `portal/messages.test.ts`
```
describe('GET /api/portal/messages')
  ✓ returns only messages to/from current user
  ✓ returns 401 without auth

describe('POST /api/portal/messages')
  ✓ creates message with valid data
  ✓ sets fromId to current user automatically
  ✓ returns 401 without auth
```

#### `portal/dues.test.ts`
```
describe('GET /api/portal/dues')
  ✓ returns dues status for current user
  ✓ returns current cycle information
  ✓ returns 401 without auth
```

#### `portal/board.test.ts`
```
describe('GET /api/portal/board')
  ✓ returns board members
  ✓ works without authentication (public endpoint)
  ✓ returns correct data shape
```

#### `finance/expenses.test.ts`
```
describe('GET /api/finance/expenses')
  ✓ returns expenses for treasurer role
  ✓ returns 403 for regular member
  ✓ returns 403 for board member (non-treasurer)

describe('POST /api/finance/expenses')
  ✓ creates expense with valid data and treasurer role
  ✓ returns 403 for non-treasurer
  ✓ validates required fields
```

#### `upload.test.ts`
```
describe('POST /api/upload')
  ✓ accepts valid image file
  ✓ rejects files exceeding size limit
  ✓ rejects non-whitelisted MIME types (after fix)
  ✓ returns 401 without auth
  ✓ returns URL after successful upload
```

#### `webhooks.test.ts`
```
describe('POST /api/webhooks/stripe')
  ✓ processes checkout.session.completed for dues
  ✓ processes checkout.session.completed for events
  ✓ verifies webhook signature
  ✓ returns 400 for invalid signature
  ✓ handles duplicate webhooks idempotently (after fix)
  ✓ records transaction in Firestore
```

---

## Priority 2: Utility & Service Tests

> **Goal:** ≥ 95% coverage on pure utility functions
> **Effort:** Medium (3-8 hours)
> **Roadmap Phase:** 8.3

### File Structure

```
__tests__/
  lib/
    constants.test.ts          ← Existing
    seo.test.ts                ← Existing
    sitemap.test.ts            ← Existing
    utils/
      sanitize.test.ts         ← NEW
      formatDate.test.ts       ← NEW
      slugify.test.ts          ← NEW
      calendar.test.ts         ← NEW
      rotaryYear.test.ts       ← NEW
      cn.test.ts               ← NEW
    rateLimit.test.ts          ← NEW
    services/
      members.test.ts          ← NEW
      events.test.ts           ← NEW
      finance.test.ts          ← NEW
```

### Test Specifications

#### `utils/sanitize.test.ts`
```
describe('sanitizeInput')
  ✓ escapes HTML angle brackets
  ✓ escapes quotes (single and double)
  ✓ escapes ampersands
  ✓ handles empty strings
  ✓ handles null/undefined gracefully
  ✓ prevents XSS payloads: <script>alert(1)</script>
  ✓ prevents XSS payloads: <img onerror="alert(1)" src="x">
  ✓ preserves normal text

describe('isValidEmail')
  ✓ accepts valid emails (user@example.com)
  ✓ accepts emails with subdomains (user@mail.example.com)
  ✓ accepts emails with plus addressing (user+tag@example.com)
  ✓ rejects missing @ symbol
  ✓ rejects missing domain
  ✓ rejects empty strings
  ✓ rejects emails with spaces

describe('validateAndSanitize')
  ✓ validates all required fields present
  ✓ sanitizes all field values
  ✓ returns error for missing required fields
```

#### `utils/formatDate.test.ts`
```
describe('formatDate')
  ✓ formats ISO date string
  ✓ formats Date object
  ✓ handles Firestore Timestamp-like objects
  ✓ handles null/undefined

describe('formatCurrency')
  ✓ formats cents to dollars ($85.00)
  ✓ handles zero
  ✓ handles negative amounts

describe('formatRelativeTime')
  ✓ returns "just now" for < 1 minute
  ✓ returns "5 minutes ago" for 5 min
  ✓ returns "2 hours ago" for 2 hours
  ✓ returns "3 days ago" for 3 days
  ✓ returns formatted date for > 7 days
```

#### `utils/slugify.test.ts`
```
describe('slugify')
  ✓ converts to lowercase
  ✓ replaces spaces with hyphens
  ✓ removes special characters
  ✓ handles multiple consecutive spaces
  ✓ handles leading/trailing spaces
  ✓ handles empty string
  ✓ handles unicode characters (after fix)
  ✓ handles accented characters (café → cafe) (after fix)
```

#### `utils/calendar.test.ts`
```
describe('generateCalendarUrl')
  ✓ generates valid Google Calendar URL
  ✓ includes title, date, location
  ✓ encodes special characters in title
  ✓ handles events without location
  ✓ handles all-day events
```

#### `utils/rotaryYear.test.ts`
```
describe('rotaryYear')
  ✓ returns '2025-2026' for dates in July 2025 - June 2026
  ✓ returns '2026-2027' for July 1, 2026
  ✓ returns '2025-2026' for June 30, 2026
  ✓ handles January 1 (still previous July's year)
  ✓ handles December 31

describe('getCurrentCycleName')
  ✓ returns current Rotary year cycle name
```

#### `utils/cn.test.ts`
```
describe('cn')
  ✓ merges class names
  ✓ handles conditional classes
  ✓ resolves Tailwind conflicts (p-2 + p-4 → p-4)
  ✓ handles undefined/null/false values
  ✓ handles empty strings
```

---

## Priority 3: Hook Tests

> **Goal:** Test business logic in hooks
> **Effort:** Medium (3-8 hours)
> **Roadmap Phase:** 8.3 (part of)

### File Structure

```
__tests__/
  hooks/
    useFirestore.test.ts       ← NEW
    useDues.test.ts            ← NEW
    useDebounce.test.ts        ← NEW
    useMediaQuery.test.ts      ← NEW
```

### Test Specifications

#### `hooks/useFirestore.test.ts`
```
describe('useFirestore')
  ✓ returns initial loading state
  ✓ returns data after Firestore query resolves
  ✓ returns error state on query failure
  ✓ subscribes to real-time updates
  ✓ unsubscribes on unmount
  ✓ re-subscribes when constraints change (after fix)
  ✓ addDocument calls Firestore addDoc
  ✓ updateDocument calls Firestore updateDoc
  ✓ deleteDocument calls Firestore deleteDoc
```

#### `hooks/useDues.test.ts`
```
describe('useDues')
  ✓ returns current dues cycle
  ✓ uses dynamic Rotary year (not hardcoded) (after fix)
  ✓ returns payment status for current user
  ✓ handles missing dues data gracefully
```

#### `hooks/useDebounce.test.ts`
```
describe('useDebounce')
  ✓ returns initial value immediately
  ✓ debounces rapid value changes
  ✓ returns final value after delay
  ✓ resets timer on new value
```

---

## Priority 4: Component Tests

> **Goal:** Test interactive behavior of key components
> **Effort:** Medium (3-8 hours)
> **Roadmap Phase:** 8.4

### File Structure

```
__tests__/
  components/
    public/
      Navbar.test.tsx          ← NEW
      Footer.test.tsx          ← NEW
    portal/
      PortalShell.test.tsx     ← NEW
    ui/
      Button.test.tsx          ← NEW
      Modal.test.tsx           ← NEW
      Toast.test.tsx           ← NEW
    ContactForm.test.tsx       ← NEW
    DonateForm.test.tsx        ← NEW
```

### Test Specifications

#### `components/public/Navbar.test.tsx`
```
describe('Navbar')
  ✓ renders all navigation links
  ✓ shows "Member Login" link
  ✓ toggles mobile menu on hamburger click
  ✓ closes mobile menu on route change
  ✓ opens dropdown on keyboard Enter/Space (after fix)
  ✓ closes dropdown on Escape
  ✓ applies scroll styles on scroll
  ✓ renders skip-to-content link
  ✓ Cmd+K opens search modal
```

#### `components/public/Footer.test.tsx`
```
describe('Footer')
  ✓ renders social media links with aria-labels
  ✓ renders quick navigation links
  ✓ external links have rel="noopener noreferrer"
  ✓ renders copyright year
```

#### `components/portal/PortalShell.test.tsx`
```
describe('PortalShell')
  ✓ renders sidebar with navigation items
  ✓ highlights current page in navigation (after aria-current fix)
  ✓ toggles sidebar on mobile
  ✓ shows user avatar and name
  ✓ shows sign-out confirmation on click
  ✓ filters nav items by user role
```

#### `ContactForm.test.tsx`
```
describe('ContactForm')
  ✓ renders all form fields
  ✓ shows validation errors for empty required fields
  ✓ shows inline error on invalid email (after fix)
  ✓ disables submit button while submitting
  ✓ shows success message on successful submission
  ✓ shows error message on failed submission (after fix)
  ✓ doesn't show success on server error (after fix)
```

---

## Priority 5: E2E Tests

> **Goal:** Verify critical user flows end-to-end
> **Effort:** Large (1-2 days)
> **Roadmap Phase:** 8.5

### Setup

```bash
npm install -D @playwright/test
npx playwright install
```

### File Structure

```
e2e/
  public-navigation.spec.ts   ← NEW
  contact-form.spec.ts        ← NEW
  donate-flow.spec.ts         ← NEW
  portal-login.spec.ts        ← NEW
  portal-navigation.spec.ts   ← NEW
playwright.config.ts           ← NEW
```

### Test Specifications

#### `e2e/public-navigation.spec.ts`
```
test('homepage loads and shows hero')
test('navigate to events page')
test('navigate to event detail')
test('navigate to news page')
test('navigate to about page')
test('navigate to contact page')
test('navigate to donate page')
test('mobile navigation works')
test('404 page for invalid route')
```

#### `e2e/contact-form.spec.ts`
```
test('fill and submit contact form')
test('shows validation for empty fields')
test('shows error for invalid email')
```

#### `e2e/donate-flow.spec.ts`
```
test('select preset donation amount')
test('enter custom donation amount')
test('redirects to Stripe checkout')
```

#### `e2e/portal-login.spec.ts`
```
test('shows login page for unauthenticated user')
test('redirects to login when accessing protected route')
test('preserves redirect URL after login')
```

---

## Test Infrastructure

### Jest Configuration (existing: `jest.config.js`)

Current config is good. Enhancements needed:

```javascript
// Add to jest.config.js
module.exports = {
  // ... existing config
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    'hooks/**/*.ts',
    'components/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThresholds: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    'app/api/': {
      branches: 70,
      functions: 80,
      lines: 80,
    },
    'lib/utils/': {
      branches: 90,
      functions: 95,
      lines: 95,
    },
  },
};
```

### Test Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:api": "jest --testPathPattern=__tests__/api",
    "test:lib": "jest --testPathPattern=__tests__/lib",
    "test:components": "jest --testPathPattern=__tests__/components",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Mocking Strategy

### Firebase Admin (Server-side)
```typescript
// __mocks__/lib/firebase/admin.ts
export const adminDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

export const adminAuth = {
  verifySessionCookie: jest.fn(),
  verifyIdToken: jest.fn(),
  createSessionCookie: jest.fn(),
  revokeRefreshTokens: jest.fn(),
};
```

### Firebase Client (Client-side)
```typescript
// __mocks__/firebase/firestore.ts
export const collection = jest.fn();
export const doc = jest.fn();
export const onSnapshot = jest.fn();
export const addDoc = jest.fn();
export const updateDoc = jest.fn();
export const deleteDoc = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
```

### Stripe
```typescript
// __mocks__/stripe.ts
export default jest.fn(() => ({
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      }),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
}));
```

### Resend (existing mock pattern)
```typescript
// Already mocked in existing tests — reuse pattern
jest.mock('@/lib/email/send', () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
  sendBulkEmail: jest.fn().mockResolvedValue([]),
}));
```

### Rate Limiter (existing mock pattern)
```typescript
// Already mocked in existing tests — reuse pattern
jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));
```

### Next.js Request/Response
```typescript
// helpers/test-utils.ts
import { NextRequest } from 'next/server';

export function createMockRequest(options: {
  method?: string;
  body?: any;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  url?: string;
}) {
  const url = options.url || 'http://localhost:3000/api/test';
  const request = new NextRequest(url, {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (options.cookies) {
    Object.entries(options.cookies).forEach(([name, value]) => {
      request.cookies.set(name, value);
    });
  }
  
  return request;
}
```

---

## Coverage Targets

### V1 Launch Requirements

| Category | Files | Line Coverage | Branch Coverage |
|----------|-------|:------------:|:--------------:|
| **API Routes (public)** | 3/3 tested | ≥ 80% | ≥ 70% |
| **API Routes (portal)** | 8/15 critical | ≥ 80% | ≥ 70% |
| **API Routes (finance)** | 2/3 critical | ≥ 80% | ≥ 70% |
| **API Routes (webhooks)** | 1/1 | ≥ 80% | ≥ 70% |
| **Utility functions** | 6/6 | ≥ 95% | ≥ 90% |
| **Services** | 3/10 critical | ≥ 60% | ≥ 50% |
| **Hooks** | 4/12 critical | ≥ 50% | ≥ 40% |
| **Components** | 5/30 critical | ≥ 40% | ≥ 30% |
| **E2E flows** | 5 specs | N/A | N/A |

### Post-V1 Targets

| Category | Target Line Coverage |
|----------|:-------------------:|
| All API routes | ≥ 90% |
| All utilities | ≥ 98% |
| All services | ≥ 80% |
| All hooks | ≥ 70% |
| All components | ≥ 60% |
| **Overall** | **≥ 75%** |

---

## Implementation Order

```
Week 8:
  Day 1-2: Priority 1 — Portal API route tests (auth, members, events, service-hours)
  Day 3:   Priority 1 — Portal API route tests (messages, dues, finance)
  Day 4:   Priority 2 — Utility function tests (all 6 files)

Week 9:
  Day 1:   Priority 2 — Service tests (members, events, finance)
  Day 2:   Priority 3 — Hook tests (useFirestore, useDues, useDebounce)
  Day 3-4: Priority 4 — Component tests (Navbar, Footer, PortalShell, forms)

Week 10:
  Day 1:   Set up Playwright
  Day 2-3: Priority 5 — E2E tests (5 specs)
  Day 4:   Coverage report review, gap filling
```

---

*Run `npm run test:coverage` regularly to track progress toward targets.*
