# Gallery Admin - Visual Design Guide

## Design System

### Color Palette

```css
Primary: #0085c7 (Rotary Blue)
Primary Dark: #006da3
Secondary: #f4f4f5 (Light Gray)
Background Light: #ffffff
Background Dark: #18181b (Zinc 900)
Surface Light: #ffffff
Surface Dark: #27272a (Zinc 800)
Danger: #ef4444
```

### Typography

- **Font Family**: Manrope, sans-serif
- **Display Headings**: Bold (700-900)
- **Body Text**: Regular (400-500)
- **UI Elements**: Medium (500-600)

## Component Patterns

### 1. Upload Hero Section

Large, inviting drag-and-drop area with:
- Centered cloud upload icon (32px)
- Bold title: "Upload Photos"
- Descriptive subtitle
- "Browse Files" button
- Hover effects: scale icon, border color change

```
┌─────────────────────────────────────┐
│          [☁️ Upload Icon]          │
│                                     │
│         Upload Photos               │
│   Click to add high-resolution     │
│        images to your gallery       │
│                                     │
│       [Browse Files Button]         │
└─────────────────────────────────────┘
```

### 2. Toolbar (Sticky)

Multi-function toolbar with:
- Search bar (left)
- View mode toggle (3 buttons)
- Select all button
- Seed data button

```
┌─────────────────────────────────────┐
│ [🔍 Search...] [Grid][Album][List] │
│                     [Select All][Seed]│
└─────────────────────────────────────┘
```

### 3. Masonry Grid Cards

Each card features:
- Full-width responsive image
- Gradient overlay on hover
- Checkbox (top-left)
- Action buttons (bottom-right)
- Title and alt text (bottom)

```
┌───────────────┐
│   [Image]     │
│               │
│  ☐            │
│               │
│        [✏️][🗑️]│
│ Title         │
└───────────────┘
```

### 4. Album Cards

Clean card design with:
- Fixed height image (192px)
- Title and metadata
- Edit/delete icons
- Hover: slight lift + shadow

```
┌───────────────┐
│    [Image]    │
│               │
├───────────────┤
│ Title    [✏️][🗑️]│
│ 📷 Description│
└───────────────┘
```

### 5. List/Table View

Compact table with columns:
- Checkbox | Preview | Title | Order | Actions

```
┌───┬─────┬──────────────┬─────┬────────┐
│ ☐ │ 📷  │ Title        │ #1  │ ✏️ 🗑️  │
├───┼─────┼──────────────┼─────┼────────┤
│ ☐ │ 📷  │ Another      │ #2  │ ✏️ 🗑️  │
└───┴─────┴──────────────┴─────┴────────┘
```

### 6. Floating Action Bar

Appears when items are selected:
- Dark background (slate-900)
- Rounded pill shape
- Action buttons
- Close button

```
    ┌──────────────────────────────┐
    │ 5 Selected | ⬇️ Download | 🗑️ Delete [✕]│
    └──────────────────────────────┘
```

## Interaction States

### Hover States

1. **Upload Area**: Border changes to primary blue, background lightens
2. **Grid Cards**: Overlay fades in, image slightly zooms
3. **Album Cards**: Lifts up (-2px), shadow increases
4. **List Rows**: Background changes to slate-50
5. **Buttons**: Background darkens, slight scale

### Active States

1. **Selected Images**: Blue ring (2px) around card
2. **Active View Mode**: Blue background on button
3. **Focused Input**: Blue ring (2px), border color change

### Loading States

1. **Initial Load**: Centered spinner (border-b-2 primary)
2. **Saving**: Inline spinner in button
3. **Uploading**: Progress indicator in button

## Responsive Breakpoints

### Masonry Grid Columns
- Mobile (< 640px): 1 column
- Tablet (640px - 1024px): 2 columns
- Desktop (1024px - 1280px): 3 columns
- Large Desktop (≥ 1280px): 4 columns

### Layout Adjustments
- **< 768px**: Stack toolbar vertically, hide some labels
- **< 1024px**: Reduce padding, adjust card sizes
- **≥ 1280px**: Max width container (1440px)

## Animation Timing

- **Hover Transitions**: 200-300ms ease-out
- **Card Lifts**: 300ms ease-out
- **Overlay Fades**: 200ms ease
- **Slide In**: 300ms ease-out
- **Button States**: 150ms ease

## Accessibility Features

### ARIA Labels
- All buttons have descriptive labels
- Images have alt text
- Form inputs have proper labels

### Keyboard Navigation
- Tab order follows visual flow
- Focus indicators on all interactive elements
- Escape key closes modals/selections

### Screen Reader Support
- Semantic HTML structure
- Status announcements for bulk actions
- Form validation messages

## Dark Mode

### Color Adjustments
- Background: slate-900 (#18181b)
- Surface: slate-800 (#27272a)
- Text: white / slate-100
- Borders: slate-700/800
- Inputs: slate-800 background

### Visual Hierarchy
- Maintain contrast ratios (WCAG AA)
- Adjust shadow opacity
- Use border highlights instead of shadows

## Material Symbols

Icons used throughout:
- `cloud_upload` - Upload
- `grid_view` - Masonry
- `photo_album` - Albums
- `list` - List view
- `check_box` - Selected
- `edit` - Edit action
- `delete` - Delete action
- `search` - Search
- `filter_list` - Filter
- `chevron_right` - Breadcrumb

### Icon Sizing
- Small: 16-18px (badges, inline)
- Medium: 20-24px (buttons, UI)
- Large: 32-48px (hero sections)

## Best Practices

### Image Upload
- Recommend 1920px max width
- Accept: jpg, png, gif, webp
- Show file size in UI
- Compress before upload

### Performance
- Lazy load images
- Virtualize long lists
- Debounce search input
- Memoize filtered results

### UX Guidelines
- Provide clear feedback for all actions
- Show loading states
- Confirm destructive actions
- Auto-save where possible

---

This design guide ensures consistency across the gallery management interface and provides clear patterns for future enhancements.
