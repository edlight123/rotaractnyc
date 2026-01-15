'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { User } from '@/types/portal';
import { FiMail, FiPhone, FiLinkedin, FiMessageCircle, FiSearch } from 'react-icons/fi';

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Member Directory</h1>
        <p className="text-gray-600">
          {filteredMembers.length} of {members.length} members
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or committee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Committees</option>
            {committees.map(committee => (
              <option key={committee} value={committee}>{committee}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Members grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <div
            key={member.uid}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {member.photoURL ? (
                <img
                  src={member.photoURL}
                  alt={member.name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {member.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{member.name}</h3>
                <p className="text-sm text-gray-600">{member.role}</p>
                {member.committee && (
                  <p className="text-sm text-gray-500">{member.committee}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                <FiMail />
                <span className="truncate">{member.email}</span>
              </a>

              {member.phoneOptIn && member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <FiPhone />
                  <span>{member.phone}</span>
                </a>
              )}

              {member.phoneOptIn && member.whatsapp && (
                <a
                  href={`https://wa.me/${member.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  <FiMessageCircle />
                  <span>WhatsApp</span>
                </a>
              )}

              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <FiLinkedin />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No members found matching your filters</p>
        </div>
      )}
    </div>
  );
}
