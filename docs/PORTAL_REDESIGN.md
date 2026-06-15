# Portal Redesign Proposal

> **Status: proposal / not implemented.** This document is a review artifact.
> It defines a portal-wide redesign that keeps the colors and brand you already
> like, while fixing maturity and consistency gaps. Implementation happens only
> after sign-off, page by page.
>
> Companion: [DESIGN.md](../DESIGN.md) (the design contract). This file describes
> _what changes_ and _why_; DESIGN.md defines _the rules_ each change follows.

---

## 1. Goals & non-goals

**Goals**
- Make every portal page feel like one mature, coherent product.
- Fix the specific pain points: **Member Directory** flow, **Events** + event
  subpages feeling unpolished.
- Establish shared building blocks so future pages are consistent by default.

**Non-goals (explicitly preserving what you like)**
- ❌ No palette change. Cranberry / gold / azure stay.
- ❌ No font change. Manrope display + Inter body stay.
- ❌ No re-architecture of data/hooks/APIs. This is a UI/UX layer redesign.
- ❌ No public marketing-site redesign in this pass (portal only).

---

## 2. Root causes (why it feels "not mature")

Audited across [PortalShell.tsx](../components/portal/PortalShell.tsx),
[directory/page.tsx](../app/portal/directory/page.tsx),
[events/page.tsx](../app/portal/events/page.tsx),
[committees/page.tsx](../app/portal/committees/page.tsx),
[dues/page.tsx](../app/portal/dues/page.tsx):

| # | Inconsistency | Evidence |
|---|---|---|
| 1 | **Page headers differ** in size/weight/color | Directory H1 `text-3xl font-extrabold text-cranberry`; Events H1 `text-2xl font-bold text-gray-900`. |
| 2 | **Content widths differ** | Directory `max-w-7xl`; Events `max-w-5xl`; Member detail `max-w-3xl`. |
| 3 | **Two icon systems** | Committees uses `lucide-react`; Events/Directory/Shell hand-roll inline `<svg>` paths. |
| 4 | **Emoji as UI** | Events RSVP uses `✓ ? ✕ 🔁 🎉` as functional indicators. |
| 5 | **Loading patterns differ** | Events = skeletons; Directory & detail = centered spinner (layout shift). |
| 6 | **Bespoke chips vs shared components** | Events filter chips are hand-built; Directory uses `Tabs`; no shared FilterBar. |
| 7 | **Section spacing varies** | `space-y-6` vs `space-y-8` with no rule. |
| 8 | **Accessibility smells** | Cards are `role="button"` containing links/buttons patched with `stopPropagation`. |
| 9 | **Admin + member views entangled** | Directory "pending approval" is a separate layout inside the member-facing view. |

None of these are about color — they're about **consistency, hierarchy, and
interaction maturity**. That's exactly what a shared layer fixes.

---

## 3. Foundation: shared building blocks (Phase 0)

Build these first; every page adopts them. New files under `components/portal/`.

### 3.1 `<PageHeader>`
One header to rule them all.
- Props: `title`, `subtitle?`, `actions?` (right-aligned buttons), `breadcrumbs?`, `backHref?`.
- Style: `h1` = `text-2xl font-display font-bold text-gray-900 dark:text-white`,
  subtitle `text-gray-500 dark:text-gray-400 mt-1`. Replaces every ad-hoc header.

### 3.2 `<PageContainer>`
- Wraps content in `max-w-5xl mx-auto space-y-8 page-enter` (wide variant
  `max-w-7xl` for dashboards/finance tables). Kills width drift.

### 3.3 `<FilterBar>` + `<FilterChip>` + `<SortMenu>`
- Standard toolbar: search + segment tabs + dropdown filters + chips + view toggle.
- Shared by Directory, Events, Documents, Gallery, Finance, Forms.

### 3.4 Icon system
- Standardize on **lucide-react** (already a dependency). Create a tiny
  `components/ui/Icon` re-export map so usage is uniform. Phase out inline SVG
  paths and **all** emoji icons.

### 3.5 Skeletons
- Extend [Skeleton.tsx](../components/ui/Skeleton.tsx) with `CardGridSkeleton`,
  `ListSkeleton`, `DetailSkeleton`, `TableSkeleton`. Replace centered spinners on
  content loads (keep spinner only for auth/full-page gates).

