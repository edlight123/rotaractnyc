# DESIGN.md — Rotaract NYC

> A plain-text design system for AI agents and contributors. Read this before
> building or restyling any page so the UI stays visually consistent with the
> Rotaract NYC brand. Format follows the [Stitch DESIGN.md](https://stitch.withgoogle.com/docs/design-md/overview/)
> spec (see [awesome-design-md](https://github.com/VoltAgent/awesome-design-md)).
>
> Source of truth for tokens: [tailwind.config.js](tailwind.config.js) and
> [app/globals.css](app/globals.css). When this document and the code disagree,
> the code wins — and this file should be updated to match.

---

## 1. Visual Theme & Atmosphere

**Mood:** Civic, warm, and trustworthy — a service organization that feels
modern and well-run, not corporate or sterile. Editorial warmth over flat SaaS.

**Philosophy**
- **Brand-forward but restrained.** Cranberry is the anchor; gold and azure are
  accents used sparingly for emphasis and meaning, never decoration-for-its-own-sake.
- **Calm density.** Generous whitespace, soft rounded surfaces, gentle motion.
  Content breathes; nothing is cramped.
- **Card-based surfaces.** Information lives in rounded cards on a light gray
  canvas (light) or near-black canvas (dark).
- **Quietly polished.** Subtle shadows, 1px hairline borders, micro-interactions
  on hover. Depth is suggested, never heavy.
- **Photography is human.** People and events are shown warmly and in color.

**Density:** Comfortable. Default to roomy padding; offer compact/table modes for
data-heavy admin contexts only.

---

## 2. Color Palette & Roles

### Brand
| Token | Hex | Role |
|---|---|---|
| `cranberry` (DEFAULT / 700) | `#9B1B30` | Primary brand. Headings accent, primary buttons, active nav, links. |
| `cranberry-50` | `#fef2f3` | Tinted backgrounds (active nav pill, hover wash). |
| `cranberry-100` | `#fde6e8` | Badge bg, soft fills. |
| `cranberry-600` | `#d12d4a` | Gradient partner, hover-bright text. |
| `cranberry-800` | `#8b1a2d` | Primary button hover. |
| `cranberry-900/950` | `#771a2c` / `#3d0a14` | Dark headers, gradient base. |
| `gold` (DEFAULT / 400) | `#EBC85B` | Secondary accent. Member/highlight badges, gold CTA, "premium" emphasis. |
| `gold-500` | `#e0b235` | Gold button hover. |
| `azure` (DEFAULT / 900) | `#005dAA` | Tertiary accent. Service events, info, interests, board markers. |

### Semantic (status)
| Token | Light | Role |
|---|---|---|
| Success | `emerald-*` | Paid, going, active, confirmed. (`badge-green`) |
| Warning | `amber-*` / `gold-*` | Pending, maybe, low-stock. (`badge-amber` / `badge-gold`) |
| Danger | `red-*` | Unpaid, cancelled, destructive actions. (`badge-red`, `Button variant="danger"`) |
| Info | `blue-*` / `azure-*` | Neutral informational. (`badge-blue` / `badge-azure`) |

### Neutrals & surfaces
| Context | Light | Dark |
|---|---|---|
| App canvas (public) | `white` | `#0f0f12` |
| App canvas (portal) | `gray-50/50` | `#0c0c0f` |
| Card surface | `white` | `gray-900` |
| Hairline border | `gray-200/60` | `gray-800` |
| Primary text | `gray-900` | `white` / `gray-100` |
| Secondary text | `gray-500` / `gray-600` | `gray-400` |
| Muted / meta | `gray-400` | `gray-500` |

**Rules**
- Exactly **one** primary action color per view (cranberry, or gold for a
  deliberately special CTA). Don't stack multiple saturated buttons side by side.
- Use semantic colors **only** for their meaning. Gold ≠ generic highlight when
  it would be read as "pending."
- Every colored surface needs an explicit `dark:` counterpart. Never ship a
  light-only color.

---

## 3. Typography Rules

**Families** (see `fontFamily` in [tailwind.config.js](tailwind.config.js))
- **Display / headings:** `Manrope` → utility `font-display`. Used on all
  `h1–h6` (globals sets `font-display font-bold tracking-tight` on headings).
- **Body / UI:** `Inter` → utility `font-sans` (default).

**Hierarchy**
| Role | Classes | Notes |
|---|---|---|
| Page title (H1) | `text-2xl font-display font-bold tracking-tight` | **Standardize on this** across the portal (see §note). |
| Section title (H3) | `font-display font-bold text-gray-900 dark:text-white` | Card/section heads. |
| Card title | `font-display font-semibold` | People/event cards. |
| Body | `text-sm` / `text-base` `leading-relaxed` | Default reading size. |
| Meta / label | `text-xs` `text-gray-500` | Timestamps, captions. |
| Eyebrow | `text-[10px]/[11px] font-bold uppercase tracking-[0.12em] text-gray-400` | Nav section headers, overlines. |

**Notes**
- Headings always use `font-display`; never set a heading in Inter.
- ⚠️ **Known inconsistency to fix:** page H1s currently vary — Directory uses
  `text-3xl font-extrabold text-cranberry`, Events uses `text-2xl font-bold text-gray-900`.
  The redesign standardizes one `PageHeader` (see [docs/PORTAL_REDESIGN.md](docs/PORTAL_REDESIGN.md)).
- Body font-size on touch devices is forced to ≥16px to prevent iOS zoom
  (globals `@media (pointer: coarse)`). Don't override below 16px on inputs.

---

## 4. Component Stylings

### Buttons (`components/ui/Button.tsx`, `.btn-*` in globals)
- Shape: `rounded-xl`, `font-semibold`, `gap-2`, `transition-all`.
- Focus: `focus-visible:ring-2 ring-offset-2` (always keep — accessibility).
- Sizes: `sm` = `px-4 py-2 text-sm`, `md` = `px-6 py-2.5 text-sm`, `lg` = `px-8 py-3 text-base`.
- Variants: `primary` (cranberry/white), `secondary` (gray), `gold` (gold/ink, bold),
  `azure`, `outline` (cranberry border), `ghost`, `danger` (red).
- Built-in `loading` spinner; disabled → `opacity-50 pointer-events-none`.
- Min touch target 44px on interactive controls.

### Cards (`components/ui/Card.tsx`, `.card` / `.card-interactive`)
- Base: `bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm`.
- Interactive: add `hover:shadow-md hover:border-cranberry-200 hover:-translate-y-0.5 transition-all duration-200` (dark: `hover:border-cranberry-800`).
- Padding scale: `none` / `sm`=`p-4` / `md`=`p-6` / `lg`=`p-8`.

### Badges (`components/ui/Badge.tsx`, `.badge-*`)
- `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold`.
- Variants: `cranberry`, `gold`, `azure`, `green`, `gray`, `red` (each with dark mode).

### Inputs (`.input`, `components/ui/Input.tsx`, `Select`, `Textarea`)
- `rounded-xl border border-gray-300 px-4 py-2.5 text-sm`.
- Focus: `ring-2 ring-cranberry-500/20 border-cranberry-500`.
- Error: `.input-error` (red ring/border).
- Custom chevron for `<select>`; native date/time pickers hidden in favor of custom buttons.

### Navigation (`components/portal/PortalShell.tsx`)
- Desktop: fixed left sidebar `w-[272px]`, white/`gray-900`, grouped sections with
  uppercase eyebrow labels. Active item = `bg-cranberry-50 text-cranberry-700` pill (dark: `cranberry-900/20`).
- Mobile: iOS/Android-style fixed bottom tab bar (`MobileBottomNav`) + "More" opens the sidebar drawer.
- Content offsets by `lg:ml-[272px]`; main padding `p-4 lg:p-8`, `pb-bottom-nav` clears the mobile tab bar.

### Tabs / Filters
- Use `components/ui/Tabs.tsx` for primary segmentation.
- Filter chips: `rounded-full text-xs font-medium`; selected = `bg-cranberry text-white shadow-sm`, idle = `bg-gray-100 dark:bg-gray-800`.

### Empty / Loading
- Empty: `components/ui/EmptyState.tsx` (icon + title + description).
- Loading: prefer **skeletons** that mirror final layout (see Events list). Reserve the centered `Spinner` for full-page/auth gates only.

### Modals (`components/ui/Modal.tsx`)
- Centered dialog, `rounded-2xl`, backdrop blur, `animate-scale-in`. Must render
  outside any `page-enter`/transformed container (transform traps `position: fixed`).

---

## 5. Layout Principles

**Spacing scale:** Tailwind 4px base. Common rhythms: card padding `p-6`,
section gaps `space-y-6` (detail) / `space-y-8` (index), inline gaps `gap-2/3/4`.

**Content widths**
- Public marketing: `container-page` = `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- Portal pages: **standardize on `max-w-5xl mx-auto`** for index/detail content
  (matches the shell's banner column). Wide data tables/dashboards may use `max-w-7xl`.
  ⚠️ Today Directory uses `max-w-7xl` and detail uses `max-w-3xl` — unify per the redesign.

**Grid**
- People/cards: `grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`.
- Two-up detail panels: `grid sm:grid-cols-2 gap-6`.

**Whitespace philosophy:** Let cards float on the canvas with clear gutters.
Don't fill every pixel; padding communicates calm and quality.

**Vertical address:** `--nav-height: 72px`, sidebar `272px`. Respect iOS safe
areas via `.pb-safe`, `.pb-bottom-nav`, `.bottom-above-nav`.

---

## 6. Depth & Elevation

A restrained, mostly-flat system. Elevation rises only with interactivity.

| Level | Use | Token |
|---|---|---|
| 0 | Page canvas | `gray-50/50` (light) / `#0c0c0f` (dark) — no shadow |
| 1 | Resting card | `shadow-sm` + `border-gray-200/60` |
| 2 | Hover card | `shadow-md` (or `shadow-lg` for feature cards) + `-translate-y-0.5` |
| 3 | Popover/dropdown | `shadow-xl` + border |
| 4 | Modal | backdrop blur + `shadow-xl`, `rounded-2xl` |

- Hairline borders do the structural work; shadows add lift on interaction.
- Optional brand glow on feature cards: `hover:shadow-cranberry-900/5`.
- Glass surfaces (`.glass`, `.glass-card`) for overlays on photography only.

---

## 7. Do's and Don'ts

**Do**
- ✅ Reuse `components/ui/*` primitives (Button, Card, Badge, Tabs, Input, EmptyState).
- ✅ Keep one `PageHeader` pattern across every portal page.
- ✅ Ship light **and** dark styles together for every element.
- ✅ Use `rounded-xl` (controls) and `rounded-2xl` (cards) consistently.
- ✅ Animate entrances with `page-enter` / `stagger-children`; keep motion subtle (≤0.35s).
- ✅ Use a single SVG icon set (lucide-react) at a consistent stroke/size.
- ✅ Use skeletons that match the final layout for content loads.

**Don't**
- ❌ Use emoji as functional UI icons (`✓ ? ✕ 🔁 🎉`). Use the icon set instead.
- ❌ Mix inline hand-drawn `<svg>` paths with lucide on the same surface.
- ❌ Invent new colors/radii/shadows outside the tokens here.
- ❌ Stack multiple saturated primary buttons in one row.
- ❌ Nest interactive elements (links/buttons) inside a `role="button"` card and
  patch it with `stopPropagation`. Use one anchor + sibling actions.
- ❌ Use a bare centered spinner where a skeleton would prevent layout shift.
- ❌ Hardcode grays that skip dark mode.

---

## 8. Responsive Behavior

**Breakpoints** (`tailwind.config.js`): `xs:400 sm:640 md:768 lg:1024 xl:1280 2xl:1536`.

- **Sidebar** is desktop-only (`lg:`). Below `lg`, navigation collapses to the
  bottom tab bar + drawer.
- **Touch targets** ≥ 44×44px; inputs ≥ 16px font on coarse pointers (anti-zoom).
- **Collapsing strategy:** tables hide non-essential columns progressively
  (`hidden sm:table-cell` → `md:` → `lg:`). On the smallest screens, prefer a
  card/list layout over a horizontally scrolling table.
- **Cards** reflow 1 → 2 → 3 → 4 columns across `sm/lg/xl`.
- **Safe areas / PWA:** honor notch insets; `.hide-in-standalone` removes
  browser-only chrome when installed.
- Respect `prefers-reduced-motion`; keep transitions short and optional.

---

## 9. Agent Prompt Guide

**Quick color reference**
```
cranberry #9B1B30  (primary)      gold #EBC85B (accent/highlight)
azure     #005dAA  (info/service) emerald = success  amber/gold = warning  red = danger
canvas light gray-50/50 · dark #0c0c0f   card white / gray-900   border gray-200/60 · gray-800
```

**Ready-to-use prompts**
- "Build this page using DESIGN.md: cranberry primary, Manrope headings via
  `font-display`, Inter body. Use `components/ui` Button/Card/Badge/Tabs. Wrap
  content in `max-w-5xl mx-auto space-y-8 page-enter`. Standard `PageHeader`
  (title + subtitle + optional action). Ship light + dark. lucide-react icons only."
- "Restyle to feel mature & consistent: replace emoji icons with lucide, unify
  the H1 to `text-2xl font-display font-bold`, use skeletons not spinners, cards
  `rounded-2xl border-gray-200/60 shadow-sm` with `hover:-translate-y-0.5`."
- "Cards: one anchor wrapping the whole card; secondary actions are sibling
  buttons in a footer row — no nested-button `stopPropagation` hacks."

**Component cheat-sheet**
- Primary CTA → `<Button>` (cranberry). Special CTA → `<Button variant="gold">`.
- Status → `<Badge variant="green|gold|red|azure|gray">`.
- Surfaces → `<Card interactive padding="md">`.
- Segmentation → `<Tabs>`. Quick filters → rounded-full chip row.
- Inputs → `<Input>` / `<Select>` / `<Textarea>` (cranberry focus ring).
