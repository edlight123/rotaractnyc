'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

// ─── Types ─────────────────────────────────────────────────────────────────

type ExportType = 'members' | 'dues' | 'rsvps' | 'attendance' | 'service-hours';

interface ExportCard {
  type: ExportType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

// ─── Icons (Heroicons outline) ─────────────────────────────────────────────

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

// ─── Export cards config ───────────────────────────────────────────────────

const EXPORTS: ExportCard[] = [
  {
    type: 'members',
    title: 'Member Directory',
    description: 'Export all members with contact info and status',
    icon: <UsersIcon />,
  },
  {
    type: 'dues',
    title: 'Dues Report',
    description: 'Export dues payment status for all members',
    icon: <CreditCardIcon />,
  },
  {
    type: 'rsvps',
    title: 'RSVP Report',
    description: 'Export event RSVPs and attendance',
    icon: <ClipboardIcon />,
  },
  {
    type: 'attendance',
    title: 'Attendance Report',
    description: 'Export checked-in attendance records',
    icon: <CheckCircleIcon />,
  },
  {
    type: 'service-hours',
    title: 'Service Hours',
    description: 'Export service hour logs by member',
    icon: <ClockIcon />,
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user, member } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<ExportType | null>(null);

  // ── Access control ──
  if (!user || !member) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!ADMIN_ROLES.includes(member.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
        <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-red-600 dark:text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          You don&apos;t have permission to view reports. This page is restricted to board members, the president, and the treasurer.
        </p>
      </div>
    );
  }

  // ── Download handler ──
  async function handleDownload(type: ExportType) {
    setDownloading(type);
    try {
      const res = await fetch(`/api/portal/exports?type=${type}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast('Report downloaded!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to download report', 'error');
    } finally {
      setDownloading(null);
    }
  }

  // ── Render ──
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports &amp; Exports</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Download CSV reports for club records, compliance, and analysis.
        </p>
      </div>

      {/* Export cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((card) => (
          <div
            key={card.type}
            className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              {/* Icon */}
              <div className="inline-flex items-center justify-center rounded-xl bg-cranberry/10 dark:bg-cranberry/20 text-cranberry p-3">
                {card.icon}
              </div>

              {/* Title & description */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {card.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {card.description}
              </p>
            </div>

            {/* Download button */}
            <div className="mt-5">
              <Button
                variant="primary"
                size="sm"
                loading={downloading === card.type}
                disabled={downloading !== null}
                onClick={() => handleDownload(card.type)}
                className="w-full"
              >
                {downloading === card.type ? 'Downloading…' : 'Download CSV'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
