# Portal Design Language

The member portal is the operating system of a professional service organization.
It should read like **Stripe's dashboard with Notion's warmth** — dense, structured,
quietly confident — not like a consumer social app.

**The one-sentence rule:** *Structure comes from alignment, borders, and type weight —
never from bubbles, blobs, gradients, or floating tiles.*

Influences: **Linear** (density, strict type ladder, hierarchy via surface/border steps),
**Stripe** (professional restraint, tabular figures, hairline borders, flat elevation),
**Notion** (warm neutrals, generous line-height, soft tint chips — it's a club, not a terminal).

## 1. Color

| Role | Light | Dark |
|---|---|---|
| Page canvas | `bg-gray-50` | `bg-gray-950` |
| Surface (cards/tables) | `bg-white` | `bg-gray-900` |
| Hairline border | `border-gray-200` | `border-gray-800` |
| Strong border (inputs, table header rule) | `border-gray-300` | `border-gray-700` |
| Primary text | `text-gray-900` | `text-gray-50` |
| Secondary text | `text-gray-600` | `text-gray-400` |
| Meta text | `text-gray-500` | `text-gray-500` |
| **Accent** | `cranberry-700` | `cranberry-400` |

**Cranberry is scarce** — exactly five uses: primary button, active nav, links/"View all",
focus rings, unread/pending count badges. Never a card background, hero gradient, icon-tile
fill, or decorative blob. **Gold/azure are ceremonial** (awards, Rotary branding), never
day-to-day chrome. Semantic: emerald=success, amber=warning, red=danger — as tinted chips
or text, never large fills.

**Kill list:** gradient heroes, `glass-card`, `blur-3xl` blobs, rainbow icon tiles,
decorative dark-gradient cards.

## 2. Typography

Inter for everything; **Manrope (`font-display`) for the page title only.**

| Token | Classes |
|---|---|
| Page title | `text-2xl font-display font-semibold tracking-tight` |
| Section header | `text-sm font-semibold text-gray-900 dark:text-white` |
| Eyebrow | `text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500` |
| Body | `text-sm text-gray-700 dark:text-gray-300 leading-relaxed` |
| Body strong | `text-sm font-medium text-gray-900 dark:text-white` |
| Meta | `text-xs text-gray-500` |
| Stat | `text-2xl font-semibold tracking-tight tabular-nums` |
| Button/label | `text-sm font-medium` |

- **Maximum weight is `font-semibold`** — no `font-bold`/`font-extrabold` in portal chrome.
- **Every mutable number gets `tabular-nums`.**
- Max two type sizes per component.

## 3. Spacing (4px grid, 8px rhythm)

| Context | Value |
|---|---|
| Card interior | `p-5` (compact lists `p-4`; never `p-6`/`p-8` in portal) |
| Rows in a list | `py-3` + `divide-y` (no per-row margins) |
| Between page sections | `space-y-8` |
| Grid gaps | `gap-4` |
| Main area padding | `px-4 py-6 lg:px-8 lg:py-8` |

Density principle: **inside** a module tight (12–16px), **between** modules generous (32px).

## 4. Radii — kill the bubbles

| Element | Class |
|---|---|
| Checkboxes, tags, table chrome | `rounded` |
| Badges, chips, inputs | `rounded-md` |
| Buttons, nav items, menu items | `rounded-lg` |
| Cards, tables, panels, modals | `rounded-xl` |
| Avatars & count dots ONLY | `rounded-full` |

**`rounded-2xl`/`rounded-3xl` are banned in the portal.** Badges are 6px rectangles, not pills.

## 5. Elevation — borders, not shadows

| Level | Treatment |
|---|---|
| 0 Canvas | `bg-gray-50 dark:bg-gray-950` |
| 1 Surface | `bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800` — **no shadow** |
| 2 Hover | + `hover:border-gray-300 dark:hover:border-gray-700` — **no translate/scale/shadow** |
| 3 Overlay | + `shadow-lg` (dropdowns, popovers, toasts) |
| 4 Modal | + `shadow-xl` + `bg-black/40` scrim |

Nested depth: `divide-y divide-gray-100 dark:divide-gray-800` or an inset well
`bg-gray-50 dark:bg-gray-800/50 rounded-lg` — never border-inside-border.
Icons: single-color `text-gray-500` at `w-4/5 h-4/5`; no colored tiles.

## 6. Tables & lists over card grids

Portal content is **records** (members, events, hours, payments, docs) → rows, not tiles.
- Default for any homogeneous collection >4 items: one Level-1 card containing a
  `divide-y` list; row = `flex items-center gap-3 px-4 py-3`, whole row clickable with
  `hover:bg-gray-50 dark:hover:bg-gray-800/50`.
- True tables (admin/finance): eyebrow-style header row, numeric columns right-aligned
  `tabular-nums`, ~44px rows.
- Cards only for: dashboard modules, rich media (event covers, articles), community feed.
- Never a grid of icon+label mini-cards — that's a list wearing a costume.

## 7. Page anatomy (every portal page)

```tsx
<div className="max-w-5xl mx-auto">
  <header className="pb-6 border-b border-gray-200 dark:border-gray-800">
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Membership</p>
    <div className="mt-1 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-display font-semibold tracking-tight">Directory</h1>
      <div className="flex items-center gap-2">{/* ≤1 primary + ghosts */}</div>
    </div>
    <p className="mt-1 text-sm text-gray-500">39 active members across 8 committees.</p>
  </header>
  <div className="mt-8 space-y-8">{/* sections; each header carries its count */}</div>
</div>
```

One `max-w-5xl` column for ALL pages. One `h1`. Primary action top-right in the title row.

## 8. Dark mode

Canvas `gray-950`, surfaces `gray-900`, borders `gray-800` (hover `gray-700`). Borders carry
depth (shadows are invisible on dark). Accent brightens to `cranberry-400`; active-nav fill
`dark:bg-cranberry-900/25`. Status chips tint-on-transparent. Never pure black, never glass.

## 9. Motion

150ms `transition-colors` on hover; 200ms opacity for overlays.
**Banned:** hover translate/scale, pulsing dots, 300ms+ decorative transitions.

---

# Implementation status / roadmap

Done (2026-07-02):
1. ✅ `ui/Card.tsx` — rounded-xl, no shadow, border-hover only, p-5 default
2. ✅ `ui/Button.tsx` — font-medium, rounded-lg, no shadows, neutral outline variant
3. ✅ `ui/Badge.tsx` — pills → 6px tags, font-medium
4. ✅ `PortalShell` — one `max-w-5xl` column for banners+children, `gray-950` canvas,
   denser nav rows (py-1.5, rounded-lg, no active shadow), standard eyebrows

Next (in impact order):
5. `components/portal/PageHeader.tsx` + `SectionHeader` implementing §7; adopt on
   dashboard, events, directory, dues, service-hours
6. Dashboard: replace gradient hero + glass tiles with PageHeader + bordered
   `divide-x` stat strip; quick-actions rainbow tile grid → dense 2-col link list
   (kill per-item `color` prop); right-rail widgets to `divide-y` list discipline;
   delete the gradient Member Status card
7. Optionally cap `rounded-2xl/3xl` at 12px in tailwind for the portal via a plugin
   (NOT globally — the public site legitimately uses larger radii)