### 3.6 `<StatTile>` / refine `StatCard`
- One compact metric tile (label, value, icon, optional trend) for dashboard,
  dues, analytics, finance — so numbers look the same everywhere.

### 3.7 `<DataView>` (view-mode switch)
- Encapsulates Grid / List / Table / **Calendar** toggle + empty + skeleton +
  result count, so every collection page behaves identically. (Calendar mode is
  opt-in per page — used by Events; Directory uses Grid/List/Table.)

---

## 4. Page-by-page redesign

### 4.1 Member Directory — _primary pain point_
File: [app/portal/directory/page.tsx](../app/portal/directory/page.tsx),
[MemberCard.tsx](../components/portal/MemberCard.tsx)

**Problems:** shallow filtering (no committee/role/interest filters, no sort),
cold grayscale photo cards, only grid/table, spinner load, admin "pending" layout
mixed in, nested-button a11y hack.

**Redesign**
- **FilterBar:** search (`/` shortcut) · status tabs (Active / Alumni / All) ·
  **Committee** dropdown · **Role** dropdown · **Sort** (Name A–Z, Recently
  joined, Committee). Active filters → removable chips + "Clear all".
- **Three views via `<DataView>`** — **Grid is the default**:
  - **Grid (default, refined):** photos **in color** (drop default grayscale),
    shorter hero, consistent badge row (role + committee chip), one anchor +
    sibling action buttons (fixes a11y).
  - **List:** dense avatar · name · role · committee · quick actions — best for
    scanning 100+ members.
  - **Table:** retained, surfaced primarily for board/admin.
- **Loading:** `CardGridSkeleton` (no spinner jump).
- **Result chips:** e.g. "Community Service · 12 members".
- **Pending approvals (admin-only, decided):** _not_ inlined into the member
  grid. Instead, when there are pending members, an admin sees a **pinned
  "Pending Approvals" banner card at the top of the Directory** — count + avatars
  + inline Approve/Reject — plus a **count badge on the Directory nav item** (and
  Dashboard) reusing the [useUnreadCounts](../hooks/useUnreadCounts.ts) pattern.
  Regular members never see pending people. The **Pending tab** remains for full
  triage. This keeps it impossible-to-miss for admins while the main grid stays
  clean for everyone.
- **Detail page** ([directory/[id]](../app/portal/directory/%5Bid%5D/page.tsx)):
  group the flat `<dl>` into Notion-style property sections (Contact /
  Professional / Membership) with lucide icons; add **prev/next member** nav and a
  "More from {committee}" row to drive connection.

### 4.2 Events list — _"doesn't feel like a mature website"_
File: [app/portal/events/page.tsx](../app/portal/events/page.tsx)

**Problems:** emoji status pills, very dense RSVP button logic, bespoke chips,
type filter visually disconnected from tabs, gradient placeholders feel templated.

**Redesign**
- Replace emoji with lucide (`Check`, `HelpCircle`, `X`, `Repeat`, calendar/pin/clock).
- Adopt **FilterBar**: Upcoming/Past tabs + type chips unified into one toolbar.
- **EventCard** component (extract from inline JSX): date block, image/gradient,
  title + meaning-coded type badge, meta row (time/location/spots), and a tidy
  **action area** with a single clear primary action + secondary "Maybe".
  Encapsulate the paid/free/locked logic inside the card so the list reads cleanly.
- **RSVP affordance:** clearer states — `Going` (filled), `Maybe` (subtle),
  `Buy Ticket · $X` (gold). Lock/refund cases get a quiet "Manage" link, not a
  re-purposed button.
- **Loading:** keep skeletons (already good) but move them into `ListSkeleton`.
- **Calendar/month view (decided — include):** a third view via `<DataView>`
  showing events on a month grid with date cells, type-colored event pills, and
  click-through to detail. Tabs: List · Calendar (Upcoming/Past still filter the
  list view). Reuses the same FilterBar + type chips.

### 4.3 Event detail + subpages
Files: [events/[id]](../app/portal/events/) and ticket/checkout/cancel flows
(e.g. [cancel-ticket route](../app/api/portal/events/%5Bid%5D/cancel-ticket/route.ts)).

