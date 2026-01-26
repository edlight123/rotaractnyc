'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';

export default function FixPermissionsPage() {
  const { userData, loading } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/portal/admin/sync-claims', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync claims');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#141414] dark:text-white mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Please sign in to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#141414] dark:text-white mb-2">
          Fix Permission Errors
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Sync user roles to Firebase custom claims to fix "Missing or insufficient permissions" errors
        </p>
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-8 border border-gray-100 dark:border-[#2a2a2a] mb-6">
        <div className="flex items-start gap-4 mb-6">
          <span className="material-symbols-outlined text-4xl text-amber-500">
            warning
          </span>
          <div>
            <h2 className="text-lg font-bold text-[#141414] dark:text-white mb-2">
              What does this fix?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              If you're seeing "Missing or insufficient permissions" errors when trying to access events, posts, or other content, it's likely because your role hasn't been synced to Firebase custom claims.
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              This tool will sync all user roles from Firestore to Firebase Auth custom claims.
            </p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Syncing...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">sync</span>
              Sync All User Claims
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">
              error
            </span>
            <div>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-1">
                Error
              </h3>
              <p className="text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400">
              check_circle
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-1">
                Sync Complete!
              </h3>
              <p className="text-green-700 dark:text-green-400 mb-4">
                {result.summary.synced + result.summary.alreadySynced} of {result.summary.total} users synced successfully.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total</p>
                  <p className="text-2xl font-bold text-[#141414] dark:text-white">
                    {result.summary.total}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Synced</p>
                  <p className="text-2xl font-bold text-green-600">
                    {result.summary.synced}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Already Synced</p>
                  <p className="text-2xl font-bold text-cyan-600">
                    {result.summary.alreadySynced}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Errors</p>
                  <p className="text-2xl font-bold text-red-600">
                    {result.summary.errors}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">
                  ⚠️ Important: Sign Out Required
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {result.warning || 'Users must sign out and sign back in for changes to take effect.'}
                </p>
                <button
                  onClick={() => {
                    if (confirm('Sign out now? You will be redirected to the login page.')) {
                      window.location.href = '/admin/login';
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-sm"
                >
                  Sign Out Now
                </button>
              </div>
            </div>
          </div>

          {result.results && result.results.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-bold text-sm text-gray-700 dark:text-gray-300 hover:text-primary">
                View detailed results ({result.results.length} users)
              </summary>
              <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                {result.results.map((r: any, i: number) => (
                  <div
                    key={i}
                    className={`text-sm p-3 rounded-lg ${
                      r.status === 'synced'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : r.status === 'already-synced'
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400'
                        : r.status === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <div className="font-bold">{r.email || r.uid}</div>
                    <div className="text-xs">
                      {r.role && `Role: ${r.role} • `}
                      {r.message}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </main>
  );
}
