'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/firebase/auth';
import Spinner from '@/components/ui/Spinner';

// Dynamically import PDF downloader — uses canvas/node APIs
const PDFDownloader = dynamic(() => import('@/app/(public)/guide/PDFDownloader'), { ssr: false });

const ADMIN_ROLES = ['board', 'president', 'treasurer'];

/* ─── Data ─── */

const permissionsTable = [
  { feature: 'View portal & RSVP',           member: true,  board: true,  treasurer: true,  president: true },
  { feature: 'Create/edit events',            member: false, board: true,  treasurer: false, president: true },
  { feature: 'Manage members (approve/edit)', member: false, board: true,  treasurer: false, president: true },
  { feature: 'Manage dues & payments',        member: false, board: false, treasurer: true,  president: true },
  { feature: 'Review service hours',          member: false, board: true,  treasurer: true,  president: true },
  { feature: 'Create forms & surveys',        member: false, board: true,  treasurer: true,  president: true },
  { feature: 'Write articles',                member: false, board: true,  treasurer: true,  president: true },
  { feature: 'Send broadcasts',               member: false, board: true,  treasurer: true,  president: true },
  { feature: 'View analytics',                member: false, board: true,  treasurer: true,  president: true },
  { feature: 'Export reports',                 member: false, board: true,  treasurer: true,  president: true },
  { feature: 'Manage finance module',         member: false, board: false, treasurer: true,  president: true },
  { feature: 'Manage board page',             member: false, board: true,  treasurer: false, president: true },
  { feature: 'Manage media/gallery',          member: false, board: true,  treasurer: false, president: true },
  { feature: 'Site settings',                 member: false, board: true,  treasurer: false, president: true },
  { feature: 'Google Workspace',              member: false, board: true,  treasurer: false, president: true },
  { feature: 'Approve budgets/expenses',      member: false, board: false, treasurer: false, president: true },
];

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const sections: GuideSection[] = [
  {
    id: 'roles',
    title: 'Admin Roles & Permissions',
    icon: '🛡️',
    content: (
      <div className="space-y-4">
        <p>The portal uses <strong>role-based access control</strong>. Here&rsquo;s who can do what:</p>
        <div className="overflow-x-auto">
          <table className="guide-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="text-center">Member</th>
                <th className="text-center">Board</th>
                <th className="text-center">Treasurer</th>
                <th className="text-center">President</th>
              </tr>
            </thead>
            <tbody>
              {permissionsTable.map((row) => (
                <tr key={row.feature}>
                  <td className="font-medium">{row.feature}</td>
                  <td className="text-center">{row.member ? '✅' : '❌'}</td>
                  <td className="text-center">{row.board ? '✅' : '❌'}</td>
                  <td className="text-center">{row.treasurer ? '✅' : '❌'}</td>
                  <td className="text-center">{row.president ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Tip>Be careful when granting <strong>board</strong> or <strong>president</strong> roles — they provide significant admin access.</Tip>
      </div>
    ),
  },
  {
    id: 'members',
    title: 'Member Management',
    icon: '👥',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Directory</p>
        <Card title="Approving New Members">
          <ol className="list-decimal ml-5 space-y-1">
            <li>New sign-ups appear with a <span className="badge-amber">Pending</span> status</li>
            <li>Click on their profile to review</li>
            <li>Click <strong>&ldquo;Approve&rdquo;</strong> to activate full portal access</li>
          </ol>
        </Card>
        <Card title="Inviting Members">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Go to <strong>Portal → Directory</strong></li>
            <li>Click <strong>&ldquo;Add Member&rdquo;</strong> or <strong>&ldquo;Import&rdquo;</strong></li>
            <li>Enter their email & name — when they sign in with that Google account, they&rsquo;re auto-approved</li>
          </ol>
        </Card>
        <Card title="Editing Profiles">
          <p>Admins can change any member&rsquo;s: <strong>Role</strong>, <strong>Status</strong> (active/inactive/pending/alumni), <strong>Committee</strong>, <strong>Board Title</strong>, and <strong>Member Type</strong> (professional/student).</p>
        </Card>
      </div>
    ),
  },
  {
    id: 'events',
    title: 'Event Management',
    icon: '📅',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Events</p>
        <Card title="Creating an Event">
          <p>Click <strong>&ldquo;Create Event&rdquo;</strong> and fill in:</p>
          <div className="overflow-x-auto mt-2">
            <table className="guide-table text-sm">
              <thead><tr><th>Field</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td>Title, Date/Time</td><td>Event name and schedule</td></tr>
                <tr><td>Location & Address</td><td>Venue name + full address (enables map)</td></tr>
                <tr><td>Description</td><td>Rich text event details</td></tr>
                <tr><td>Type</td><td>Free, Paid, Service, or Hybrid</td></tr>
                <tr><td>Cover Image</td><td>Upload a banner image</td></tr>
                <tr><td>Capacity</td><td>Max attendees (blank = unlimited)</td></tr>
                <tr><td>Status</td><td>Draft, Published, or Cancelled</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Paid Events">
          <p>For paid events, also set <strong>Member Price</strong>, <strong>Guest Price</strong>, and optional <strong>Ticket Tiers</strong> (Early Bird, VIP, etc.). Payments go through Stripe.</p>
        </Card>
        <Card title="Event Check-In">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Open the event page on your phone</li>
            <li>A <strong>QR code</strong> is generated for the event</li>
            <li>Scan attendees&rsquo; QR codes to check them in</li>
            <li>Check-in timestamp is recorded automatically</li>
          </ol>
        </Card>
      </div>
    ),
  },
  {
    id: 'dues',
    title: 'Dues & Payment Management',
    icon: '💳',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Dues & Billing → <strong>Manage</strong> tab (treasurer / president)</p>
        <Card title="Creating a Dues Cycle">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Go to the <strong>Manage</strong> tab, click <strong>&ldquo;New Cycle&rdquo;</strong></li>
            <li>Enter cycle name (e.g., &ldquo;2025–2026&rdquo;), dates, professional ($90) and student ($70) amounts, and grace period</li>
            <li>Click <strong>Create</strong> — dues records are auto-generated for all active members</li>
          </ol>
        </Card>
        <Card title="Approving Offline Payments">
          <p>Members can pay via Zelle/Venmo/CashApp and upload proof. You&rsquo;ll see <span className="badge-amber">Pending Offline</span> — click <strong>&ldquo;Approve&rdquo;</strong> to confirm.</p>
        </Card>
        <Card title="Waiving Dues">
          <p>Find the member in the Manage table → click <strong>&ldquo;Waive&rdquo;</strong> for financial hardship or other reasons.</p>
        </Card>
        <Tip>The Manage tab shows real-time collection statistics: total collected, collection rate, and paid/unpaid/waived breakdown.</Tip>
      </div>
    ),
  },
  {
    id: 'service-hours',
    title: 'Service Hours Review',
    icon: '⏱️',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Service Hours → <strong>Review</strong> tab</p>
        <Card title="Approval Workflow">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Members submit hours after volunteering</li>
            <li>Pending hours appear in your <strong>Review</strong> tab</li>
            <li>Review: member name, event, hours claimed, description</li>
            <li>Click <strong>✅ Approve</strong> or <strong>❌ Reject</strong></li>
          </ol>
        </Card>
        <Tip>Review hours within a week of each event. Cross-reference with check-in records if hours seem unusual.</Tip>
      </div>
    ),
  },
  {
    id: 'forms',
    title: 'Forms & Surveys',
    icon: '📝',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Forms & Surveys</p>
        <Card title="Creating a Form">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Click <strong>&ldquo;New Form&rdquo;</strong></li>
            <li>Enter title, description, and click <strong>&ldquo;Create & Add Fields&rdquo;</strong></li>
            <li>Use the Form Builder to add fields</li>
          </ol>
        </Card>
        <Card title="12 Field Types">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {['Short Text', 'Long Text', 'Number', 'Email', 'Phone', 'Dropdown', 'Multiple Choice', 'Checkboxes', 'Date', 'Rating (⭐)', 'Linear Scale', 'Yes/No'].map(t => (
              <span key={t} className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t}</span>
            ))}
          </div>
        </Card>
        <Card title="Settings & Publishing">
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Require Login</strong> — only signed-in members can submit; auto-fills name/email</li>
            <li><strong>Accept Responses</strong> — toggle to open/close the form</li>
            <li><strong>Max Responses</strong> — auto-close after a limit</li>
            <li>Set status to <strong>Published</strong> to make the form live</li>
            <li>Share the URL: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">rotaractnyc.org/f/your-slug</code></li>
          </ul>
        </Card>
        <Card title="Viewing Responses">
          <p>Switch to the <strong>Responses</strong> tab to see all submissions in a sortable table. Export to CSV if needed.</p>
        </Card>
      </div>
    ),
  },
  {
    id: 'articles',
    title: 'Articles & Content',
    icon: '📰',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Articles</p>
        <Card title="Writing an Article">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Click <strong>&ldquo;New Article&rdquo;</strong></li>
            <li>Add a title, cover image, and category (Service, Leadership, International, Fellowship)</li>
            <li>Write content using the <strong>rich text editor</strong></li>
            <li>Save as <strong>Draft</strong> or click <strong>Publish</strong> to make it live on the public site</li>
          </ol>
        </Card>
        <Tip>Published articles appear on the public <strong>/news</strong> page and in the community feed.</Tip>
      </div>
    ),
  },
  {
    id: 'documents',
    title: 'Document Management',
    icon: '📁',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Documents</p>
        <Card title="Uploading Documents">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Click <strong>&ldquo;Upload&rdquo;</strong> and select a file (PDF, DOC, XLS, etc.)</li>
            <li>Choose a category: Meeting Minutes, Bylaws, Handbooks, Reports, or a custom folder</li>
            <li>Toggle <strong>&ldquo;Pin&rdquo;</strong> to keep important documents at the top</li>
          </ol>
        </Card>
      </div>
    ),
  },
  {
    id: 'committees',
    title: 'Committee Management',
    icon: '🏛️',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Committees</p>
        <Card title="Creating a Committee">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Click <strong>&ldquo;New Committee&rdquo;</strong></li>
            <li>Enter name, description, chair name, and meeting schedule</li>
            <li>Set max capacity (optional) and upload a cover image</li>
          </ol>
        </Card>
        <Tip>When a committee is full, new members are placed on a waitlist automatically.</Tip>
      </div>
    ),
  },
  {
    id: 'broadcasts',
    title: 'Email Broadcasts',
    icon: '📡',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Admin → Broadcasts</p>
        <Card title="Sending a Broadcast">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Click <strong>&ldquo;New Broadcast&rdquo;</strong></li>
            <li>Select audience: <strong>All Members</strong>, <strong>Active Only</strong>, or <strong>Specific Committee</strong></li>
            <li>Enter subject and compose the email body</li>
            <li>Preview, then click <strong>&ldquo;Send&rdquo;</strong></li>
          </ol>
        </Card>
        <Tip>Broadcasts are sent via the configured email provider. Always preview before sending!</Tip>
      </div>
    ),
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    icon: '📊',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Admin → Analytics / Reports</p>
        <Card title="Analytics Dashboard">
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Member Growth</strong> — sign-ups over time</li>
            <li><strong>Event Attendance</strong> — RSVPs vs check-ins</li>
            <li><strong>Dues Collection</strong> — paid/unpaid/waived breakdown</li>
            <li><strong>Service Hours</strong> — total hours and leaderboard</li>
            <li><strong>Engagement Score</strong> — composite member activity</li>
          </ul>
        </Card>
        <Card title="Reports & Export">
          <p>The <strong>Reports</strong> page lets you generate and download CSV exports: membership roster, event attendance, dues status, service hours, and more.</p>
        </Card>
      </div>
    ),
  },
  {
    id: 'site-settings',
    title: 'Site Settings',
    icon: '⚙️',
    content: (
      <div className="space-y-4">
        <p><strong>Path:</strong> Portal → Admin → Site Settings</p>
        <Card title="What You Can Configure">
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Club Info</strong> — name, tagline, description, address, phone, email</li>
            <li><strong>Social Links</strong> — Instagram, LinkedIn, Facebook, etc.</li>
            <li><strong>Homepage Content</strong> — hero slides, impact statistics, partner logos</li>
            <li><strong>SEO</strong> — meta titles, descriptions, OG images</li>
          </ul>
        </Card>
      </div>
    ),
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & Best Practices',
    icon: '🔧',
    content: (
      <div className="space-y-4">
        <Card title="Common Issues">
          <div className="overflow-x-auto">
            <table className="guide-table text-sm">
              <thead><tr><th>Problem</th><th>Solution</th></tr></thead>
              <tbody>
                <tr><td>Member can&rsquo;t sign in</td><td>Ensure they&rsquo;re using the correct Google account. Check their status isn&rsquo;t &ldquo;Inactive.&rdquo;</td></tr>
                <tr><td>Events not showing on public site</td><td>Check the event&rsquo;s <strong>Public</strong> toggle and <strong>Status</strong> (must be &ldquo;Published&rdquo;).</td></tr>
                <tr><td>Dues amounts wrong</td><td>Edit the dues cycle and update the professional/student amounts.</td></tr>
                <tr><td>Form link broken</td><td>Check the form slug and make sure it&rsquo;s <strong>Published</strong> with responses enabled.</td></tr>
                <tr><td>Images not uploading</td><td>Max file size is 5 MB. Try a smaller file or a different format (JPG, PNG, WebP).</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Best Practices">
          <ul className="list-disc ml-5 space-y-1">
            <li>Review pending members and service hours <strong>at least weekly</strong></li>
            <li>Keep events <strong>published</strong> promptly — don&rsquo;t leave them in draft</li>
            <li>Use <strong>broadcasts</strong> sparingly — only for important club-wide updates</li>
            <li>Archive old forms after closing them</li>
            <li>Back up reports by exporting CSV files <strong>monthly</strong></li>
            <li>Update site settings when board members change</li>
          </ul>
        </Card>
      </div>
    ),
  },
];

