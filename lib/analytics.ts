/**
 * Analytics stubs for Rotaract NYC.
 *
 * Primary analytics are provided by Vercel Analytics (<Analytics /> in root layout).
 * Google Analytics (gtag) was never fully integrated — no <Script> tag loads the
 * GA library — so the previous GA implementation was dead code.
 *
 * These no-op exports are kept so any future consumer can import them without
 * breaking. To re-enable GA, add the gtag <Script> to app/layout.tsx, set
 * NEXT_PUBLIC_GA_MEASUREMENT_ID, and restore the gtag calls below.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export function isAnalyticsEnabled(): boolean {
  return false;
}

/** Track a page view (no-op — Vercel Analytics covers this) */
export function trackPageView(_url: string): void {}

/** Track a custom event (no-op) */
export function trackEvent(
  _action: string,
  _params?: {
    category?: string;
    label?: string;
    value?: number;
    [key: string]: any;
  },
): void {}

// ── Predefined event stubs ──

export function trackContactFormSubmit(): void {}
export function trackMembershipInterest(): void {}
export function trackDonation(_amount: number): void {}
export function trackRSVP(_eventId: string): void {}
export function trackDuesPayment(_amount: number): void {}
export function trackSignIn(): void {}
export function trackSignOut(): void {}
