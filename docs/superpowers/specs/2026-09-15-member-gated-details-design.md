# Member-gated event details — Design

**Date:** 2026-09-15
**Branch:** `feature/member-gated-details`
**Builds on:** `2026-09-15-partner-events-and-audience-design.md`

## Background

Events are listed publicly, and everything about them is public. That throws
away the only lever the club has for making membership feel worth something:
there is nothing a member can see that a stranger cannot.

Two details are worth gating, and they gate differently.

**The venue.** For a volunteering event, hiding it is self-defeating — the
goal is maximum turnout and the work is a public good. For a social, the
venue *is* the draw, and "sign in to see where we're meeting" is a real
reason to join.

**The member price.** Paid events already carry both a member and a guest
price, and both are currently printed in public. Showing the guest price
while gating the member price turns the discount from a footnote into a
reason to sign up.

### Current state, confirmed 2026-09-15

- `app/(public)/events/[slug]/page.tsx` renders both Member Price and Guest
  Price for every paid or hybrid event, and every tier's member price.
- `components/public/EventsFilter.tsx` prints both prices on the card, plus
  `event.location?.split(',')[0]`.
- The Event JSON-LD sets `offers.price` from **`memberPrice`** — so search
  engines are already publishing the member rate as the public price. This is
  wrong today, independently of this change.
- `hasMemberDiscount()` already drives a "Sign in for member pricing" link,
  so the call to action exists; the price it refers to is simply not secret.

## Goals

1. Volunteering events stay fully open, venue included.
2. Non-service events hide the venue from anonymous visitors by default.
3. Paid events show the guest price publicly and gate the member price.
4. Both defaults are overridable per event, and the default is visible in the
   admin form rather than implicit.
5. Redaction happens server-side.

## Non-goals

- Changing `audience`. Partner events stay fail-closed; this only changes what
  a *publicly visible* event reveals.
- Per-viewer rendering of the public detail page. It stays
  anonymous-cacheable; members get the full record in the portal.
- Gating anything else (date, time, description, image).

## Design

### 1. Data model

```ts
export type DetailVisibility = 'public' | 'members';

export interface RotaractEvent {
  // …existing…
  /** Who sees the venue. Absent ⇒ derived from type (see below). */
  venueVisibility?: DetailVisibility;
  /** Who sees the member price. Absent ⇒ 'members'. */
  memberPriceVisibility?: DetailVisibility;
  /** Public-facing blurb used when the venue is gated, so the address in the
   *  main description cannot leak. Falls back to `description`. */
  publicDescription?: string;
}
```

**Defaults, resolved read-time by shared helpers:**

| | default | reasoning |
|---|---|---|
| `venueVisibility`, `type === 'service'` | `public` | Volunteering wants turnout |
| `venueVisibility`, any other type | `members` | Socials are the membership pull |
| `memberPriceVisibility` | `members` | The discount is the incentive |

```ts
export function resolveVenueVisibility(e): DetailVisibility {
  if (e.venueVisibility) return e.venueVisibility;
  return e.type === 'service' ? 'public' : 'members';
}

export function resolveMemberPriceVisibility(e): DetailVisibility {
  return e.memberPriceVisibility ?? 'members';
}
```

### 2. Redaction is server-side

A single `redactEventForPublic(event)` is applied in **every** path that sends
event data to an anonymous browser:

- `getPublicEvents()` — `/events`, homepage
- `getEventBySlug()` — the detail page
- `app/api/events/route.ts` — the search index

It returns a copy with, when `resolveVenueVisibility` is `members`:
`location` and `address` removed, `description` replaced by
`publicDescription` when one exists, and `venueHidden: true` set;
and when `resolveMemberPriceVisibility` is `members`:
`pricing.memberPrice` and every `tier.memberPrice` removed, and
`memberPriceHidden: true` set.

