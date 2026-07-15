# Populate the public site: events, news, newsletter — Design

**Date:** 2026-07-14
**Branch:** `feature/events-news-newsletter`

## Background

rotaractnyc.org is fully built and **data-driven from Firestore**. The public homepage
and section pages render events, news, photos, testimonials, and impact stats live from
collections, and each section hides itself when its collection is empty. The "placeholders"
the club sees are simply empty collections. Confirmed live state (2026-07-14):

| Collection | Count | Effect |
|---|---|---|
| `events` | 1 (Gala, June 2026, past) | No upcoming events → homepage "Upcoming Events" empty |
| `articles` | 0 | News section empty |
| `albums` | 0 | No photo albums (even the gala photos aren't grouped) |
| `gallery` | 360 | Gala photos already imported |
| `newsletter_subscribers` | 0 | No signup exists in the UI at all |
| `testimonials` | 0 | Homepage testimonial section empty |

## Goals

1. **Newsletter signup** — the one genuine code gap. No form or API exists today.
2. **Food pantry / Neighborhood Supper** — a recurring (3rd-Saturday) service event with
   native on-site registration.
3. **LinkedIn post → News article** — the 30th-anniversary Gala recap (supports Elimisha
   Kakuma), with a cover image chosen from the existing gala gallery.
4. **Past socials** — add real past events that have photos in the club Google Drive,
   grouped into `albums`.

## Non-goals

- No new recurrence engine. The portal already supports recurrence; the food pantry is
  seeded with correct 3rd-Saturday dates directly.
- No external ESP for the newsletter (Firestore + Resend confirmation only).
- No redesign of existing pages.

## Design

### 1. Newsletter signup (code)

Mirrors the existing `app/api/membership-interest/route.ts` pattern
(`rateLimit` → `isValidEmail` → `sendEmail` + `lib/email/templates.ts`).

- **`POST /api/newsletter/subscribe`** — body `{ email, name?, source? }`.
  Rate-limited (3/60s/IP). Validates email. Idempotent: if a `confirmed` subscriber
  already exists, returns success without resending; otherwise upserts a
  `newsletter_subscribers/{emailKey}` doc `{ email, name?, source, confirmed:false,
  token, createdAt }` and sends a double-opt-in confirmation email.
- **`GET /api/newsletter/confirm?token=…`** — looks up the token, sets `confirmed:true`,
  clears the token, redirects to `/?subscribed=1` (friendly thank-you state).
- **`lib/email/templates.ts`** — add `newsletterConfirmEmail({ confirmUrl })` in the
  existing table-based, brand-coloured style.
- **`components/public/NewsletterSignup.tsx`** — client component (email input + submit,
  inline success/error). Reused in the **Footer** so it appears site-wide.
- Subscribers are written/read only via the Admin SDK; no Firestore client rules needed
  (default deny stays).
- Collection key: email lowercased, `@`/`.` → `_`, to make subscribe idempotent.

### 2. Food pantry / Neighborhood Supper (seed)

Seed script `scripts/seed-food-pantry.ts` creates a recurring **service** event:

- Title: **"Neighborhood Supper — Community Meal Service"**
- Location: The Church of the Holy Trinity; Address: 316 East 88th Street, New York, NY 10128
- Recurs the **3rd Saturday monthly**, 3:30–6:30 PM, starting **2026-07-18**; script
  computes the next ~12 third-Saturday dates and writes one published, public event per
  occurrence (parent + `recurrenceParentId` children), `type:'service'`, `isPublic:true`,
  `status:'published'`, `capacity` ~20 volunteers.
- Registration = the site's existing native guest RSVP on the event page (chosen by club).

### 3. Gala news article (seed)

Seed script `scripts/seed-linkedin-post.ts` creates one published `Article`:

- Title/body adapted from the LinkedIn post (30 years; Elimisha Kakuma; ~50 students,
  ~30 universities, $20M+ scholarships).
- `category:'Impact'`, `isPublished:true`, `publishedAt` set, cover image = a strong
  landscape photo pulled from the existing `gallery` gala photos.

### 4. Past socials with photos (seed)

Drive folders with real Rotaract social photos identified (e.g. Bollywood Summer 2019,
Rooftop Social, Yoga at Jen's, UpGlo Volunteer Jan 2020, Wine Event, 2025 Gala).
Script `scripts/seed-past-events.ts`:

1. For each chosen social: create a past `events` doc + an `albums` doc.
2. Download photos from Drive → upload to Firebase Storage → create `gallery` docs linked
   to the album (`albumId`, `isPreview` for the first several).
3. Also group the existing 360 gala photos under a Gala `albums` doc.

## Sequencing

- **Phase 1 (core, kills the biggest placeholders):** newsletter feature + food pantry
  event + gala news article. Verify build + live render.
- **Phase 2:** past socials + photo albums (heavier: Drive→Storage photo pipeline).

## Safety / verification

- All work on `feature/events-news-newsletter`.
- Seeds are idempotent (deterministic doc IDs / slug checks) so re-runs don't duplicate.
- Firestore writes target production (the only DB); event/article data is reviewed before
  publish, and scripts print what they will write.
- Verify: `npm run build` / typecheck, and confirm the homepage renders the new
  Upcoming Events + News sections.
