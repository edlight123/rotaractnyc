# Partner events and event audience — Design

**Date:** 2026-09-15
**Branch:** `feature/partner-events-and-audience`

## Background

Rotaract NYC is regularly invited to events it does not run: Rotary Metro NYC, the
Rotary Club of New York, Rotary District 7230, other Rotaract clubs, and outside
community organisations. Today the site has no way to represent them, so they are
not listed at all.

Confirmed live state (2026-09-15):

| Fact | Value |
|---|---|
| `events` documents | 34, all `status: 'published'` |
| Upcoming events | 1 series only (Neighborhood Supper, 10 occurrences) |
| Cards shown on `/events` today | **1** — recurring series collapse to one card |
| Event types in use | `service` 24, `free` 7, `paid` 3 |
| Tags already improvising a host taxonomy | `rotary`, `district-7230`, `community` |

Two consequences drive this design.

**The public events page is nearly empty.** A visitor sees a single card. Partner
events are not a nice-to-have addition to a full calendar; they are most of what
would be on it.

**The taxonomy already exists informally.** Someone has been tagging events
`rotary` and `district-7230` because there was no structured field to use.

### Not every invitation is public

This is the constraint that makes the change more than a filter row.

- **Rotary Metro NYC** — Rotaract NYC is invited to most of their events, but those
  invitations are for members. An event may only be shown publicly when Metro says
  it is open to everyone. That is communicated out of band, in an email or a
  conversation — it is not a property of any feed.
- **Rotary Club of New York** — their events generally carry a cost the club pays,
  so they are relevant only to the president, VP and board.

So events need an audience, and the default for anything not ours must be closed.

### Existing patterns this builds on

- `MemberRole = 'member' | 'board' | 'president' | 'treasurer'` (`types/index.ts:6`)
- `PostAudience = 'all' | 'board' | 'committee'` (`types/index.ts:270`) — posts already
  have an audience concept; events should mirror it rather than invent a new one.
- `isPublic` is already enforced **server-side**, in five query sites
  (`lib/firebase/queries.ts:69,88,280,369`, `app/api/events/route.ts:23`), not by
  filtering in the browser. The audience field must be enforced the same way.

## Goals

1. Represent events hosted by Rotary-family and community organisations, distinctly
   from our own.
2. Let visitors filter by host without losing the existing cost/type filter.
3. Restrict non-public events to members or to the board, enforced server-side.
4. Send people to the host's own registration page when we do not run registration.
5. Credit service hours for partner volunteering that Rotaract NYC sponsors.
6. Keep the weekly digest useful as partner events scale up.

## Non-goals

- **Ingestion of any kind.** No feed importer, no scraper, no email parsing. Events
  are entered by hand. Ingestion is a separate project (see Follow-on work) and is
  deliberately out of scope here so that the data model can be validated by real use
  first.
- Separate routes or pages per host. One `/events` page.
- A partner-organisation collection, host logos, or per-host branding.
- Changing how service hours are approved. Only *eligibility* is modelled here.

## Design

### 1. Data model

Three new optional fields on `RotaractEvent`, plus one for service hours.

**A one-time backfill of the 34 existing documents is required.** An earlier draft of
this spec claimed it was not; that was wrong, and the reason is worth recording because
it constrains the whole design.

The member portal does not read events through an API. `usePortalEvents`
(`hooks/useFirestore.ts:151`) calls `useCollection('events', …)`, which issues a
Firestore query **directly from the browser**. Enforcement therefore lives in
`firestore.rules` — and Firestore rules are not filters. A query that *could* return a
document the caller may not read fails in its entirety rather than silently omitting
it. So the portal query must carry a `where` clause mirroring the rule.

Firestore cannot express "field absent **or** field in [...]" in a single query, and a
`where('audience', 'in', [...])` clause matches no document that lacks the field. With
34 documents missing `audience`, the portal would show an empty list.

So `host` and `audience` are written explicitly on every document: backfilled once for
the existing 34, and always set on create and update thereafter. The read-time
resolver below stays as defence-in-depth for any document that still slips through,
but it is not the mechanism queries rely on.

