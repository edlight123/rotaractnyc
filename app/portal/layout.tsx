'use client';

import { AuthProvider } from '@/lib/firebase/auth';
import PortalNav from './_components/PortalNav';
import DuesBanner from '@/components/portal/DuesBanner';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth';
import { useEffect } from 'react';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/portal/login';

  return (
    <AuthProvider>
      {isLoginPage ? children : <PortalShell>{children}</PortalShell>}
    </AuthProvider>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, userData, loading, signOut } = useAuth();

  // Avoid returning null during auth transitions; always render a useful UI.
  // Redirects are handled in effects to prevent blank screens.
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/portal/login';
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center antialiased text-[#141414] dark:text-white">
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center antialiased text-[#141414] dark:text-white px-6">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur p-6">
          <h1 className="text-xl font-bold">Sign in required</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Please sign in to access the member portal.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => (window.location.href = '/portal/login')}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const status = userData?.status;
  const isApproved = status === 'active';

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center antialiased text-[#141414] dark:text-white px-6">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-white/80 dark:bg-[#1e1e1e]/80 backdrop-blur p-6">
          <h1 className="text-xl font-bold">Awaiting approval</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Your portal account is pending member approval. An admin needs to approve your account before you can view member content.
          </p>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Signed in as: {user.email}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/portal/login';
              }}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
            >
              Sign out
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex flex-col antialiased text-[#141414] dark:text-white">
      <PortalNav />
      <div className="px-6 pt-6">
        <DuesBanner memberId={user.uid} />
      </div>
      {children}
    </div>
  );
}
