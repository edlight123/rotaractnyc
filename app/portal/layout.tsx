'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/firebase/auth';
import PortalShell from '@/components/portal/PortalShell';

// Pages that render their own chrome (no sidebar / auth gate)
const SHELL_EXCLUDED = ['/portal/login', '/portal/onboarding/success'];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skipShell = SHELL_EXCLUDED.some((p) => pathname === p);

  return (
    <AuthProvider>
      {skipShell ? children : <PortalShell>{children}</PortalShell>}
    </AuthProvider>
  );
}