/* ─── Page ─── */

export default function AdminGuidePage() {
  const { member, loading } = useAuth();
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [showPDF, setShowPDF] = useState(false);
  const hasAccess = member && ADMIN_ROLES.includes(member.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400">You need board, treasurer, or president access to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
          🛡️ Admin Guide
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Everything board members need to know about managing the Rotaract NYC portal.
        </p>
        <div className="mt-3 print:hidden">
          {!showPDF ? (
            <button
              onClick={() => setShowPDF(true)}
              className="btn-sm btn-secondary flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
          ) : (
            <PDFDownloader guide="admin" />
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar — Table of Contents */}
        <nav className="lg:w-64 shrink-0 print:hidden">
          <div className="lg:sticky lg:top-24 space-y-1">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Sections
            </p>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === s.id
                    ? 'bg-cranberry-50 text-cranberry-700 dark:bg-cranberry-900/30 dark:text-cranberry-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="mr-2">{s.icon}</span>
                {s.title}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={`section-${s.id}`} className="scroll-mt-24">
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>{s.icon}</span> {s.title}
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {s.content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-Components ─── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
      <h3 className="font-display font-bold text-gray-900 dark:text-white text-sm mb-2">{title}</h3>
      <div className="text-sm text-gray-600 dark:text-gray-400">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
      <span className="shrink-0">💡</span>
      <div>{children}</div>
    </div>
  );
}
