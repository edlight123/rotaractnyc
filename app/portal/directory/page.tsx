'use client';

import { useState, useMemo, useEffect } from 'react';
import { Upload, Plus, Users } from 'lucide-react';
import { useAllMembers } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/firebase/auth';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Tabs from '@/components/ui/Tabs';
import EmptyState from '@/components/ui/EmptyState';
import { CardGridSkeleton, ListSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import AddMemberModal from '@/components/portal/AddMemberModal';
import ImportMembersModal from '@/components/portal/ImportMembersModal';
import MemberCard from '@/components/portal/MemberCard';
import PendingApprovals from '@/components/portal/PendingApprovals';
import PageHeader from '@/components/portal/PageHeader';
import PageContainer from '@/components/portal/PageContainer';
import FilterBar, { FilterSelect, FilterChip, FilterChipRow } from '@/components/portal/FilterBar';
import DataView, { ViewToggle, type ViewMode } from '@/components/portal/DataView';
import type { Member } from '@/types';

const roleColors: Record<string, 'cranberry' | 'gold' | 'azure' | 'gray'> = {
  president: 'cranberry',
  treasurer: 'gold',
  board: 'azure',
  member: 'gray',
};

type DirectoryTab = 'active' | 'alumni' | 'all';
type SortKey = 'name' | 'recent' | 'committee';

const ROLE_FILTERS = [
  { value: 'all', label: 'All roles' },
  { value: 'president', label: 'President' },
  { value: 'board', label: 'Board' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'member', label: 'Members' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'recent', label: 'Recently joined' },
  { value: 'committee', label: 'Committee' },
];

/** Extract a 4-digit year from an ISO date string or return null. */
function yearFromDate(date: string | undefined | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
}

/** For alumni: prefer alumniSince year, fall back to joinedAt year. */
function alumniYear(m: { alumniSince?: string; joinedAt?: string }): number | null {
  return yearFromDate(m.alumniSince) ?? yearFromDate(m.joinedAt);
}

export default function DirectoryPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<DirectoryTab>('active');
  const [committeeFilter, setCommitteeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [alumniYearFilter, setAlumniYearFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { member: currentMember } = useAuth();
  const { data: allMembers, loading } = useAllMembers();
  const { toast } = useToast();

  const isAdmin = !!currentMember && ['president', 'board', 'treasurer'].includes(currentMember.role);
  const isPresident = currentMember?.role === 'president';
  const [busyId, setBusyId] = useState<string | null>(null);

  const allList = (allMembers || []) as Member[];
  const activeList = useMemo(() => allList.filter((m) => m.status === 'active'), [allList]);
  const alumniList = useMemo(() => allList.filter((m) => m.status === 'alumni'), [allList]);
  const pendingList = useMemo(() => allList.filter((m) => m.status === 'pending'), [allList]);

  // Detect duplicate emails so admins can spot orphan invited docs
  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>();
    allList.forEach((m) => {
      const e = (m.email || '').toLowerCase();
      if (e) counts.set(e, (counts.get(e) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, n]) => n > 1).map(([e]) => e));
  }, [allList]);

  // Unique committees (for the committee filter dropdown)
  const committeeOptions = useMemo(() => {
    const set = new Set<string>();
    allList.forEach((m) => {
      if (m.committee?.trim()) set.add(m.committee.trim());
    });
    return [
      { value: 'all', label: 'All committees' },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    ];
  }, [allList]);

  // Unique alumni years (descending) for the year dropdown
  const alumniYears = useMemo(() => {
    const years = new Set<number>();
    alumniList.forEach((m) => {
      const y = alumniYear(m);
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [alumniList]);

  const alumniYearOptions = useMemo(
    () => [
      { value: 'all', label: 'All years' },
      ...alumniYears.map((y) => ({ value: String(y), label: String(y) })),
    ],
    [alumniYears],
  );

  // Members visible for the current status tab (pending lives in the banner)
  const tabMembers = useMemo(() => {
    if (activeTab === 'active') return activeList;
    if (activeTab === 'alumni') return alumniList;
    return allList.filter((m) => m.status !== 'pending');
  }, [activeTab, activeList, alumniList, allList]);

  // Apply filters → search → sort
  const filtered = useMemo(() => {
    let list = tabMembers;

    if (activeTab === 'alumni' && alumniYearFilter !== 'all') {
      const yr = Number(alumniYearFilter);
      list = list.filter((m) => alumniYear(m) === yr);
    }
    if (committeeFilter !== 'all') {
      list = list.filter((m) => (m.committee || '').trim() === committeeFilter);
    }
    if (roleFilter !== 'all') {
      list = list.filter((m) => m.role === roleFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.displayName?.toLowerCase().includes(q) ||
          m.committee?.toLowerCase().includes(q) ||
          m.firstName?.toLowerCase().includes(q) ||
          m.lastName?.toLowerCase().includes(q) ||
          m.occupation?.toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    if (sort === 'name') {
      sorted.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
    } else if (sort === 'recent') {
      sorted.sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime());
    } else if (sort === 'committee') {
      sorted.sort(
        (a, b) =>
          (a.committee || '~').localeCompare(b.committee || '~') ||
          (a.displayName || '').localeCompare(b.displayName || ''),
      );
    }
    return sorted;
  }, [tabMembers, search, activeTab, alumniYearFilter, committeeFilter, roleFilter, sort]);

  const tabs = [
    { id: 'active', label: 'Active', count: activeList.length },
    { id: 'alumni', label: 'Alumni', count: alumniList.length },
    { id: 'all', label: 'All', count: allList.filter((m) => m.status !== 'pending').length },
  ];

  const hasActiveFilters =
    committeeFilter !== 'all' ||
    roleFilter !== 'all' ||
    (activeTab === 'alumni' && alumniYearFilter !== 'all') ||
    !!search;

  function clearAllFilters() {
    setCommitteeFilter('all');
    setRoleFilter('all');
    setAlumniYearFilter('all');
    setSearch('');
  }

  // `/` keyboard shortcut → focus search
  const searchId = 'directory-search';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      document.getElementById(searchId)?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Admin actions ─────────────────────────────────────────────────────
  async function approveMember(m: Member) {
    if (busyId) return;
    setBusyId(m.id);
    try {
      const res = await fetch('/api/portal/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: m.id, status: 'active' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to approve member');
      }
      toast(`${m.displayName || m.firstName || 'Member'} approved`, 'success');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast(err?.message || 'Failed to approve member', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMember(m: Member) {
    if (busyId) return;
    if (
      !confirm(
        `Delete ${m.displayName || m.email || 'this member'}? This permanently removes their member record.`,
      )
    ) {
      return;
    }
    setBusyId(m.id);
    try {
      const res = await fetch('/api/portal/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: m.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete member');
      }
      toast(`${m.displayName || 'Member'} deleted`, 'success');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast(err?.message || 'Failed to delete member', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const views: ViewMode[] = ['grid', 'list', 'table'];
  const skeleton =
    viewMode === 'grid' ? (
      <CardGridSkeleton count={6} />
    ) : viewMode === 'list' ? (
      <ListSkeleton rows={6} />
    ) : (
      <TableSkeleton rows={6} cols={4} />
    );

  const empty = (
    <EmptyState
      icon={<Users className="w-7 h-7" />}
      title="No members found"
      description={
        hasActiveFilters ? 'Try adjusting your search or filters.' : 'No members in this category yet.'
      }
      action={
        hasActiveFilters ? (
          <Button variant="secondary" size="sm" onClick={clearAllFilters}>
            Clear filters
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <>
      <PageContainer width="default">
        <PageHeader
          title="Member Directory"
          subtitle="Connect with fellow leaders and change-makers in the NYC community."
          actions={
            isAdmin && (
              <>
                <Button variant="outline" onClick={() => setShowImportModal(true)}>
                  <Upload className="w-4 h-4 -ml-0.5" />
                  Import CSV
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 -ml-0.5" />
                  Add Member
                </Button>
              </>
            )
          }
        />

        {/* Admin-only pinned pending-approvals banner */}
        {isAdmin && (
          <PendingApprovals
            members={pendingList}
            onApprove={approveMember}
            onReject={deleteMember}
            canReject={isPresident}
            busyId={busyId}
            duplicateEmails={duplicateEmails}
          />
        )}

        {/* Toolbar */}
        <div className="space-y-3">
          <FilterBar trailing={<ViewToggle value={viewMode} onChange={setViewMode} views={views} />}>
            <SearchInput
              id={searchId}
              value={search}
              onChange={setSearch}
              placeholder="Search members…  (press /)"
              className="w-full sm:max-w-xs"
            />
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(id) => {
                setActiveTab(id as DirectoryTab);
                setAlumniYearFilter('all');
              }}
            />
            <FilterSelect
              label="Filter by committee"
              value={committeeFilter}
              onChange={setCommitteeFilter}
              options={committeeOptions}
            />
            <FilterSelect
              label="Filter by role"
              value={roleFilter}
              onChange={setRoleFilter}
              options={ROLE_FILTERS}
            />
            {activeTab === 'alumni' && alumniYears.length > 0 && (
              <FilterSelect
                label="Filter alumni by year"
                value={alumniYearFilter}
                onChange={setAlumniYearFilter}
                options={alumniYearOptions}
              />
            )}
            <FilterSelect
              label="Sort members"
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORT_OPTIONS}
            />
          </FilterBar>

          {hasActiveFilters && (
            <FilterChipRow onClearAll={clearAllFilters}>
              {search && <FilterChip onRemove={() => setSearch('')}>&ldquo;{search}&rdquo;</FilterChip>}
              {committeeFilter !== 'all' && (
                <FilterChip onRemove={() => setCommitteeFilter('all')}>
                  Committee · {committeeFilter}
                </FilterChip>
              )}
              {roleFilter !== 'all' && (
                <FilterChip onRemove={() => setRoleFilter('all')}>
                  Role · {ROLE_FILTERS.find((r) => r.value === roleFilter)?.label}
                </FilterChip>
              )}
              {activeTab === 'alumni' && alumniYearFilter !== 'all' && (
                <FilterChip onRemove={() => setAlumniYearFilter('all')}>Year · {alumniYearFilter}</FilterChip>
              )}
            </FilterChipRow>
          )}
        </div>

        {/* Content */}
        <DataView
          loading={loading}
          isEmpty={filtered.length === 0}
          skeleton={skeleton}
          empty={empty}
          count={filtered.length}
          itemLabel="member"
        >
          {viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  viewerRole={currentMember?.role}
                  onMessage={() => (window.location.href = `/portal/messages?to=${m.id}`)}
                />
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {filtered.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  viewerRole={currentMember?.role}
                  variant="list"
                  onMessage={() => (window.location.href = `/portal/messages?to=${m.id}`)}
                />
              ))}
            </div>
          ) : (
            /* Table view */
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Member</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Committee</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden lg:table-cell">Occupation</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.map((m) => {
                      const isDup = duplicateEmails.has((m.email || '').toLowerCase());
                      return (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar src={m.photoURL} alt={m.displayName} size="sm" />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5 flex-wrap">
                                  {m.displayName}
                                  {m.status === 'alumni' && <Badge variant="gold">Alumni</Badge>}
                                  {m.status === 'inactive' && <Badge variant="gray">Inactive</Badge>}
                                  {isAdmin && isDup && <Badge variant="red">Duplicate email</Badge>}
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
                            <div className="flex justify-end gap-2 flex-wrap">
                              {isPresident && (
                                <Button size="sm" variant="outline" onClick={() => deleteMember(m)} disabled={busyId === m.id}>
                                  Delete
                                </Button>
                              )}
                              {m.linkedIn && (
                                <a href={m.linkedIn} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="ghost">LinkedIn</Button>
                                </a>
                              )}
                              <a href={`/portal/messages?to=${m.id}`}>
                                <Button size="sm" variant="outline">Message</Button>
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DataView>
      </PageContainer>

      {/* Modals must live outside page-enter (transform traps position:fixed). */}
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