**This cannot be a React-level hide.** The page is server-rendered and the
props are serialised into the RSC payload — a field merely not rendered is
still in the HTML. This is not hypothetical: earlier today the raw Markdown
of an event description was visible in the payload of `/events` while the
card itself rendered clean.

`firestore.rules` needs no change. Anonymous clients cannot read these
documents directly, and the public pages go through `adminDb`.

### 3. What each surface shows

| | Anonymous | Signed-in member |
|---|---|---|
| Title, date, time, description, image | ✅ | ✅ |
| Venue (service event) | ✅ | ✅ |
| Venue (social, default) | 🔒 "Location shared with members" | ✅ in portal |
| Guest price | ✅ | ✅ |
| Member price (default) | 🔒 "Sign in to see member pricing" | ✅ in portal |

The public detail page does not branch on the viewer. A gated field renders a
lock with a link to `/portal/login`, and members read the full record in the
portal — matching how the rest of the site already splits public from
authenticated.

Card changes: `location` is omitted entirely when gated (no "Location shared
with members" clutter on a card), and the member price chip is dropped,
leaving the guest price.

### 4. The description leak

The Neighborhood Supper description contains
`**Where:** The Church of the Holy Trinity, 316 East 88th Street`. Whoever
writes a social's description will do the same, and the lock becomes
decorative.

Two mitigations, both needed:

1. `publicDescription` — an optional public blurb that replaces `description`
   whenever the venue is gated.
2. The admin form shows an explicit warning when venue is set to members-only:
   *"The description is shown publicly. Put the address in the Location field,
   not in the description, or add a public blurb below."*

### 5. JSON-LD correction

`offers.price` currently comes from `memberPrice`. It becomes `guestPrice` —
the price a member of the public actually pays. This is a fix on its own
merits: the structured data has been advertising the member rate publicly.
When there is no pricing, `offers` is omitted as today.

### 6. Admin controls

`CreateEventModal` gains, in the Host & registration panel:

- **Venue** — Show publicly / Members only, pre-set from `type`.
- **Member price** — Show publicly / Members only, pre-set to Members only,
  shown only for `paid`/`hybrid` events.
- **Public blurb** — optional textarea, shown only when venue is gated, with
  the warning from §4.

Changing `type` re-applies the venue default, the same way changing `host`
re-applies the audience default.

### 7. Unrelated bug fixed alongside

`lib/utils/calendar.ts` — `generateCalendarURL` and `downloadICSFile` accept
`time` and `endTime` and never use them, deriving everything from the `date`
field. The live Neighborhood Supper stores `2026-09-19T16:00:00.000Z` and
displays `3:30 PM`, so Add to Calendar exports a **12:00 PM** event. A
volunteer acting on that reminder arrives three and a half hours early.

Both functions will parse `time`/`endTime` and apply them to the date when
present, falling back to the date's own time component.

## Testing

- `resolveVenueVisibility`: `service` ⇒ public; `free`/`paid`/`hybrid` ⇒
  members; explicit value always wins.
- `resolveMemberPriceVisibility`: default members; explicit wins.
- `redactEventForPublic`: venue gated ⇒ no `location`, no `address`;
  `publicDescription` substituted when present; member price gated ⇒ no
  `pricing.memberPrice` and no `tier.memberPrice`, guest prices intact;
  a service event with pricing public ⇒ returned unchanged.
- Regression: an anonymous `/api/events` response for a gated event contains
  no `location`, no `address` and no `memberPrice` anywhere.
- `generateCalendarURL` with `date: …T16:00:00Z` and `time: '3:30 PM'`
  produces a 15:30 start, not 12:00.

## Safety / verification

- No migration. Every field is optional with a resolved default; all 39
  existing documents behave as they do today except that non-service events
  stop publishing their venue and paid events stop publishing member prices —
  which is the intent.
- Verify after deploy: fetch `/api/events` anonymously and assert no
  `memberPrice` key appears anywhere in the payload.
