'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';

export default function PostComposer() {
  const { user, userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'community' | 'announcement'>('community');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canPostAnnouncement = useMemo(() => {
    const role = userData?.role;
    return role === 'BOARD' || role === 'TREASURER' || role === 'ADMIN';
  }, [userData?.role]);

  const close = () => {
    setOpen(false);
    setSubmitting(false);
    setTitle('');
    setBody('');
    setMode('community');
  };

  const submit = async () => {
    if (!user?.uid) return;
    const trimmedBody = body.trim();
    if (!trimmedBody) return;
    if (mode === 'announcement' && !canPostAnnouncement) return;
    if (mode === 'announcement' && !title.trim()) return;

    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    setSubmitting(true);
    try {
      const authorName = userData?.name || user.displayName || 'Member';
      const authorRole = userData?.role ? String(userData.role) : 'MEMBER';
      const authorPhotoURL = userData?.photoURL || user.photoURL || null;

      if (mode === 'announcement') {
        await addDoc(collection(db, 'announcements'), {
          title: title.trim(),
          body: trimmedBody,
          pinned: false,
          visibility: 'member',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          seeded: false,
        });
      } else {
        await addDoc(collection(db, 'communityPosts'), {
          authorUid: user.uid,
          authorName,
          authorRole,
          authorPhotoURL,
          title: null,
          body: trimmedBody,
          type: 'text',
          images: null,
          document: null,
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp(),
        });
      }

      close();
      window.location.reload();
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to post. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] flex gap-4 items-center">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
        {user?.photoURL ? (
          <img 
            src={user.photoURL} 
            alt="Current user avatar" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="material-symbols-outlined">person</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left bg-[#f5f5f7] dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 py-2.5 px-4 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
        >
          Share an announcement or update...
        </button>
      </div>
    </div>

    {open ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => (submitting ? null : close())}
        />
        <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] shadow-xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary dark:text-white">Create post</h2>
            <button
              onClick={() => (submitting ? null : close())}
              className="text-gray-400 hover:text-primary dark:hover:text-white"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {canPostAnnouncement ? (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode('community')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  mode === 'community'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2a2a2a]'
                }`}
              >
                Update
              </button>
              <button
                onClick={() => setMode('announcement')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  mode === 'announcement'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2a2a2a]'
                }`}
              >
                Announcement
              </button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Updates are visible to members. Announcements require board access.
            </p>
          )}

          {mode === 'announcement' ? (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#141414]"
                placeholder="Announcement title"
              />
            </div>
          ) : null}

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {mode === 'announcement' ? 'Announcement' : 'Update'}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#141414]"
              placeholder={mode === 'announcement' ? 'Write an announcement for members…' : 'Share an update with members…'}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => (submitting ? null : close())}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2a2a2a] text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !body.trim() || (mode === 'announcement' && (!canPostAnnouncement || !title.trim()))}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
