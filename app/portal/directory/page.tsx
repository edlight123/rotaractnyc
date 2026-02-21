'use client';

import { useState, useMemo } from 'react';
import { useMembers } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/firebase/auth';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import AddMemberModal from '@/components/portal/AddMemberModal';
import ImportMembersModal from '@/components/portal/ImportMembersModal';
import MemberCard from '@/components/portal/MemberCard';
import type { Member } from '@/types';

const roleColors: Record<string, 'cranberry' | 'gold' | 'azure' | 'gray'> = {
  president: 'cranberry',
  treasurer: 'gold',
  board: 'azure',
  member: 'gray',
};

type ViewMode = 'grid' | 'table';

export default function DirectoryPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { member: currentMember } = useAuth();
  const { data: activeMembers, loading: loadingActive } = useMembers(true);
  const { data: alumniMembers, loading: loadingAlumni } = useMembers(false);

  const isAdmin = currentMember && ['president', 'board', 'treasurer'].includes(currentMember.role);

  const members = activeTab === 'active' ? activeMembers : alumniMembers;
  const loading = activeTab === 'active' ? loadingActive : loadingAlumni;

  const filtered = useMemo(
    () =>
      ((members || []) as Member[]).filter(
        (m) =>
          m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
          m.committee?.toLowerCase().includes(search.toLowerCase()) ||
          m.firstName?.toLowerCase().includes(search.toLowerCase()) ||
          m.lastName?.toLowerCase().includes(search.toLowerCase()) ||
          m.occupation?.toLowerCase().includes(search.toLowerCase()),
      ),
    [members, search],
  );

  const tabs = [
    { id: 'active', label: 'Active', count: ((activeMembers || []) as Member[]).length },
    { id: 'alumni', label: 'Alumni', count: ((alumniMembers || []) as Member[]).length },
  ];

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-8 page-enter">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Member Directory
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Find and connect with fellow Rotaractors.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <svg className="w-4 h-4 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Import CSV
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <svg className="w-4 h-4 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </Button>
          </div>
        )}
      </div>

      {/* ── Toolbar: search, tabs, view toggle ── */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, committee, or occupation..."
          className="w-full sm:max-w-xs"
        />
        <div className="flex items-center gap-3 overflow-x-auto">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          <div className="ml-auto flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Grid view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Table view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          title="No members found"
          description={
            search ? 'Try a different search term.' : 'No members in this category yet.'
          }
        />
      ) : viewMode === 'grid' ? (
        /* ── Grid view ── */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              viewerRole={currentMember?.role}
              onMessage={() => (window.location.href = `/portal/messages?to=${m.id}`)}
            />
          ))}
        </div>
      ) : (
        /* ── Table view ── */
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
                    Member
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">
                    Committee
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                    Occupation
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={m.photoURL} alt={m.displayName} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {m.displayName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={roleColors[m.role] || 'gray'}>{m.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {m.committee || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {m.occupation || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {m.linkedIn && (
                          <a href={m.linkedIn} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost">
                              LinkedIn
                            </Button>
                          </a>
                        )}
                        <a href={`/portal/messages?to=${m.id}`}>
                          <Button size="sm" variant="outline">
                            Message
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            Showing {filtered.length} member{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

    </div>

    {/* AddMemberModal must live outside page-enter: that div retains transform:translateY(0)
        via fill-mode:both which creates a CSS containing block that traps position:fixed. */}
    {isAdmin && (
      <AddMemberModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    )}
    {isAdmin && (
      <ImportMembersModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    )}
    </>
  );
}
