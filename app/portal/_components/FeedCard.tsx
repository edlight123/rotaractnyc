'use client';

import { Announcement, User } from '@/types/portal';
import { Timestamp, deleteDoc, doc, getCountFromServer, getDoc, getFirestore, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { useEffect } from 'react';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth';

interface Author {
  name: string;
  role?: string;
  photoURL?: string;
}

interface FeedCardProps {
  announcement: Announcement;
  author?: Author;
}

export default function FeedCard({ announcement, author }: FeedCardProps) {
  const { user } = useAuth();
    const copyAnnouncement = async () => {
      const text = `${announcement.title}\n\n${announcement.body}`;
      try {
        await navigator.clipboard.writeText(text);
        alert('Copied');
      } catch {
        alert(text);
      }
    };
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgedCount, setAcknowledgedCount] = useState(0);
  const [loadingAck, setLoadingAck] = useState(true);

  const formatTimeAgo = (timestamp: Timestamp) => {
    const now = new Date();
    const date = timestamp.toDate();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRoleBadgeColor = (role?: string) => {
    if (!role) return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    
    const roleMap: Record<string, string> = {
      'ADMIN': 'text-red-700 bg-red-50 dark:bg-red-900/20',
      'BOARD': 'text-purple-700 bg-purple-50 dark:bg-purple-900/20',
      'TREASURER': 'text-green-700 bg-green-50 dark:bg-green-900/20',
      'President': 'text-rotaract-blue bg-blue-50 dark:bg-blue-900/20',
      'Service Chair': 'text-green-700 bg-green-50 dark:bg-green-900/20',
    };

    return roleMap[role] || 'text-gray-600 bg-gray-100 dark:bg-gray-800';
  };

  useEffect(() => {
    let cancelled = false;

    async function loadAck() {
      const app = getFirebaseClientApp();
      if (!app) return;
      const db = getFirestore(app);

      try {
        const ackCol = collection(db, 'announcements', announcement.id, 'acknowledgements');
        const countSnap = await getCountFromServer(ackCol);

        let isAck = false;
        if (user?.uid) {
          const ackDoc = await getDoc(doc(db, 'announcements', announcement.id, 'acknowledgements', user.uid));
          isAck = ackDoc.exists();
        }

        if (cancelled) return;
        setAcknowledgedCount(countSnap.data().count);
        setAcknowledged(isAck);
      } catch (err) {
        console.error('Error loading acknowledgements:', err);
        if (!cancelled) {
          setAcknowledged(false);
          setAcknowledgedCount(0);
        }
      } finally {
        if (!cancelled) setLoadingAck(false);
      }
    }

    loadAck();
    return () => {
      cancelled = true;
    };
  }, [announcement.id, user?.uid]);

  const handleAcknowledge = async () => {
    if (!user?.uid) return;
    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    const ref = doc(db, 'announcements', announcement.id, 'acknowledgements', user.uid);

    try {
      if (acknowledged) {
        setAcknowledged(false);
        setAcknowledgedCount((prev) => Math.max(0, prev - 1));
        await deleteDoc(ref);
      } else {
        setAcknowledged(true);
        setAcknowledgedCount((prev) => prev + 1);
        await setDoc(ref, { createdAt: serverTimestamp() }, { merge: true });
      }
    } catch (err) {
      console.error('Error updating acknowledgement:', err);
      // revert optimistic update
      setAcknowledged((prev) => !prev);
      setAcknowledgedCount((prev) => (acknowledged ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  return (
    <article className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-[#2a2a2a] overflow-hidden group">
      {/* Card Header */}
      <div className="p-5 pb-3 flex justify-between items-start">
        <div className="flex gap-3">
          <div 
            className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-cover bg-center overflow-hidden flex-shrink-0"
            style={author?.photoURL ? { backgroundImage: `url(${author.photoURL})` } : {}}
          >
            {!author?.photoURL && (
              <span className="material-symbols-outlined">person</span>
            )}
          </div>
          <div>
            <h3 className="text-[#141414] dark:text-white font-bold text-base leading-tight">
              {author?.name || 'Anonymous'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {author?.role && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRoleBadgeColor(author.role)}`}>
                  {author.role}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                • {formatTimeAgo(announcement.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => void copyAnnouncement()}
          className="text-gray-400 hover:text-primary dark:hover:text-white transition-colors"
          title="Copy"
        >
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>

      {/* Card Body */}
      <div className="px-5 pb-3">
        <h2 className="text-xl font-bold text-primary dark:text-white mb-2">
          {announcement.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
          {announcement.body}
        </p>
      </div>

      {/* Card Footer: Reactions */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
        <div className="flex gap-2">
          {/* Acknowledge Button */}
          <button 
            onClick={handleAcknowledge}
            disabled={loadingAck || !user}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors group/btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span 
              className={`material-symbols-outlined text-[20px] transition-colors ${
                acknowledged 
                  ? 'text-rotaract-blue' 
                  : 'text-gray-400 group-hover/btn:text-rotaract-blue'
              }`}
              style={{ fontVariationSettings: acknowledged ? "'FILL' 1" : "'FILL' 0" }}
            >
              thumb_up
            </span>
            <span className={`text-sm font-semibold transition-colors ${
              acknowledged
                ? 'text-rotaract-blue'
                : 'text-gray-500 dark:text-gray-400 group-hover/btn:text-primary dark:group-hover/btn:text-white'
            }`}>
              {acknowledgedCount} Acknowledged
            </span>
          </button>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          {announcement.visibility === 'member' ? 'All Members' : 'Board Only'}
        </div>
      </div>
    </article>
  );
}
