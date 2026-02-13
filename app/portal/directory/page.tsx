'use client';

import { useState } from 'react';
import { useMembers } from '@/hooks/useFirestore';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import type { Member } from '@/types';

const roleColors: Record<string, 'cranberry' | 'gold' | 'azure' | 'gray'> = {
  president: 'cranberry',
  treasurer: 'gold',
  board: 'azure',
  member: 'gray',
};

export default function DirectoryPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const { data: members, loading } = useMembers(activeTab === 'active');

  const filtered = (members as Member[]).filter(
    (m) =>
      m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      m.committee?.toLowerCase().includes(search.toLowerCase()) ||
      m.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      m.lastName?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Member Directory</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Find and connect with fellow Rotaractors.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or committee..." className="sm:max-w-xs" />
        <Tabs tabs={[{ id: 'active', label: 'Active' }, { id: 'alumni', label: 'Alumni' }]} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👥" title="No members found" description={search ? 'Try a different search term.' : 'No members in this category yet.'} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Card key={m.id} interactive padding="md">
              <div className="flex items-start gap-3">
                <Avatar src={m.photoURL} alt={m.displayName} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{m.displayName}</h3>
                  <Badge variant={roleColors[m.role] || 'gray'} className="mt-1">{m.role}</Badge>
                  {m.committee && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{m.committee}</p>}
                  {m.occupation && <p className="text-xs text-gray-400 mt-1">{m.occupation}</p>}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                {m.linkedIn && (
                  <a href={m.linkedIn} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" variant="ghost" className="w-full">LinkedIn</Button>
                  </a>
                )}
                <a href={`/portal/messages?to=${m.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">Message</Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