```ts
export type EventHost = 'rotaract' | 'rotary' | 'community';
export type EventAudience = 'public' | 'members' | 'board';

export interface RotaractEvent {
  // …existing fields…

  /** Who runs this event. Absent ⇒ 'rotaract'. */
  host?: EventHost;
  /** Hosting organisation for attribution, e.g. "Rotary Metro NYC". Required when host ≠ 'rotaract'. */
  hostName?: string;
  /** When set, the host handles registration and we link out instead of taking RSVPs. */
  externalUrl?: string;
  /** Whether attendance counts toward members' service hours. Absent ⇒ true for 'rotaract', false otherwise. */
  countsForServiceHours?: boolean;

  /** Who may see this event. Absent ⇒ resolved from host (see below). Kept in sync with isPublic. */
  audience?: EventAudience;
}
```

`host` and `audience` are independent of the existing `type`
(`free | paid | service | hybrid`). `type` answers *what does it cost*; `host` answers
*whose event is this*; `audience` answers *who may see it*. Collapsing any of these
into the others makes ordinary combinations — a free community service event visible
to members only — unrepresentable.

**`externalUrl` is the registration toggle.** Its presence, not a separate boolean,
decides whether we take RSVPs. One field, two behaviours, nothing to keep in sync.

#### Relationship to `isPublic`

`isPublic` is load-bearing in five server queries and in `firestore.rules`. It is
**not** replaced. The invariant is:

```
isPublic === (audience === 'public')
```

Writes set both. `audience` is the field humans edit; `isPublic` is the denormalised
form the existing public queries already filter on. This keeps the public path
unchanged and avoids a risky five-site refactor.

#### Defaults, and why they fail closed

| `host` | default `audience` | default `countsForServiceHours` |
|---|---|---|
| `rotaract` (or absent) | `public` | `true` |
| `rotary` | `members` | `false` |
| `community` | `members` | `false` |

An event that is not ours defaults to members-only. Publishing it publicly is a
deliberate act by an admin who has been told it is open. The failure mode of getting
this wrong is "we under-shared an event," not "we published a private invitation."

These are **read-time** defaults, resolved by a single shared helper, not merely
pre-filled values in the admin form:

```ts
function resolveAudience(event): EventAudience {
  if (event.audience) return event.audience;
  return (event.host ?? 'rotaract') === 'rotaract' ? 'public' : 'members';
}
```

This distinction matters. If the default were simply "absent ⇒ public", then a
partner event written by any path that forgot to set `audience` — a script, a future
importer, a hand-edited document — would read as public. Resolving from `host`
instead means the only way to make a non-Rotaract event public is to say so
explicitly. The 34 existing documents have no `host`, so they resolve to `public`
and are unaffected.

### 2. Access control

Enforced in three places, all server-side:

1. **Public queries** (`lib/firebase/queries.ts:69,88,280,369`,
   `app/api/events/route.ts:23`) — unchanged. They already filter `isPublic == true`,
   which by the invariant above means `audience === 'public'`. These run server-side
   with admin credentials, so rules do not apply to them; the `isPublic` filter is the
   control.
2. **Portal queries** — members see `audience in ['public','members']`. Users whose
   `role` is `board`, `president` or `treasurer` additionally see `audience === 'board'`.
3. **`firestore.rules`** — the real enforcement point for the portal, which queries
   Firestore directly from the browser rather than through an API. The rule and the
   portal's query constraints must agree exactly: rules reject whole queries rather
   than filtering rows, so a mismatch shows members an error, not a shorter list.

No audience filtering happens in React. A members-only event must never be present in
a payload sent to an anonymous browser, regardless of what the UI would render.

### 3. Public `/events`

A second chip row beneath the existing type chips:

```
[ All ]  [ Rotaract NYC ]  [ Rotary & District ]  [ Community & Partner ]
```

