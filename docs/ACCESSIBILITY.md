# ♿ Rotaract NYC — Accessibility Audit & Remediation Guide

> **Audit Date:** April 6, 2026
> **Standard:** WCAG 2.1 Level AA
> **Scope:** All public pages, portal login, core portal flows
> **Related:** `docs/AUDIT.md` · `docs/V1_ROADMAP.md` (Phase 4)

---

## Table of Contents

- [Summary](#summary)
- [1. Keyboard Navigation](#1-keyboard-navigation)
- [2. Screen Reader Support](#2-screen-reader-support)
- [3. Focus Management](#3-focus-management)
- [4. Motion & Animation](#4-motion--animation)
- [5. Images & Media](#5-images--media)
- [6. Forms & Inputs](#6-forms--inputs)
- [7. Color & Contrast](#7-color--contrast)
- [8. Semantic HTML](#8-semantic-html)
- [9. ARIA Usage](#9-aria-usage)
- [Component-by-Component Findings](#component-by-component-findings)
- [Remediation Checklist](#remediation-checklist)

---

## Summary

| Category | Issues Found | Critical | Medium | Low |
|----------|:------------|:--------:|:------:|:---:|
| Keyboard Navigation | 4 | 0 | 3 | 1 |
| Screen Reader | 5 | 0 | 2 | 3 |
| Focus Management | 4 | 0 | 3 | 1 |
| Motion & Animation | 1 | 0 | 1 | 0 |
| Images & Media | 2 | 0 | 1 | 1 |
| Forms & Inputs | 2 | 0 | 1 | 1 |
| Semantic HTML | 2 | 0 | 0 | 2 |
| ARIA Usage | 4 | 0 | 2 | 2 |
| **Total** | **24** | **0** | **13** | **11** |

### What's Working Well ✅
- Skip-to-content link present in Navbar
- Semantic HTML structure (`<header>`, `<main>`, `<footer>`, `<nav>`, `<article>`, `<section>`)
- `<nav>` has `aria-label`
- Mobile hamburger has `aria-label`, `aria-expanded`, `aria-controls`
- Footer social links have `aria-label`
- External links have proper `rel="noopener noreferrer"` and `target="_blank"`
- Heading hierarchy is correct (h1 > h2 > h3) on all pages
- Dark mode toggle preserves readability
- Form inputs have associated labels (via HTML attributes)

---

## 1. Keyboard Navigation

### KBD-1: Navbar Dropdown Inaccessible via Keyboard 🟡
**WCAG:** 2.1.1 Keyboard (A)
**File:** `components/public/Navbar.tsx`

**Problem:** The "About" dropdown menu opens on mouse hover and click only. Keyboard users pressing Tab skip over it entirely, unable to access submenu items (About, FAQ, Leadership).

**Remediation:**
```tsx
// Add to dropdown trigger button
<button
  aria-haspopup="true"
  aria-expanded={isOpen}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      // Focus first menu item
    }
  }}
>

// Add to dropdown menu
<ul role="menu" aria-label="About submenu">
  <li role="menuitem" tabIndex={-1}>
    <Link href="/about">About</Link>
  </li>
  ...
</ul>
```

**Testing:** Tab to dropdown trigger → Enter opens menu → Arrow keys navigate items → Escape closes.

---

### KBD-2: No Focus Trap in Mobile Menu 🟡
**WCAG:** 2.1.2 No Keyboard Trap (A) — inverse: focus should be trapped *within* the modal
**File:** `components/public/Navbar.tsx`

**Problem:** When the mobile hamburger menu is open, Tab key can move focus to elements behind the overlay. Users can interact with hidden content.

**Remediation:**
- Trap focus within the mobile menu when open
- Return focus to the hamburger button when closed
- Consider using `@headlessui/react` `Dialog` component (already a dependency) which handles this automatically

**Testing:** Open mobile menu → Tab repeatedly → Focus cycles within menu only → Escape closes and returns focus to hamburger.

---

### KBD-3: Sign-Out Popover Not Keyboard Accessible 🟡
**WCAG:** 2.1.1 Keyboard (A)
**File:** `components/portal/PortalShell.tsx`

**Problem:** The sign-out confirmation popover has no focus trap. Keyboard users can interact with elements behind it.

**Remediation:**
- Add `role="dialog"` and `aria-modal="true"` to the popover
- Trap focus between "Cancel" and "Sign Out" buttons
- Auto-focus the "Cancel" button on open
- Return focus to the sign-out trigger on close

---

### KBD-4: Search Modal Keyboard Handling 🟢
**File:** `components/SearchModal.tsx`

**Problem:** The search modal (Cmd+K) likely needs keyboard navigation for results. Verify arrow key navigation works for search results.

**Testing:** Open search → Type query → Arrow keys navigate results → Enter selects.

---

## 2. Screen Reader Support

### SR-1: Decorative SVGs Not Hidden 🟡
**WCAG:** 1.1.1 Non-text Content (A)
**Files:** Multiple component files

**Problem:** Inline SVG icons (chevrons, social icons, action icons) throughout the codebase lack `aria-hidden="true"`. Screen readers attempt to announce them, reading meaningless content like "image" or nothing.

**Affected Components:**
- Navbar chevron on dropdown trigger
- Footer social media icons
- Event cards (calendar icon, location icon)
- Portal sidebar navigation icons
- Button icons (edit, delete, close)
- Status badges with icons

**Remediation:**
```tsx
// Decorative icon — hide from screen readers
<svg aria-hidden="true" focusable="false" ...>

// Meaningful icon (standalone, no text) — add label
<svg role="img" aria-label="Delete event">
```

**Rule of thumb:**
- Icon next to text label → `aria-hidden="true"`
- Icon-only button → `aria-label` on the button, `aria-hidden="true"` on the SVG

---

### SR-2: No `aria-current="page"` on Active Nav Items 🟡
**WCAG:** 2.4.8 Location (AAA, but best practice for AA)
**File:** `components/portal/PortalShell.tsx`

**Problem:** Active navigation items are indicated only visually (background color). Screen reader users don't know which page they're on.

**Remediation:**
```tsx
<Link
  href="/portal/events"
  aria-current={pathname === '/portal/events' ? 'page' : undefined}
>
  Events
</Link>
```

---

### SR-3: Homepage Sections Lack Labels 🟢
**WCAG:** 1.3.1 Info and Relationships (A)
**File:** `app/(public)/page.tsx`

**Problem:** `<section>` elements on the homepage don't have `aria-label` or `aria-labelledby`, making them opaque when navigating by landmarks.

**Remediation:**
```tsx
<section aria-labelledby="pillars-heading">
  <h2 id="pillars-heading">Our Pillars</h2>
  ...
</section>
```

---

### SR-4: Footer Missing `role="contentinfo"` 🟢
**File:** `components/public/Footer.tsx`

**Problem:** While `<footer>` implies `contentinfo`, some older assistive technologies don't map it. Adding explicit role improves compatibility.

**Remediation:** `<footer role="contentinfo">`

---

### SR-5: Live Regions for Dynamic Content 🟢
**Files:** Contact form, donate form, portal dashboard

**Problem:** When forms submit or data updates dynamically, screen readers aren't notified. Success/error messages should use `aria-live`.

**Remediation:**
```tsx
<div aria-live="polite" aria-atomic="true">
  {status === 'success' && <p>Message sent successfully!</p>}
  {status === 'error' && <p>Failed to send message. Please try again.</p>}
</div>
```

---

## 3. Focus Management

### FM-1: Sidebar Focus on Open 🟡
**WCAG:** 2.4.3 Focus Order (A)
**File:** `components/portal/PortalShell.tsx`

**Problem:** When the mobile sidebar opens, focus stays on the hamburger button behind the overlay. Screen reader users don't know the sidebar appeared.

**Remediation:**
- Move focus to the sidebar's close button (or first navigation item) when it opens
- Return focus to the hamburger button when closed
- Use `useEffect` with a ref to manage focus

---

### FM-2: Modal Focus Return 🟡
**Files:** `components/portal/MessageModal.tsx`, `components/portal/CreateEventModal.tsx`, `components/portal/EventCheckoutModal.tsx`

**Problem:** When modals close, focus may not return to the element that triggered them.

**Remediation:**
- Store a ref to the triggering element before opening the modal
- Return focus to it on close via `triggerRef.current?.focus()`
- Use `@headlessui/react` `Dialog` which handles this automatically

---

### FM-3: Skip-to-Content Target in Portal 🟡
**File:** `components/portal/PortalShell.tsx`

**Problem:** The Navbar's skip-to-content link targets `#main-content`, but the portal's `<main>` may not have that ID. Verify the target exists.

**Remediation:** Ensure `<main id="main-content" tabIndex={-1}>` is present in PortalShell.

---

### FM-4: Gallery Lightbox Focus 🟢
**File:** `app/(public)/gallery/page.tsx`

**Problem:** When the lightbox opens, verify focus moves to it and is trapped. When closed, focus should return to the thumbnail that was clicked.

---

## 4. Motion & Animation

### MOT-1: No `prefers-reduced-motion` Respect 🟡
**WCAG:** 2.3.3 Animation from Interactions (AAA, but important for vestibular disorders)
**Files:** `components/public/Navbar.tsx`, `tailwind.config.js`, `app/globals.css`

**Problem:** Animations (mobile menu slide-down, hero slideshow, page transitions) play regardless of user preference.

**Remediation:**

Add to `app/globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Use Tailwind's `motion-reduce` variant in components:
```tsx
<div className="animate-slide-down motion-reduce:animate-none">
```

---

## 5. Images & Media

### IMG-1: Gallery Images Generic Alt Text 🟡
**WCAG:** 1.1.1 Non-text Content (A)
**File:** `app/(public)/gallery/page.tsx`

**Problem:** Gallery images without captions fall back to `"Gallery photo"` — identical alt text for many different images.

**Remediation:**
- Use: `alt={image.caption || \`Photo from ${image.event || 'Rotaract event'} - ${image.date || ''}\`}`
- For decorative/repeated gallery images, consider `alt=""` with `role="presentation"` and a gallery-level description

---

### IMG-2: News Cover Images Use `<img>` 🟢
**WCAG:** Not directly WCAG, but affects performance and alt text handling
**File:** `app/(public)/news/page.tsx`

**Problem:** Native `<img>` used instead of Next.js `<Image>`. While `<Image>` enforces `alt` props, native `<img>` may have it missing.

**Remediation:** Replace with `<Image>` component which will enforce `alt` at the TypeScript level.

---

## 6. Forms & Inputs

### FRM-1: Contact Form Error Handling 🟡
**WCAG:** 3.3.1 Error Identification (A), 3.3.3 Error Suggestion (AA)
**File:** `app/(public)/contact/page.tsx`

**Problem:** Form errors shown via `window.alert()` — not accessible, not visually associated with the field that has an error.

**Remediation:**
- Show inline error messages next to each invalid field
- Use `aria-invalid="true"` on invalid fields
- Use `aria-describedby` to associate error messages with fields
- Use `aria-live="polite"` for the error summary

```tsx
<input
  type="email"
  aria-invalid={errors.email ? 'true' : undefined}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <p id="email-error" role="alert" className="text-red-600 text-sm">
    {errors.email}
  </p>
)}
```

---

### FRM-2: Donate Preset Buttons Toggle Pattern 🟢
**WCAG:** 4.1.2 Name, Role, Value (A)
**File:** `app/(public)/donate/page.tsx`

**Problem:** Preset amount buttons act as a toggle group but don't communicate selection state to assistive technology.

**Remediation:**
```tsx
<button
  role="radio"
  aria-checked={selected === amount}
  // OR use aria-pressed for toggle buttons
  aria-pressed={selected === amount}
>
  ${amount}
</button>
```

Wrap in `role="radiogroup"` with `aria-label="Select donation amount"`.

---

## 7. Color & Contrast

### General Assessment

The Rotaract brand colors should be verified against WCAG contrast requirements:

| Combination | Ratio | Requirement | Status |
|------------|-------|-------------|--------|
| Cranberry (#9B1B30) on White (#fff) | ~5.4:1 | 4.5:1 (AA normal text) | ✅ Pass |
| Cranberry (#9B1B30) on White (#fff) | ~5.4:1 | 3:1 (AA large text) | ✅ Pass |
| Gold (#EBC85B) on White (#fff) | ~1.7:1 | 4.5:1 (AA normal text) | ❌ Fail |
| Gold (#EBC85B) on Near Black (#111827) | ~8.4:1 | 4.5:1 (AA normal text) | ✅ Pass |
| White on Cranberry (#9B1B30) | ~5.4:1 | 4.5:1 (AA normal text) | ✅ Pass |
| Blue (#005dAA) on White (#fff) | ~4.6:1 | 4.5:1 (AA normal text) | ✅ Pass |

**⚠️ Key finding:** Gold (#EBC85B) on white background fails contrast. Gold should only be used on dark backgrounds or as a decorative/non-text element.

**Action:** Audit all uses of gold text/borders on light backgrounds. Use gold-700 or darker for any text on white.

---

## 8. Semantic HTML

### SEM-1: Footer Navigation Landmark 🟢
**File:** `components/public/Footer.tsx`

**Problem:** Footer quick links section isn't wrapped in a `<nav>` landmark.

**Remediation:**
```tsx
<nav aria-label="Footer navigation">
  <ul>
    <li><Link href="/about">About</Link></li>
    ...
  </ul>
</nav>
```

---

### SEM-2: Portal Dashboard Widgets 🟢
**File:** `app/portal/page.tsx`

**Problem:** Dashboard widgets (stats, upcoming events, recent activity) should use `<section>` with labels for screen reader landmark navigation.

---

## 9. ARIA Usage

### ARIA-1: Dropdown Menu Missing Roles 🟡
**File:** `components/public/Navbar.tsx`

**Required ARIA attributes:**
- Trigger: `aria-haspopup="true"`, `aria-expanded="true|false"`
- Menu: `role="menu"`, `aria-label="Submenu"`
- Items: `role="menuitem"`, `tabindex="-1"` (managed focus)

---

### ARIA-2: Portal Sidebar Missing Roles 🟡
**File:** `components/portal/PortalShell.tsx`

**Required ARIA attributes:**
- Sidebar container: `role="navigation"`, `aria-label="Portal navigation"`
- Active item: `aria-current="page"`
- Mobile overlay: `aria-hidden="true"` on content behind sidebar

---

### ARIA-3: Toast Notifications 🟢
**File:** `components/ui/Toast.tsx`

**Ensure:**
- Toast container has `role="alert"` or `aria-live="assertive"`
- Success toasts use `aria-live="polite"`
- Error toasts use `role="alert"` (more urgent)

---

### ARIA-4: Modal Dialogs 🟢
**Files:** All modal components

**Ensure all modals have:**
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to the modal title
- Focus trap active while open

---

## Component-by-Component Findings

### Navbar (`components/public/Navbar.tsx`)
| Issue | Severity | WCAG |
|-------|----------|------|
| Dropdown not keyboard accessible | 🟡 | 2.1.1 |
| No focus trap in mobile menu | 🟡 | 2.1.2 |
| Animations ignore reduced-motion | 🟡 | 2.3.3 |
| Dropdown SVG chevron not hidden | 🟢 | 1.1.1 |

### Footer (`components/public/Footer.tsx`)
| Issue | Severity | WCAG |
|-------|----------|------|
| No `<nav>` around quick links | 🟢 | 1.3.1 |
| Missing `role="contentinfo"` | 🟢 | 1.3.1 |

### PortalShell (`components/portal/PortalShell.tsx`)
| Issue | Severity | WCAG |
|-------|----------|------|
| No focus management on sidebar open | 🟡 | 2.4.3 |
| No `aria-current="page"` | 🟡 | 2.4.8 |
| Sign-out popover no focus trap | 🟡 | 2.1.1 |
| Main content missing `id="main-content"` | 🟢 | 2.4.1 |

### Contact Page (`app/(public)/contact/page.tsx`)
| Issue | Severity | WCAG |
|-------|----------|------|
| Errors via `window.alert()` | 🟡 | 3.3.1 |
| No inline field validation | 🟢 | 3.3.3 |

### Donate Page (`app/(public)/donate/page.tsx`)
| Issue | Severity | WCAG |
|-------|----------|------|
| Preset buttons no `aria-pressed` | 🟡 | 4.1.2 |

---

## Remediation Checklist

### Priority 1 (V1 Blockers)
- [ ] Fix Navbar dropdown keyboard navigation (KBD-1)
- [ ] Add focus trap to mobile menu (KBD-2)
- [ ] Fix PortalShell sidebar focus management (FM-1)
- [ ] Add `aria-hidden="true"` to all decorative SVGs (SR-1)
- [ ] Add `prefers-reduced-motion` support (MOT-1)
- [ ] Fix contact form error handling (FRM-1)

### Priority 2 (Important)
- [ ] Add `aria-current="page"` to portal navigation (SR-2)
- [ ] Fix sign-out popover accessibility (KBD-3)
- [ ] Add `aria-pressed` to donate buttons (FRM-2)
- [ ] Fix gallery image alt text (IMG-1)
- [ ] Add `aria-live` regions for dynamic content (SR-5)
- [ ] Fix modal focus return on close (FM-2)

### Priority 3 (Nice to Have)
- [ ] Add `aria-label` to homepage sections (SR-3)
- [ ] Add `role="contentinfo"` to footer (SR-4)
- [ ] Add `<nav>` to footer links (SEM-1)
- [ ] Verify skip-to-content target in portal (FM-3)
- [ ] Audit gold color contrast usage (Color section)
- [ ] Label portal dashboard widgets (SEM-2)

### Testing Tools
- **axe DevTools** — automated accessibility testing in Chrome
- **WAVE** — visual accessibility checker
- **Lighthouse** — accessibility score (target ≥ 95)
- **NVDA/VoiceOver** — manual screen reader testing
- **Keyboard-only testing** — navigate entire site without mouse

---

*This document should be updated after each remediation pass. Target: WCAG 2.1 AA compliance for all public-facing pages before V1 launch.*