**Redesign**
- **Hero:** full-width image/gradient banner with overlaid title, date, type
  badge, and a sticky **action bar** (RSVP / Buy / Manage ticket) that docks on
  scroll (desktop sidebar, mobile bottom bar above the tab nav using `.bottom-above-nav`).
- **Body sections (cards):** About · Details (date/time/location with map link) ·
  Pricing/Tiers · Attendees (avatars + count) · Your Ticket (QR, status, manage).
- **Checkout/cancel:** route through the standard `Modal` + clear status badges
  and confirmation states; consistent success/empty screens.
- Add **prev/next event** and "back to events" via the shared header.

### 4.4 Dashboard
File: [app/portal/page.tsx](../app/portal/page.tsx)
- Rebuild the metric row on `<StatTile>`; standardize feed/widget cards; ensure
  the member spotlight + quick links use the same card + hover rules.

### 4.5 Dues & Billing
File: [app/portal/dues/page.tsx](../app/portal/dues/page.tsx)
- Member view: a clear **status hero** (Paid/Unpaid/Waived badge, amount, due
  date, single Pay CTA) + payment-method cards + history table (`TableSkeleton`).
- Treasurer view: `<DataView>` table + `<StatTile>` summary (collected / paid /
  unpaid / waived). Unify with FilterBar (status filter).

### 4.6 Committees
File: [app/portal/committees/page.tsx](../app/portal/committees/page.tsx)
- Already uses lucide (good reference). Align card to `card-interactive`, adopt
  PageHeader/Container, and the shared grid. Standardize join/leave button states.

### 4.7 Remaining pages (apply the system)
Directory of work, lighter touch each: Messages, Announcements, Gallery, Service
Hours (+ Analytics), Profile, Settings, Documents, Articles, Finance, Board,
Forms, Admin/*. Each: swap to PageHeader + PageContainer, lucide icons, shared
skeletons, consistent cards/badges. No bespoke headers or emoji.

---

## 5. Rollout plan (phased, low-risk)

| Phase | Scope | Outcome |
|---|---|---|
| **0** | Foundation (§3): PageHeader, PageContainer, FilterBar, DataView, icon map, skeletons, StatTile | Shared layer; no visual regressions yet |
| **1** | **Member Directory** (list + card + detail) | Fixes the #1 pain point; proves the system |
| **2** | **Events** list + **event detail/checkout** | Fixes the "immature" feeling on the busiest flow |
| **3** | Dashboard + Dues | Numbers/metrics consistent |
| **4** | Committees, Profile, Service Hours, Gallery, Messages, Announcements | Breadth |
| **5** | Finance, Board, Forms, Documents, Articles, Admin/* | Admin surfaces |
| **6** | A11y + polish pass (focus, reduced-motion, contrast), QA in light/dark | Mature finish |

Each phase ships independently and is verifiable against [DESIGN.md](../DESIGN.md).

---

## 6. Acceptance checklist (per page)

- [ ] Uses `<PageHeader>` (one H1 style) + `<PageContainer>` width.
- [ ] lucide-react icons only; **zero** emoji UI icons; no stray inline SVG.
- [ ] Cards/badges/buttons use `components/ui` primitives + tokens.
- [ ] Skeleton (not spinner) for content loads; matches final layout.
- [ ] Light **and** dark verified; focus rings intact; touch targets ≥44px.
- [ ] No nested interactive elements / `stopPropagation` hacks.
- [ ] Collection pages use `<DataView>` (grid/list/table) + FilterBar + result count.

---

## 7. Decisions (locked 2026-06-15)

1. **Directory default view → Grid.** List and Table remain as alternate views.
2. **Pending approvals → admin-only pinned banner** at the top of the Directory
   (count + inline Approve/Reject) **+ a nav/Dashboard count badge**. Not inlined
   into the member grid; Pending tab kept for triage. (See §4.1.)
3. **Events → include a Calendar/month view** as a third view alongside List.
   (See §4.2/§3.7.)
4. **Scope → portal only** this pass. Public marketing site is a later pass.
5. **Icons → standardize on lucide-react. No emoji UI icons anywhere.** This is a
   hard rule (also in [DESIGN.md](../DESIGN.md) §7).

> Next step on approval: implement **Phase 0 (foundation) + Phase 1 (Directory)**
> first, so you can see the new system on your biggest pain point before we roll
> it across Events and the rest of the portal.