Defaults to **All** — the purpose is discovery. The two rows compose: type chips and
host chips filter independently. Cards gain a host badge when `host` is not
`rotaract`, showing `hostName`.

`EventsFilter.tsx` already holds `search`, `typeFilter` and `timeTab` state; `hostFilter`
joins them in the same `useMemo` predicate. The recurring-series collapse is unchanged.

**The host filter is URL-addressable**: `?host=rotaract | rotary | community`, read via
`useSearchParams` to seed the initial state. This is required by the digest's "see all"
link (§7) and makes the filtered view shareable — "here's what the district has coming
up" becomes a link rather than an instruction. An unrecognised value falls back to
`All` rather than erroring. The type filter stays component-local; only `host` needs a
URL form, and adding the rest without a caller asking for it is speculative.

`EventsFilter` is a client component and `useSearchParams` requires a Suspense boundary
for the statically-rendered page (`app/(public)/events/page.tsx` sets
`revalidate = 300`), so the component is wrapped in `<Suspense>` with the existing
skeleton as fallback.

### 4. Event detail page

When `externalUrl` is set, the entire registration apparatus is replaced by a single
panel:

> **Hosted by {hostName}.** Registration is handled by them.
> **[ Register on {hostName}'s site → ]**

Specifically suppressed: `GuestRsvpForm`, the pricing block, the sold-out banner,
`TicketScarcity`, the waitlist form, and the member-portal sign-in line. Capacity and
check-in are meaningless for an event we do not run, and showing our RSVP form would
collect registrations the host never receives.

When `externalUrl` is absent the page behaves exactly as it does today, including for
partner events where we *do* run registration.

`eventJsonLd.organizer` is set to `hostName` when `host` is not `rotaract`, so search
engines do not attribute a partner's event to Rotaract NYC.

### 5. Homepage

Rotaract events fill the upcoming slots first; community and partner events top up
whatever remains. Our own work stays the shop window, while a section that currently
renders one card stops looking abandoned. Only `audience === 'public'` events appear.

### 6. Member portal

Same three host chips, and the same `?host=` query parameter as §3 — this is the page
the digest's "see all" link lands on, so it must accept the filter from the URL.
Members see public and members-only events; board members additionally see board-only
ones, via the server-side predicate in §2.

### 7. Emails

**Event reminders — no change.** The daily cron mails people who RSVP'd. An event with
`externalUrl` has no RSVPs by construction, so it cannot generate reminders. The
behaviour is correct without special-casing.

**Weekly digest — capped, with a link to the rest.**

First, a correction to an assumption made earlier in this design. The weekly digest is
**not** a member newsletter. `lib/services/weeklyEventDigest.ts:300-317` selects
recipients as members whose `role` is in `BOARD_ROLES` *and* who have opted in via
`notification_preferences`. It is an internal board digest with a small, opted-in
audience.

That changes the audience rule: because every recipient is board, the digest includes
events at **all three** audience levels, board-only included. An earlier draft of this
spec said board-only events must be excluded "so they are never sent to the full
roster" — that reasoning does not apply to a board-only distribution list, and applying
it would have hidden exactly the events (paid Rotary Club of New York invitations)
that the board most needs to see.

Rotaract events are listed in full, as today. Non-Rotaract events are capped at
**three**, in a separate trailing section, followed by a link to the rest:

> *Also happening in the Rotary & NYC community*
> … three events …
> **See all 9 community & partner events →**

The count is real, not a generic "see more", so a reader can tell at a glance whether
the remainder is worth a click. When the total is three or fewer the link is omitted
entirely rather than linking to a page showing nothing new.

The cap is a constant, `DIGEST_PARTNER_LIMIT = 3`, tunable without a redesign.

**The link target is `/portal/events?host=…`, not `/events`.** This is the wrinkle
worth stating explicitly: the digest may list members-only and board-only events, and
the public `/events` page renders neither. Linking there would send a board member
from a digest listing nine events to a page showing perhaps two, with no explanation
for the discrepancy. Recipients are authenticated members by construction, so the
portal page — which applies the audience predicate from §2 — is the only target that
can show them what the digest just promised.

### 8. Admin — `CreateEventModal`

Adds:

- **Host** — select: Rotaract NYC / Rotary & District / Community & Partner.
- **Hosted by** — text, shown and required when host ≠ Rotaract NYC.
- **Registration URL** — text, optional. Help text: *"Leave empty to take RSVPs on our
  site. Set it to send people to the host's own registration page."*
- **Visibility** — select: Public / Members only / Board only, defaulted per the table
  in §1, with the default made visible rather than silent.
- **Counts toward service hours** — checkbox, defaulted per §1. Help text: *"Tick for
  partner volunteering that Rotaract NYC sponsors."*

Setting Visibility writes both `audience` and `isPublic`.

## Testing

- `hostFilter` predicate: each bucket, `All`, and an event with no `host` (must behave
  as `rotaract`).
- Audience predicate, as a pure function, for anonymous / member / board across all
  three audience values.
- `resolveAudience`: absent `audience` with no `host` ⇒ `public` (the 34 existing
  documents); absent `audience` with `host: 'community'` or `'rotary'` ⇒ `members`.
  This is the fail-closed guarantee and deserves an explicit test.
- The `isPublic` / `audience` invariant holds across a create and an edit.
- Detail page: `externalUrl` set ⇒ no RSVP form, no pricing, no scarcity, no waitlist;
  absent ⇒ unchanged.
- Defaults: creating a `community` event without specifying visibility yields
  `audience: 'members'`, `isPublic: false`.
- Digest: with ten partner events, exactly three appear in the trailing section and the
  link reads "See all 10 …"; with three or fewer, no link is rendered.
- Digest includes a board-only event when one exists (the corrected rule in §7).
- `?host=community` seeds the filter; `?host=nonsense` falls back to `All`.

The existing 558 tests must stay green; none of the new fields change the behaviour of
an event that omits them.

## Safety / verification

- **One-time backfill**, not a schema migration: `host` and `audience` are written onto
  the 34 existing documents (all `host: 'rotaract'`, `audience: 'public'`), which
  preserves their current behaviour exactly. Required because Firestore rules are not
  filters and the portal queries the collection directly from the browser — see §1.
  The backfill is idempotent and skips documents that already carry both fields.
- **Fail closed.** Non-Rotaract events default to members-only.
- **Enforcement is server-side**, mirrored in `firestore.rules`.
- Verify after deploy: an anonymous request to `/api/events` returns no event whose
  `audience` is `members` or `board`.

## Follow-on work (deliberately not in this spec)

**Ingestion.** Investigated 2026-09-15; recorded here so the findings are not lost:

- **Rotary Metro NYC** runs WordPress with The Events Calendar and exposes a public
  JSON API at `https://rotarymetronyc.org/wp-json/tribe/events/v1/events` (verified:
  3 upcoming events, structured title / start_date / venue / cost / url), plus an iCal
  feed at `/events/?ical=1`. No scraper is needed or wanted.
- **Rotary Club of New York** (`nyrotary.org`) returns **HTTP 403** to automated
  requests. Their events are board-only, paid and infrequent, and arrive by email;
  manual entry is the appropriate path.
- **Dedup is a day-one requirement, not a refinement.** Metro's feed already lists
  *our own* Neighborhood Supper at 316 East 88th Street. Any importer must match
  against existing events before writing.
- **Imported events must land as `status: 'draft'`, `audience: 'members'`, always.**
  Whether Metro has said an event is open to everyone is communicated out of band and
  cannot be inferred from a feed.
- **Email invitations may be the better input.** Three real invitations received at
  `info@rotaractnyc.org` (The Hunger Project, CouldYou?/AYA Climate Week, Georgetown
  Rotaract's Big Pink) each state their intended audience in plain English, which no
  feed does. A "forward an invite → draft event" path may be worth more than a feed
  importer.

**Service-hour policy.** This spec models eligibility (`countsForServiceHours`) but not
how sponsorship is decided or approved.
