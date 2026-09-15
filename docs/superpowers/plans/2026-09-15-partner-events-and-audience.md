# Partner Events and Event Audience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let rotaractnyc.org list events hosted by Rotary-family and community organisations, with per-event visibility (public / members / board) enforced server-side, and link out to the host when we do not run registration.

**Architecture:** Four new fields on the existing `events` documents — `host`, `hostName`, `externalUrl`, `countsForServiceHours` — plus `audience`, kept in sync with the existing `isPublic` flag. Pure resolver helpers centralise the fail-closed defaults; `firestore.rules` is the enforcement point for the portal (which queries Firestore directly from the browser), and the existing `isPublic` filter remains the control for server-side public queries.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firestore (firebase-admin server-side, firebase-js client-side in the portal), Tailwind, Jest + @testing-library/react, Resend for email.

**Spec:** `docs/superpowers/specs/2026-09-15-partner-events-and-audience-design.md`

## Global Constraints

- **Fail closed.** A non-Rotaract event with no explicit `audience` resolves to `'members'`, never `'public'`.
- **Invariant, enforced on every write:** `isPublic === (audience === 'public')`.
- **Rules and queries must agree exactly.** Firestore rules reject whole queries rather than filtering rows; a portal query whose constraints are looser than the rule shows members an error, not a shorter list.
- **No audience filtering in React.** A members-only event must never appear in a payload sent to an anonymous browser.
- **Bucket labels, verbatim:** `Rotaract NYC`, `Rotary & District`, `Community & Partner`. Chip row order: `All`, then those three.
- **Field values, verbatim:** `host` ∈ `'rotaract' | 'rotary' | 'community'`; `audience` ∈ `'public' | 'members' | 'board'`.
- **Board roles, verbatim:** `['board', 'president', 'treasurer']` — matches `BOARD_ROLES` in `lib/services/weeklyEventDigest.ts:36`. VP is covered by `board`.
- **`DIGEST_PARTNER_LIMIT = 3`.**
- Run `npx tsc --noEmit` and `npx jest` before every commit. The suite is at 558 passing; it must not regress.

---

### Task 1: Audience and host resolver helpers

Pure functions, no I/O. Every later task imports from here rather than re-deriving defaults.

