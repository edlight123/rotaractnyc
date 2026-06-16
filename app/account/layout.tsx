'use client';

import { AuthProvider } from '@/lib/firebase/auth';

/**
 * Public supporter hub (`/account`).
 *
 * Shares the same Firebase session as the member portal but is available to
 * every signed-in user (supporter or member). Member-only tooling stays under
 * `/portal`. This layout intentionally renders its own lightweight chrome via
 * the page components rather than the members-only PortalShell.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
