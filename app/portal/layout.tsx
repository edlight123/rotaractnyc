'use client';

import { AuthProvider } from '@/lib/firebase/auth';
import PortalNav from './_components/PortalNav';
import { usePathname } from 'next/navigation';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/portal/login';

  return (
    <AuthProvider>
      {isLoginPage ? (
        children
      ) : (
        <div className="min-h-screen bg-gray-50">
          <PortalNav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      )}
    </AuthProvider>
  );
}
