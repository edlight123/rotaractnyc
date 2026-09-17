# Member profile completeness

**Status:** approved design, not yet implemented
**Date:** 2026-09-17

## The problem

New members are asked, by email, to send "a short bio — who you are, your
background, and why you want to join" before their induction. That ask lives
in prose on the membership page and in whatever the membership committee
happens to send. Nothing collects it, nothing stores it, and nobody can see
who still owes one.

The instinct was to build a form. The club already has one.

Portal onboarding is a four-step wizard — Profile, About You, Photo, Review —
that collects bio, address, occupation, employer, LinkedIn, birthday,
interests and "how did you hear about us", writing all of it onto the member
record. It is mandatory: `PortalShell` redirects anyone with
`onboardingComplete === false` into it, and login routes them there.

Measured against live data on 2026-09-17:

| | |
|---|---|
| Active members | 38 |
| Completed onboarding | 35 |
| Have a bio | **0** |
| Have bio + address + occupation | **0** |

Thirty-five people completed the form and produced no bio between them.

The cause is in `app/portal/onboarding/page.tsx`. Step 1 gates on
`canProceedStep1` (first name, last name, phone). Step 2 — "About You",
which holds bio, occupation, employer and LinkedIn — has no equivalent.
There is no `canProceedStep2`. Continue is always enabled, so everybody
clicks through.

A second, smaller hole: the redirect tests `onboardingComplete === false`,
and unset is not false. One active member has it unset and will never be
sent to onboarding at all.

**So the step is not the problem. The ask is not binding, and nothing
notices when it comes back empty.** A new form would inherit that exactly.

## Decision

Make the existing ask binding, rather than building a parallel induction
form.

The alternative considered was a public form at `/f/induction` built with the
existing forms builder — no code required, and the club could stand it up
today. Rejected because responses land in `formResponses` as a snapshot
disconnected from the member record: it would not populate the directory, it
would re-ask for fields onboarding already collects, and the club would end
up chasing the same people for the same facts twice.

## What "complete" means

Three required fields:

- **`bio`** — who they are, their background, and where in the city they
  live. One field, with placeholder text prompting for all three, rather
  than three separate inputs. Same information, far better completion.
- **`whyJoin`** — new field on the member record. The one thing genuinely
  not collected anywhere today.
- **`occupation`** — already exists, already shown in the directory.

Deliberately **not** the existing `address` field. It holds a full street
address, nothing in the product displays it, and requiring every member's
home address to satisfy an introduction is disproportionate. "Astoria,
Queens" written inside the bio serves the purpose.

## Enforcement

Four surfaces, one definition.

**1. Onboarding (new members).** Add `canProceedStep2` requiring the three
fields. Fixes the problem at source for everyone joining from now on.

**2. Dashboard prompt (backfill, ambient).** A card on `/portal` for any
member with an incomplete profile, linking to a short "finish your profile"
page containing only the missing fields — not the four-step wizard, which
these members have already completed once.

**3. RSVP prompt (backfile, at the moment of wanting something).** The first
time a member with an incomplete profile RSVPs, the missing fields appear
inline in the modal. This one blocks the RSVP until they are filled.
Justified because completing it takes roughly thirty seconds without leaving
the page: a speed bump, not a wall. A gate that can always be dismissed is
just a second banner.

**4. Board view.** A list of members with incomplete profiles — name,
status, joined date, and which fields are missing — so somebody can chase
people ahead of an induction.

## Display

`bio` is currently written to the member record and rendered nowhere. It
appears in neither the directory card nor the leadership page.

Requiring it without showing it anywhere would be asking thirty-eight people
to write something no one will read, which is a reliable way to end up back
at thirty-eight empty bios. The bio must appear on the member's directory
profile as part of this work. This is not decoration; it is what makes the
requirement legitimate.

## Structure

A single `profileCompleteness(member)` helper is the source of truth for
what is missing, consumed by all four surfaces above. Unit-tested
independently of any of them.

Without it, four places grow four subtly different definitions of
"complete", and the dashboard starts nagging people the RSVP modal considers
finished.

## Out of scope, deliberately

- **A `prospective` member status.** `MemberStatus` is
  `pending | active | inactive | alumni`, where `pending` means "signed up,
  awaiting admin approval". There is no event marking someone as
  pre-induction, and inventing one is not needed for any of the four
  surfaces above.
- **A hard software gate on induction.** Something that can strand a real
  person on induction night is a liability. The board chasing a list is the
  right mechanism. Both of these are easy to add later if the club actually
  wants them.

## Testing

- `profileCompleteness` — unit tests over present, absent, whitespace-only
  and legacy-shaped member records.
- Onboarding step 2 cannot be passed with any required field empty.
- A member with `onboardingComplete` unset is treated as incomplete, not
  skipped.
- The dashboard prompt appears only for incomplete profiles and disappears
  once complete.
- The RSVP path blocks on an incomplete profile and proceeds once filled.

## Risks

- **Blocking RSVPs could cost attendance** if the inline form is slower than
  intended. Mitigation: only the three fields, inline, no navigation. Worth
  watching after release.
- **Thirty-five people are about to be told their profile is incomplete**
  having already completed onboarding. The prompt copy needs to explain why
  they are being asked again, or it will read as the product being broken.
