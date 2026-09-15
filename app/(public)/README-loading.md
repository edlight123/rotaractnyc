# Why there is no `loading.tsx` in this route group

A `loading.tsx` creates an implicit Suspense boundary, which makes Next.js
**stream** the response: the shell is flushed with `HTTP 200` before the page
component runs. By the time `notFound()` is called, the status line has
already been sent — so every unknown slug under `/events/[slug]`,
`/news/[slug]` and `/gallery/[slug]` returned **200 with the "Page Not Found"
body**. A soft 404: search engines index those URLs as real pages.

Verified 2026-09-15 against a production build and against live production:

    /events/made-up-xyz   → 200   (soft 404)
    /news/made-up-xyz     → 200   (soft 404)
    /gallery/made-up-xyz  → 200   (soft 404)
    /no-such-top-level    → 404   (correct — never reaches a page component)

Removing `app/loading.tsx` **and** `app/(public)/loading.tsx` restores a real
404. Removing only one is not enough; the remaining ancestor keeps the
streaming boundary alive.

Calling `notFound()` from `generateMetadata` instead does **not** help —
metadata streams too, and the status is still 200.

Public pages are static or ISR and render in milliseconds, so the skeleton
was rarely seen. `app/portal/loading.tsx` is kept: the portal is behind auth,
is data-heavy, and has no SEO exposure.

**Do not re-add a `loading.tsx` at or above this level** without first
checking that `/events/<unknown-slug>` still returns 404.
