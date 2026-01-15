'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { User } from '@/types/portal';

export default function DirectoryPage() {
  const { loading } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterCommittee, setFilterCommittee] = useState<string>('all');
  const [committees, setCommittees] = useState<string[]>([]);

  useEffect(() => {
    if (!loading) {
      loadMembers();
    }
  }, [loading]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, filterRole, filterCommittee]);

  const loadMembers = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('status', '==', 'active'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(usersQuery);
      const membersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
      
      setMembers(membersData);
      
      // Extract unique committees
      const uniqueCommittees = Array.from(new Set(
        membersData
          .map(m => m.committee)
          .filter(c => c)
      )) as string[];
      setCommittees(uniqueCommittees.sort());
      
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.committee?.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(m => m.role === filterRole);
    }

    // Committee filter
    if (filterCommittee !== 'all') {
      filtered = filtered.filter(m => m.committee === filterCommittee);
    }

    setFilteredMembers(filtered);
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            Our Community
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            Connect with passionate leaders, creators, and changemakers shaping the future of NYC.
          </p>
        </div>
        
        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="MEMBER">Member</option>
            <option value="BOARD">Board</option>
            <option value="TREASURER">Treasurer</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            value={filterCommittee}
            onChange={(e) => setFilterCommittee(e.target.value)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
          >
            <option value="all">All Committees</option>
            {committees.map(committee => (
              <option key={committee} value={committee}>{committee}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-5 py-3 max-w-2xl focus-within:ring-2 focus-within:ring-primary focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-inner">
        <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 mr-3">search</span>
        <input
          type="text"
          placeholder="Search members by name, email, or committee..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none focus:ring-0 text-base w-full text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
        />
      </div>

      {/* Member Count */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Showing {filteredMembers.length} of {members.length} members
      </div>

      {/* Member Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {filteredMembers.map((member) => (
          <MemberCard key={member.uid} member={member} />
        ))}
        
        {/* Loading skeleton cards */}
        {loadingData && Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Empty State */}
      {!loadingData && filteredMembers.length === 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">group_off</span>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No members found</p>
          <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters</p>
        </div>
      )}
      </div>
    </main>
  );
}

// Member Card Component
function MemberCard({ member }: { member: User }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get member's interests/tags from committee
  const tags = member.committee ? [member.committee] : [];
  
  return (
    <div 
      className="group/card member-card relative bg-white dark:bg-surface-dark rounded-[1.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Image Container */}
      <div className="aspect-[4/5] w-full overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 z-10"></div>
        {member.photoURL ? (
          <div 
            className="w-full h-full bg-center bg-cover transition-transform duration-700 group-hover/card:scale-105"
            style={{ backgroundImage: `url('${member.photoURL}')` }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center transition-transform duration-700 group-hover/card:scale-105">
            <span className="text-6xl font-bold text-white">
              {member.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col grow relative z-20 -mt-12 mx-3 mb-3 bg-white dark:bg-[#233538] rounded-2xl shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {member.name}
            </h3>
            <p className="text-sm font-medium text-primary mt-1">
              {member.role === 'BOARD' ? 'Board Member' : 
               member.role === 'TREASURER' ? 'Treasurer' : 
               member.role === 'ADMIN' ? 'Administrator' : 'Member'}
            </p>
            {member.committee && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                @ {member.committee}
              </p>
            )}
          </div>
        </div>

        {/* Interest Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.slice(0, 3).map((tag, idx) => (
              <span 
                key={idx}
                className={idx === 0 
                  ? "px-2.5 py-1 bg-[#F9C0AF]/30 dark:bg-[#d98c73]/20 text-slate-800 dark:text-[#F9C0AF] text-xs font-semibold rounded-lg border border-[#F9C0AF]/20"
                  : "px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg"
                }
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons Reveal */}
        <div 
          className={`mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 transition-all duration-300 ${
            isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <a
            href={`mailto:${member.email}`}
            className="flex-1 h-9 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            Message
          </a>
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-[#0077b5] hover:border-[#0077b5] rounded-lg flex items-center justify-center transition-colors bg-white dark:bg-transparent"
            >
              <span className="material-symbols-outlined text-lg">link</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton Card Component
function SkeletonCard() {
  return (
    <div className="relative bg-white dark:bg-surface-dark rounded-[1.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col animate-pulse">
      <div className="aspect-[4/5] w-full bg-slate-200 dark:bg-slate-700"></div>
      <div className="p-5 flex flex-col grow relative z-20 -mt-12 mx-3 mb-3 bg-white dark:bg-[#233538] rounded-2xl shadow-sm">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-md mb-2"></div>
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md mb-1"></div>
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
        <div className="flex gap-2 mt-4">
          <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