**Files:**
- Create: `lib/utils/eventAudience.ts`
- Create: `__tests__/lib/utils/eventAudience.test.ts`
- Modify: `types/index.ts` (add `EventHost`, `EventAudience`, extend `RotaractEvent`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type EventHost = 'rotaract' | 'rotary' | 'community'`
  - `type EventAudience = 'public' | 'members' | 'board'`
  - `resolveHost(event: HostedEvent): EventHost`
  - `resolveAudience(event: HostedEvent): EventAudience`
  - `resolveCountsForServiceHours(event: HostedEvent): boolean`
  - `canSeeEvent(event: HostedEvent, viewer: Viewer): boolean`
  - `isExternallyRegistered(event: HostedEvent): boolean`
  - `HOST_LABELS: Record<EventHost, string>`
  - `type Viewer = { signedIn: boolean; role?: MemberRole }`
  - `type HostedEvent = { host?: EventHost; audience?: EventAudience; countsForServiceHours?: boolean; externalUrl?: string }`

- [ ] **Step 1: Add the types**

In `types/index.ts`, beside `PostAudience` (line 270):

```ts
export type EventHost = 'rotaract' | 'rotary' | 'community';
export type EventAudience = 'public' | 'members' | 'board';
```

In `interface RotaractEvent`, after the `committeeId` field:

```ts
  // ── Host & audience ──
  /** Who runs this event. Absent ⇒ 'rotaract'. */
  host?: EventHost;
  /** Hosting organisation for attribution, e.g. "Rotary Metro NYC". */
  hostName?: string;
  /** When set, the host handles registration and we link out instead of taking RSVPs. */
  externalUrl?: string;
  /** Whether attendance counts toward members' service hours. */
  countsForServiceHours?: boolean;
  /** Who may see this event. Kept in sync with isPublic. */
  audience?: EventAudience;
```

- [ ] **Step 2: Write the failing tests**

`__tests__/lib/utils/eventAudience.test.ts`:

```ts
import {
  resolveHost,
  resolveAudience,
  resolveCountsForServiceHours,
  canSeeEvent,
  isExternallyRegistered,
  HOST_LABELS,
} from '@/lib/utils/eventAudience';

describe('resolveHost', () => {
  it('defaults to rotaract when absent', () => {
    expect(resolveHost({})).toBe('rotaract');
  });
  it('returns the explicit host', () => {
    expect(resolveHost({ host: 'community' })).toBe('community');
  });
});

describe('resolveAudience', () => {
  // The fail-closed guarantee. A partner event written by any path that
  // forgot to set `audience` must NOT read as public.
  it('is public for an event with no host (the 34 existing documents)', () => {
    expect(resolveAudience({})).toBe('public');
  });
  it('is public for an explicit rotaract event', () => {
    expect(resolveAudience({ host: 'rotaract' })).toBe('public');
  });
  it('is members for a rotary event with no explicit audience', () => {
    expect(resolveAudience({ host: 'rotary' })).toBe('members');
  });
  it('is members for a community event with no explicit audience', () => {
    expect(resolveAudience({ host: 'community' })).toBe('members');
  });
  it('honours an explicit audience over the host default', () => {
    expect(resolveAudience({ host: 'community', audience: 'public' })).toBe('public');
    expect(resolveAudience({ host: 'rotaract', audience: 'board' })).toBe('board');
  });
});

describe('resolveCountsForServiceHours', () => {
  it('defaults true for our own events', () => {
    expect(resolveCountsForServiceHours({})).toBe(true);
    expect(resolveCountsForServiceHours({ host: 'rotaract' })).toBe(true);
  });
  it('defaults false for partner events', () => {
    expect(resolveCountsForServiceHours({ host: 'community' })).toBe(false);
    expect(resolveCountsForServiceHours({ host: 'rotary' })).toBe(false);
  });
  it('honours an explicit false on our own event', () => {
    expect(resolveCountsForServiceHours({ host: 'rotaract', countsForServiceHours: false })).toBe(false);
  });
  it('honours an explicit true on a sponsored partner event', () => {
    expect(resolveCountsForServiceHours({ host: 'community', countsForServiceHours: true })).toBe(true);
  });
});

describe('canSeeEvent', () => {
  const anon = { signedIn: false };
  const member = { signedIn: true, role: 'member' as const };
  const board = { signedIn: true, role: 'board' as const };
  const president = { signedIn: true, role: 'president' as const };
  const treasurer = { signedIn: true, role: 'treasurer' as const };

  it('lets anyone see a public event', () => {
    expect(canSeeEvent({ audience: 'public' }, anon)).toBe(true);
  });
  it('hides members-only events from anonymous visitors', () => {
    expect(canSeeEvent({ audience: 'members' }, anon)).toBe(false);
  });
  it('hides board-only events from anonymous visitors', () => {
    expect(canSeeEvent({ audience: 'board' }, anon)).toBe(false);
  });
  it('lets a member see members-only events', () => {
    expect(canSeeEvent({ audience: 'members' }, member)).toBe(true);
  });
  it('hides board-only events from an ordinary member', () => {
    expect(canSeeEvent({ audience: 'board' }, member)).toBe(false);
  });
  it.each([['board', board], ['president', president], ['treasurer', treasurer]])(
    'lets %s see board-only events',
    (_label, viewer) => {
      expect(canSeeEvent({ audience: 'board' }, viewer as any)).toBe(true);
    },
  );
  it('applies the fail-closed default: a community event hides from anon', () => {
    expect(canSeeEvent({ host: 'community' }, anon)).toBe(false);
  });
});

describe('isExternallyRegistered', () => {
  it('is false when externalUrl is absent or blank', () => {
    expect(isExternallyRegistered({})).toBe(false);
    expect(isExternallyRegistered({ externalUrl: '   ' })).toBe(false);
  });
  it('is true when externalUrl is set', () => {
    expect(isExternallyRegistered({ externalUrl: 'https://thp.org/events/fall-event/' })).toBe(true);
  });
});

describe('HOST_LABELS', () => {
  it('uses the agreed bucket labels', () => {
    expect(HOST_LABELS).toEqual({
      rotaract: 'Rotaract NYC',
      rotary: 'Rotary & District',
      community: 'Community & Partner',
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest __tests__/lib/utils/eventAudience.test.ts`
Expected: FAIL — `Cannot find module '@/lib/utils/eventAudience'`

- [ ] **Step 4: Write the implementation**

`lib/utils/eventAudience.ts`:

```ts
import type { EventAudience, EventHost, MemberRole } from '@/types';

/** Roles that may see board-only events. VP is covered by 'board'. */
export const BOARD_ROLES: readonly MemberRole[] = ['board', 'president', 'treasurer'];

export const HOST_LABELS: Record<EventHost, string> = {
  rotaract: 'Rotaract NYC',
  rotary: 'Rotary & District',
  community: 'Community & Partner',
};

export interface HostedEvent {
  host?: EventHost;
  audience?: EventAudience;
  countsForServiceHours?: boolean;
  externalUrl?: string;
}

export interface Viewer {
  signedIn: boolean;
  role?: MemberRole;
}

export function resolveHost(event: HostedEvent): EventHost {
  return event.host ?? 'rotaract';
}

/**
 * Fail closed: an event that is not ours and carries no explicit audience is
 * members-only. If this defaulted to 'public', any write path that forgot to
 * set `audience` — a script, an importer, a hand-edited document — would
 * publish a private invitation.
 */
export function resolveAudience(event: HostedEvent): EventAudience {
  if (event.audience) return event.audience;
  return resolveHost(event) === 'rotaract' ? 'public' : 'members';
}

export function resolveCountsForServiceHours(event: HostedEvent): boolean {
  if (typeof event.countsForServiceHours === 'boolean') return event.countsForServiceHours;
  return resolveHost(event) === 'rotaract';
}

export function canSeeEvent(event: HostedEvent, viewer: Viewer): boolean {
  const audience = resolveAudience(event);
  if (audience === 'public') return true;
  if (!viewer.signedIn) return false;
  if (audience === 'members') return true;
  return !!viewer.role && BOARD_ROLES.includes(viewer.role);
}

/** The presence of externalUrl is the registration toggle — no separate flag. */
export function isExternallyRegistered(event: HostedEvent): boolean {
  return !!event.externalUrl && event.externalUrl.trim().length > 0;
}

/** Audiences a viewer may query for. Mirrors firestore.rules exactly. */
export function visibleAudiences(viewer: Viewer): EventAudience[] {
  if (!viewer.signedIn) return ['public'];
  if (viewer.role && BOARD_ROLES.includes(viewer.role)) return ['public', 'members', 'board'];
  return ['public', 'members'];
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest __tests__/lib/utils/eventAudience.test.ts && npx tsc --noEmit`
Expected: PASS, tsc silent

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/utils/eventAudience.ts __tests__/lib/utils/eventAudience.test.ts
git commit -m "Add event host and audience types with fail-closed resolvers"
```

---

### Task 2: Backfill `host` and `audience` on existing events

Firestore rules are not filters, and `where('audience','in',[...])` matches no document lacking the field. Without this, the portal renders empty.

**Files:**
- Create: `scripts/backfill-event-host-audience.mjs`
- Modify: `package.json` (add two scripts)

**Interfaces:**
- Consumes: `resolveHost`/`resolveAudience` semantics from Task 1 (re-stated inline; the script is plain `.mjs` and does not import TS).
- Produces: every `events` document carries explicit `host` and `audience`.

- [ ] **Step 1: Write the script**

`scripts/backfill-event-host-audience.mjs`:

```js
/**
 * One-time, idempotent backfill: write explicit `host` and `audience` onto
 * every events document.
 *
 * Required because firestore.rules are not filters — the portal queries the
 * collection directly from the browser with a where('audience','in',[...])
 * clause, and that clause matches no document missing the field.
 *
 * Existing documents are all ours and all public, so this preserves current
 * behaviour exactly.
 *
 *   node scripts/backfill-event-host-audience.mjs --dry-run
 *   node scripts/backfill-event-host-audience.mjs
 */
import fs from 'fs';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

function loadServiceAccount() {
  const raw = fs.readFileSync('.env.local', 'utf8');
  const line = raw.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
  if (!line) throw new Error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
  let value = line.slice('FIREBASE_SERVICE_ACCOUNT='.length).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  try {
    return JSON.parse(value);
  } catch {
    return JSON.parse(value.replace(/\n/g, '\\n'));
  }
}

admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
const db = admin.firestore();

const snap = await db.collection('events').get();
console.log(`Found ${snap.size} events. ${DRY_RUN ? 'DRY RUN — no writes.' : 'Writing.'}`);

let updated = 0;
let skipped = 0;
let batch = db.batch();
let pending = 0;

for (const doc of snap.docs) {
  const data = doc.data();
  if (data.host && data.audience) {
    skipped++;
    continue;
  }
  const host = data.host ?? 'rotaract';
  // Preserve existing visibility exactly: isPublic is the current source of truth.
  const audience = data.audience ?? (data.isPublic === true ? 'public' : 'members');
  console.log(`  ${doc.id}  ${String(data.title).slice(0, 46).padEnd(46)} → host=${host} audience=${audience}`);
  if (!DRY_RUN) {
    batch.update(doc.ref, { host, audience });
    pending++;
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  updated++;
}

if (!DRY_RUN && pending > 0) await batch.commit();
console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'}: ${updated}   already tagged (skipped): ${skipped}`);
process.exit(0);
```

- [ ] **Step 2: Add the npm scripts**

In `package.json`, beside the existing `deploy:rules` entries:

```json
    "backfill:event-host": "node scripts/backfill-event-host-audience.mjs",
    "backfill:event-host:dry": "node scripts/backfill-event-host-audience.mjs --dry-run",
```

- [ ] **Step 3: Dry run and read the output**

Run: `npm run backfill:event-host:dry`
Expected: `Found 34 events. DRY RUN — no writes.` then 34 lines all showing `host=rotaract audience=public`, then `Would update: 34   already tagged (skipped): 0`.

**Stop and check.** If any line shows `audience=members`, that document has `isPublic: false` — confirm that is intended before proceeding.

- [ ] **Step 4: Run it for real, then verify idempotency**

Run: `npm run backfill:event-host`
Expected: `Updated: 34   already tagged (skipped): 0`

Run it a second time: `npm run backfill:event-host`
Expected: `Updated: 0   already tagged (skipped): 34`

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-event-host-audience.mjs package.json
git commit -m "Add idempotent backfill for event host and audience"
```

---

### Task 3: Enforce audience in Firestore rules and the portal query

The portal reads Firestore from the browser, so this is the real enforcement point.

**Files:**
- Modify: `firestore.rules:145-151`
- Modify: `hooks/useFirestore.ts:151-156` (`usePortalEvents`)
- Create: `__tests__/lib/utils/visibleAudiences.test.ts`

**Interfaces:**
- Consumes: `visibleAudiences(viewer)` and `BOARD_ROLES` from Task 1.
- Produces: `usePortalEvents(viewer: Viewer)` — note the **changed signature**; Task 7 updates the caller.

- [ ] **Step 1: Write the failing test for the query constraint**

`__tests__/lib/utils/visibleAudiences.test.ts`:

```ts
import { visibleAudiences } from '@/lib/utils/eventAudience';

describe('visibleAudiences — must mirror firestore.rules exactly', () => {
  it('anonymous sees public only', () => {
    expect(visibleAudiences({ signedIn: false })).toEqual(['public']);
  });
  it('a member sees public and members', () => {
    expect(visibleAudiences({ signedIn: true, role: 'member' })).toEqual(['public', 'members']);
  });
  it.each(['board', 'president', 'treasurer'] as const)('%s sees all three', (role) => {
    expect(visibleAudiences({ signedIn: true, role })).toEqual(['public', 'members', 'board']);
  });
  it('a signed-in user with no role is treated as a member, not board', () => {
    expect(visibleAudiences({ signedIn: true })).toEqual(['public', 'members']);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx jest __tests__/lib/utils/visibleAudiences.test.ts`
Expected: PASS (implemented in Task 1). If it fails, Task 1 is incomplete — fix there.

- [ ] **Step 3: Update `firestore.rules`**

Replace lines 145-151:

```
    match /events/{eventId} {
      // Audience resolution must match resolveAudience() in
      // lib/utils/eventAudience.ts — fail closed: an event that is not ours
      // and carries no explicit audience is members-only.
      function eventAudience() {
        return resource.data.get('audience',
          resource.data.get('host', 'rotaract') == 'rotaract' ? 'public' : 'members');
      }

      allow read: if (resource.data.isPublic == true
                      && resource.data.status == 'published'
                      && eventAudience() == 'public')
                  || (isMember() && eventAudience() == 'members')
                  || (isBoard() && eventAudience() == 'board');

      // Board+ can manage events
      allow create, update, delete: if isBoard();
    }
```

- [ ] **Step 4: Update the portal query to match the rule**

In `hooks/useFirestore.ts`, replace `usePortalEvents` (lines 151-156):

```ts
/**
 * Portal events, filtered by what the viewer may read.
 *
 * The `where('audience','in',…)` clause is not cosmetic — firestore.rules
 * reject a query that could return an unreadable document rather than
 * filtering it out, so this must mirror the rule exactly. It also means
 * every document needs an explicit `audience` field; see
 * scripts/backfill-event-host-audience.mjs.
 */
export function usePortalEvents(viewer: Viewer) {
  const audiences = visibleAudiences(viewer);
  return useCollection('events', [
    where('audience', 'in', audiences),
    orderBy('date', 'desc'),
    limit(30),
  ]);
}
```

Add to the imports at the top of the file:

```ts
import { visibleAudiences, type Viewer } from '@/lib/utils/eventAudience';
```

`where` is already imported in this file (used by `useArticles` at line 160).

- [ ] **Step 5: Deploy the rules and verify**

Run: `npm run deploy:rules:dry`
Expected: the diff shows only the `match /events` block changing.

Run: `npm run deploy:rules`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules hooks/useFirestore.ts __tests__/lib/utils/visibleAudiences.test.ts
git commit -m "Enforce event audience in Firestore rules and the portal query"
```

---

### Task 4: Admin — host, visibility and registration fields

**Files:**
- Modify: `components/portal/CreateEventModal.tsx` (state ~line 209, payload ~line 545-572, form body, `resetForm` ~line 359, edit-prefill ~line 282, draft autosave ~line 387 and ~line 416)
- Modify: `app/api/portal/events/route.ts` (accept and persist the new fields)

**Interfaces:**
- Consumes: `EventHost`, `EventAudience`, `HOST_LABELS`, `resolveAudience`, `resolveCountsForServiceHours` from Task 1.
- Produces: events written with explicit `host`, `hostName`, `externalUrl`, `audience`, `isPublic`, `countsForServiceHours`.

- [ ] **Step 1: Add form state**

In `CreateEventModal.tsx`, beside `const [isPublic, setIsPublic] = useState(true);` (line 209):

```ts
  const [host, setHost] = useState<EventHost>('rotaract');
  const [hostName, setHostName] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [audience, setAudience] = useState<EventAudience>('public');
  const [countsForServiceHours, setCountsForServiceHours] = useState(true);
```

Import the types and helpers:

```ts
import { HOST_LABELS, resolveAudience, resolveCountsForServiceHours } from '@/lib/utils/eventAudience';
import type { EventHost, EventAudience } from '@/types';
```

- [ ] **Step 2: Default audience and service hours when host changes**

Add below the state declarations:

```ts
  // Changing the host re-applies the fail-closed defaults, so an admin who
  // switches an event to a partner does not silently leave it public.
  function handleHostChange(next: EventHost) {
    setHost(next);
    setAudience(resolveAudience({ host: next }));
    setCountsForServiceHours(resolveCountsForServiceHours({ host: next }));
    if (next === 'rotaract') setHostName('');
  }
```

- [ ] **Step 3: Keep `isPublic` in sync with `audience`**

Replace the `isPublic` checkbox at lines 1245-1250 with a Visibility select, and drop `isPublic` from the form's own state — it becomes derived:

```tsx
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as EventAudience)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    <option value="public">Public — anyone can see it</option>
                    <option value="members">Members only</option>
                    <option value="board">Board only</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Partner events default to members only. Set Public only when the host has told us it&rsquo;s open to everyone.
                  </p>
```

- [ ] **Step 4: Add the Host, Hosted by and Registration URL fields**

Place directly above the Visibility select:

```tsx
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Host</label>
                  <select
                    value={host}
                    onChange={(e) => handleHostChange(e.target.value as EventHost)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    {(Object.keys(HOST_LABELS) as EventHost[]).map((h) => (
                      <option key={h} value={h}>{HOST_LABELS[h]}</option>
                    ))}
                  </select>

                  {host !== 'rotaract' && (
                    <>
                      <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hosted by <span className="text-cranberry">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder="Rotary Metro NYC"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      />
                    </>
                  )}

                  <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Registration URL <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://rotarymetronyc.org/event/..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to take RSVPs on our site. Set it to send people to the host&rsquo;s own registration page instead.
                  </p>

                  <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={countsForServiceHours}
                      onChange={(e) => setCountsForServiceHours(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Counts toward service hours
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Tick for partner volunteering that Rotaract NYC sponsors.
                  </p>
```

- [ ] **Step 5: Add the fields to the submit payload**

In `handleSubmit`, in the `eventData` object (replacing the bare `isPublic,` at line 562):

```ts
        host,
        hostName: host === 'rotaract' ? undefined : hostName.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
        audience,
        // Invariant: isPublic === (audience === 'public'). Written together so
        // the existing public queries, which filter on isPublic, stay correct.
        isPublic: audience === 'public',
        countsForServiceHours,
```

- [ ] **Step 6: Prefill on edit and clear on reset**

In the edit-prefill effect beside line 282 (`setIsPublic(event.isPublic ?? true)`), replace that line with:

```ts
      setHost(event.host ?? 'rotaract');
      setHostName(event.hostName ?? '');
      setExternalUrl(event.externalUrl ?? '');
      setAudience(resolveAudience(event));
      setCountsForServiceHours(resolveCountsForServiceHours(event));
```

In `resetForm` beside line 359 (`setIsPublic(true)`), replace that line with:

```ts
    setHost('rotaract');
    setHostName('');
    setExternalUrl('');
    setAudience('public');
    setCountsForServiceHours(true);
```

In the draft autosave object (line 387), replace `isPublic,` with `host, hostName, externalUrl, audience, countsForServiceHours,`; in the draft restore (line 416), replace the `draft.isPublic` line with:

```ts
      if (draft.host) setHost(draft.host);
      if (draft.hostName !== undefined) setHostName(draft.hostName);
      if (draft.externalUrl !== undefined) setExternalUrl(draft.externalUrl);
      if (draft.audience) setAudience(draft.audience);
      if (draft.countsForServiceHours !== undefined) setCountsForServiceHours(draft.countsForServiceHours);
```

- [ ] **Step 7: Persist the fields in the API route**

In `app/api/portal/events/route.ts`, wherever the POST and PATCH handlers build the document from the request body, add `host`, `hostName`, `externalUrl`, `audience`, `countsForServiceHours` alongside the existing `isPublic`. Then add a server-side guard so the invariant cannot be broken by a hand-crafted request — place it immediately before the Firestore write in both handlers:

```ts
    // The invariant the public queries depend on. Never trust the client to
    // send a consistent pair.
    if (eventData.audience) {
      eventData.isPublic = eventData.audience === 'public';
    }
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc silent, 558+ passing.

Then manually: `npm run dev`, create a Community & Partner event, and confirm Visibility defaults to "Members only" the moment you pick that host.

- [ ] **Step 9: Commit**

```bash
git add components/portal/CreateEventModal.tsx app/api/portal/events/route.ts
git commit -m "Admin: host, hosted-by, registration URL, visibility and service-hours fields"
```

---

### Task 5: Public `/events` — host filter chips and `?host=`

**Files:**
- Modify: `components/public/EventsFilter.tsx`
- Modify: `app/(public)/events/page.tsx` (Suspense boundary)
- Create: `__tests__/components/public/EventsFilter.test.tsx`

**Interfaces:**
- Consumes: `HOST_LABELS`, `resolveHost` from Task 1.
- Produces: `/events?host=rotaract|rotary|community` deep links, consumed by Task 9.

- [ ] **Step 1: Write the failing test**

`__tests__/components/public/EventsFilter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import EventsFilter from '@/components/public/EventsFilter';
import type { RotaractEvent } from '@/types';

const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

function evt(over: Partial<RotaractEvent>): RotaractEvent {
  const future = new Date(Date.now() + 30 * 864e5).toISOString();
  return {
    id: 'e1', title: 'Event', slug: 'event', description: '', date: future,
    time: '6:00 PM', location: 'NYC', type: 'free', isPublic: true,
    status: 'published', createdAt: future, ...over,
  } as RotaractEvent;
}

describe('EventsFilter host chips', () => {
  const events = [
    evt({ id: 'a', title: 'Our Supper', slug: 'our-supper', host: 'rotaract' }),
    evt({ id: 'b', title: 'District Conference', slug: 'district', host: 'rotary', hostName: 'District 7230' }),
    evt({ id: 'c', title: 'Hunger Project Gala', slug: 'thp', host: 'community', hostName: 'The Hunger Project' }),
  ];

  beforeEach(() => { mockSearchParams.delete('host'); });

  it('renders all three bucket chips plus All', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByRole('button', { name: 'Rotaract NYC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotary & District' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Community & Partner' })).toBeInTheDocument();
  });

  it('shows every event by default', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByText('Our Supper')).toBeInTheDocument();
    expect(screen.getByText('District Conference')).toBeInTheDocument();
    expect(screen.getByText('Hunger Project Gala')).toBeInTheDocument();
  });

  it('seeds the filter from ?host=community', () => {
    mockSearchParams.set('host', 'community');
    render(<EventsFilter events={events} />);
    expect(screen.getByText('Hunger Project Gala')).toBeInTheDocument();
    expect(screen.queryByText('Our Supper')).not.toBeInTheDocument();
  });

  it('falls back to All for an unrecognised ?host= value', () => {
    mockSearchParams.set('host', 'nonsense');
    render(<EventsFilter events={events} />);
    expect(screen.getByText('Our Supper')).toBeInTheDocument();
    expect(screen.getByText('District Conference')).toBeInTheDocument();
  });

  it('treats an event with no host as a Rotaract event', () => {
    mockSearchParams.set('host', 'rotaract');
    render(<EventsFilter events={[evt({ id: 'z', title: 'Legacy Event', slug: 'legacy' })]} />);
    expect(screen.getByText('Legacy Event')).toBeInTheDocument();
  });

  it('shows a host badge on partner events only', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByText('The Hunger Project')).toBeInTheDocument();
    expect(screen.getByText('District 7230')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx jest __tests__/components/public/EventsFilter.test.tsx`
Expected: FAIL — no "Rotaract NYC" button exists.

- [ ] **Step 3: Implement**

In `components/public/EventsFilter.tsx`:

```ts
'use client';
import { useSearchParams } from 'next/navigation';
import { HOST_LABELS, resolveHost } from '@/lib/utils/eventAudience';
import type { EventHost } from '@/types';
```

Seed state from the URL:

```ts
  const searchParams = useSearchParams();
  const hostParam = searchParams.get('host');
  const initialHost: EventHost | 'all' =
    hostParam === 'rotaract' || hostParam === 'rotary' || hostParam === 'community'
      ? hostParam
      : 'all';
  const [hostFilter, setHostFilter] = useState<EventHost | 'all'>(initialHost);
```

Add to the `useMemo` predicate, beside `matchType`:

```ts
        const matchHost = hostFilter === 'all' || resolveHost(e) === hostFilter;
```

and include `matchHost` in the returned conjunction; add `hostFilter` to the dependency array.

Render the chip row directly below the existing type-chip row:

```tsx
      <div className="flex flex-wrap gap-2 mb-8">
        {(['all', 'rotaract', 'rotary', 'community'] as const).map((val) => (
          <button
            key={val}
            onClick={() => setHostFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              hostFilter === val
                ? 'bg-azure text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {val === 'all' ? 'All' : HOST_LABELS[val]}
          </button>
        ))}
      </div>
```

In the card, beside the type badge, add the host badge:

```tsx
                {resolveHost(event) !== 'rotaract' && event.hostName && (
                  <Badge variant="azure">{event.hostName}</Badge>
                )}
```

Update the empty-state condition at the bottom to include `hostFilter !== 'all'` so "Clear filters" appears, and have that button also call `setHostFilter('all')`.

- [ ] **Step 4: Add the Suspense boundary**

`useSearchParams` in a client component de-opts a statically rendered page unless wrapped. In `app/(public)/events/page.tsx`:

```tsx
import { Suspense } from 'react';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
...
          <Suspense fallback={<CardGridSkeleton />}>
            <EventsFilter events={events} />
          </Suspense>
```

- [ ] **Step 5: Verify**

Run: `npx jest __tests__/components/public/EventsFilter.test.tsx && npx tsc --noEmit && npm run build`
Expected: tests pass, tsc silent, build succeeds with no `useSearchParams` de-opt warning.

- [ ] **Step 6: Commit**

```bash
git add components/public/EventsFilter.tsx "app/(public)/events/page.tsx" __tests__/components/public/EventsFilter.test.tsx
git commit -m "Public events: host filter chips, ?host= deep links, host badge"
```

---

### Task 6: Event detail — external registration panel

**Files:**
- Modify: `app/(public)/events/[slug]/page.tsx`

**Interfaces:**
- Consumes: `isExternallyRegistered`, `resolveHost` from Task 1.
- Produces: nothing downstream.

- [ ] **Step 1: Compute the flag**

Beside `const memberDiscount = hasMemberDiscount(event);`:

```ts
  // When the host runs registration we show none of our own registration UI —
  // collecting RSVPs the host never receives is worse than not listing it.
  const external = isExternallyRegistered(event);
  const hostLabel = event.hostName || 'the host';
```

Import: `import { isExternallyRegistered, resolveHost } from '@/lib/utils/eventAudience';`

- [ ] **Step 2: Attribute the event correctly in JSON-LD**

In `eventJsonLd`, replace the `organizer` block:

```ts
    organizer: resolveHost(event) === 'rotaract'
      ? { '@type': 'Organization', name: SITE.name, url: SITE.url }
      : { '@type': 'Organization', name: event.hostName || SITE.name },
```

- [ ] **Step 3: Gate the registration section**

Inside the existing IIFE that renders the registration block, immediately after the `eventHasEnded(event)` early return, insert:

```tsx
              if (external) {
                return (
                  <div className="mt-10 rounded-2xl border border-azure-200 dark:border-azure-900/40 bg-azure-50 dark:bg-azure-900/10 p-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Hosted by <span className="font-semibold text-gray-900 dark:text-white">{hostLabel}</span>. Registration is handled by them.
                    </p>
                    <a
                      href={event.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cranberry px-5 py-3 text-sm font-semibold text-white hover:bg-cranberry-800 transition"
                    >
                      Register on {hostLabel}&rsquo;s site →
                    </a>
                  </div>
                );
              }
```

Also wrap the Pricing block, the sold-out banner and the `<TicketScarcity …/>` line in `{!external && ( … )}` — capacity and ticket counts are meaningless for an event we do not run.

- [ ] **Step 4: Verify manually**

Run `npm run dev`. Temporarily set `externalUrl` on one event in Firestore and load its page.
Expected: no RSVP form, no pricing block, no scarcity nudge, no waitlist, no member-portal line — just the host panel. Remove the field afterwards.

- [ ] **Step 5: Verify automatically**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc silent, suite green.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/events/[slug]/page.tsx"
git commit -m "Event detail: link out to the host when they run registration"
```

---

### Task 7: Portal events — host filter and `?host=`

**Files:**
- Modify: `app/portal/events/page.tsx`

**Interfaces:**
- Consumes: `usePortalEvents(viewer)` from Task 3 (**changed signature**), `HOST_LABELS`, `resolveHost` from Task 1.
- Produces: `/portal/events?host=…`, the link target for Task 9.

- [ ] **Step 1: Pass the viewer to the hook**

Replace `const { data: firestoreEvents, loading } = usePortalEvents();`:

```ts
  const { data: firestoreEvents, loading } = usePortalEvents({
    signedIn: !!user,
    role: member?.role,
  });
```

- [ ] **Step 2: Add the host filter, seeded from the URL**

```ts
  const searchParams = useSearchParams();
  const hostParam = searchParams.get('host');
  const [hostFilter, setHostFilter] = useState<EventHost | 'all'>(
    hostParam === 'rotaract' || hostParam === 'rotary' || hostParam === 'community' ? hostParam : 'all',
  );
```

Add beside `TYPE_FILTERS`:

```ts
const HOST_FILTERS = [
  { value: 'all', label: 'All hosts' },
  { value: 'rotaract', label: 'Rotaract NYC' },
  { value: 'rotary', label: 'Rotary & District' },
  { value: 'community', label: 'Community & Partner' },
];
```

Render a second `<FilterSelect>` in the existing `<FilterBar>`, mirroring the type one, and add `resolveHost(e) === hostFilter` to the list's filter predicate.

Imports:

```ts
import { useSearchParams } from 'next/navigation';
import { resolveHost } from '@/lib/utils/eventAudience';
import type { EventHost } from '@/types';
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx jest && npm run build`
Expected: all green.

Manually: log in, visit `/portal/events?host=community`, confirm the select shows "Community & Partner" on load.

- [ ] **Step 4: Commit**

```bash
git add app/portal/events/page.tsx
git commit -m "Portal events: host filter seeded from ?host="
```

---

### Task 8: Homepage — Rotaract events first

**Files:**
- Modify: `app/(public)/page.tsx:210-225` (the upcoming-events section)

**Interfaces:**
- Consumes: `resolveHost` from Task 1.

- [ ] **Step 1: Sort before slicing**

Where the homepage slices upcoming events for the cards, sort Rotaract-first while preserving date order within each group:

```ts
  // Our own events fill the slots first; partner events top up the remainder,
  // so the section stops looking empty without a district conference
  // outranking our own service work.
  const homepageEvents = [...upcomingEvents]
    .sort((a, b) => {
      const aOurs = resolveHost(a) === 'rotaract' ? 0 : 1;
      const bOurs = resolveHost(b) === 'rotaract' ? 0 : 1;
      if (aOurs !== bOurs) return aOurs - bOurs;
      return a.date.localeCompare(b.date);
    })
    .slice(0, 3);
```

Use `homepageEvents` in the `.map()` that renders the cards. Import `resolveHost` from `@/lib/utils/eventAudience`.

Note: the homepage already reads from `getPublicEvents()`, which filters `isPublic == true` — so only public events reach it. No audience work is needed here.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx jest && npm run build`

- [ ] **Step 3: Commit**

```bash
git add "app/(public)/page.tsx"
git commit -m "Homepage: fill upcoming slots with Rotaract events first"
```

---

### Task 9: Weekly digest — all audiences, capped partners, "see all" link

**Files:**
- Modify: `lib/services/weeklyEventDigest.ts` (tunables ~line 33, row building ~line 187-297, template call ~line 348)
- Modify: `lib/email/templates.ts` (`DigestEventRow` ~line 1082, `weeklyEventDigestEmail` ~line 1211)
- Create: `__tests__/lib/weeklyEventDigestPartners.test.ts`

**Interfaces:**
- Consumes: `resolveHost` from Task 1; `SITE.url` from `@/lib/constants`.
- Produces: `splitDigestRows(rows, limit)` → `{ ours, partners, partnerTotal }`.

Recipients are board members only (`BOARD_ROLES` + opt-in, `weeklyEventDigest.ts:300-317`), so **all three audience levels are included** — board-only events are exactly what this audience needs.

- [ ] **Step 1: Write the failing test**

`__tests__/lib/weeklyEventDigestPartners.test.ts`:

```ts
import { splitDigestRows } from '@/lib/services/weeklyEventDigest';

const row = (id: string, host?: string) => ({ id, host, title: id, slug: id }) as any;

describe('splitDigestRows', () => {
  it('keeps all Rotaract events and caps partners at the limit', () => {
    const rows = [
      row('ours-1', 'rotaract'), row('ours-2', 'rotaract'), row('ours-3'),
      row('p1', 'community'), row('p2', 'rotary'), row('p3', 'community'), row('p4', 'rotary'),
    ];
    const { ours, partners, partnerTotal } = splitDigestRows(rows, 3);
    expect(ours.map((r) => r.id)).toEqual(['ours-1', 'ours-2', 'ours-3']);
    expect(partners.map((r) => r.id)).toEqual(['p1', 'p2', 'p3']);
    expect(partnerTotal).toBe(4);
  });

  it('treats a row with no host as ours', () => {
    const { ours, partnerTotal } = splitDigestRows([row('legacy')], 3);
    expect(ours).toHaveLength(1);
    expect(partnerTotal).toBe(0);
  });

  it('reports a partnerTotal at or below the limit so the link can be omitted', () => {
    const { partners, partnerTotal } = splitDigestRows([row('p1', 'rotary')], 3);
    expect(partners).toHaveLength(1);
    expect(partnerTotal).toBe(1);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx jest __tests__/lib/weeklyEventDigestPartners.test.ts`
Expected: FAIL — `splitDigestRows is not a function`

- [ ] **Step 3: Implement the splitter**

In `lib/services/weeklyEventDigest.ts`, beside the tunables at line 33:

```ts
/** How many non-Rotaract events the digest lists before linking to the rest. */
export const DIGEST_PARTNER_LIMIT = 3;
```

and export:

```ts
/**
 * Split digest rows into ours and partners', capping the latter.
 *
 * Uncapped, a district conference season turns the digest into a listings
 * dump. `partnerTotal` is the uncapped count so the email can say "See all 9"
 * — and omit the link entirely when nothing is hidden.
 */
export function splitDigestRows<T extends { host?: string }>(rows: T[], limit: number) {
  const ours = rows.filter((r) => (r.host ?? 'rotaract') === 'rotaract');
  const allPartners = rows.filter((r) => (r.host ?? 'rotaract') !== 'rotaract');
  return { ours, partners: allPartners.slice(0, limit), partnerTotal: allPartners.length };
}
```

- [ ] **Step 4: Run the test**

Run: `npx jest __tests__/lib/weeklyEventDigestPartners.test.ts`
Expected: PASS

- [ ] **Step 5: Carry `host` onto the digest rows**

In `lib/email/templates.ts`, add to `DigestEventRow` (after `location?: string;`):

```ts
  /** Event host, so the digest can separate ours from partners'. */
  host?: string;
  /** Hosting organisation, shown on partner rows. */
  hostName?: string;
```

In `weeklyEventDigest.ts`, where each `DigestEventRow` is built (around line 250), add `host: ev.host ?? 'rotaract', hostName: ev.hostName,`.

Remove the `.where('isPublic','==',true)` clause if present on the digest's events query at line 159-165 — the digest goes to board members and must see members-only and board-only events. (If no such clause exists, no change; note it in the commit.)

- [ ] **Step 6: Render the section and the link**

In `weeklyEventDigestEmail` (`templates.ts:1211`), extend the params:

```ts
  partners?: DigestEventRow[];
  partnerTotal?: number;
  partnersUrl?: string;
```

and after `upcomingHtml`, add:

```ts
  const partnerRows = params.partners ?? [];
  const partnerTotal = params.partnerTotal ?? 0;
  const seeAll = partnerTotal > partnerRows.length && params.partnersUrl
    ? `<p style="margin:12px 0 0;"><a href="${params.partnersUrl}" style="color:${CRIMSON};font-weight:600;">See all ${partnerTotal} community &amp; partner events →</a></p>`
    : '';
  const partnersHtml = partnerRows.length > 0
    ? `${divider()}<p style="font-size:15px;font-weight:700;margin:0 0 12px;">Also happening in the Rotary &amp; NYC community</p>${partnerRows.map(digestEventCard).join('')}${seeAll}`
    : '';
```

Insert `${partnersHtml}` into the HTML body after the upcoming section, and append the plain-text equivalent to the `text` output.

- [ ] **Step 7: Wire it at the call site**

In `weeklyEventDigest.ts` at line 348:

```ts
  const { ours, partners, partnerTotal } = splitDigestRows(upcoming, DIGEST_PARTNER_LIMIT);
```

and pass to `weeklyEventDigestEmail`: `upcoming: ours, partners, partnerTotal,` plus

```ts
      // The portal, not /events: the digest can list members-only and
      // board-only events, and the public page renders neither.
      partnersUrl: `${SITE.url}/portal/events?host=community`,
```

Import `SITE` from `@/lib/constants` if not already imported.

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc silent, full suite green including the existing `__tests__/api/cron/weekly-event-digest.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add lib/services/weeklyEventDigest.ts lib/email/templates.ts __tests__/lib/weeklyEventDigestPartners.test.ts
git commit -m "Digest: separate partner events, cap at three, link to the rest"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Full suite and build**

Run: `npx tsc --noEmit && npx jest && npm run build`
Expected: tsc silent, 558 + ~30 new tests passing, build clean.

- [ ] **Step 2: Verify the fail-closed guarantee against the real API**

Create a `community` event with visibility "Members only" and `status: published` via the portal. Then, signed out:

Run: `curl -s https://<preview-url>/api/events | grep -c "<that event's slug>"`
Expected: `0`

This is the single most important check in the plan. If the slug appears, stop and fix before merging.

- [ ] **Step 3: Verify the portal query did not break**

Signed in as an ordinary member, load `/portal/events`.
Expected: events render. An empty list or a console `permission-denied` means the rule and the query constraints disagree — recheck Task 3 against Task 2's backfill.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin feature/partner-events-and-audience
gh pr create --base main --title "Partner events and event audience"
```

---

## Self-Review Notes

- **Spec coverage:** §1 → Tasks 1, 2; §2 → Task 3; §3 → Task 5; §4 → Task 6; §5 → Task 8; §6 → Task 7; §7 → Task 9; §8 → Task 4. Safety/verification → Task 10.
- **Signature change:** `usePortalEvents()` → `usePortalEvents(viewer)` in Task 3; its only caller is updated in Task 7. Tasks 3 and 7 must land together or the portal will not compile — if executing task-by-task, do not stop between them.
- **Naming consistency:** `resolveHost`, `resolveAudience`, `resolveCountsForServiceHours`, `canSeeEvent`, `visibleAudiences`, `isExternallyRegistered`, `HOST_LABELS`, `splitDigestRows`, `DIGEST_PARTNER_LIMIT` — used identically in every task.
