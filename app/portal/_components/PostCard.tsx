'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  increment
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';

interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhotoURL?: string;
  text: string;
  createdAt: any;
  likes: string[];
}

interface PostCardProps {
  postId: string;
  author: {
    name: string;
    role: string;
    photoUrl?: string;
    uid: string;
  };
  timestamp: string;
  content: {
    title?: string;
    body: string;
    type: 'text' | 'images' | 'announcement' | 'document' | 'link' | 'event' | 'spotlight';
    images?: string[];
    document?: {
      name: string;
      size: string;
      url: string;
    };
    link?: {
      url: string;
      title?: string;
      description?: string;
      image?: string;
    };
    event?: {
      id: string;
      title: string;
      date: string;
      time: string;
    };
    spotlight?: {
      userId: string;
      name: string;
      role: string;
      photoURL?: string;
      quote: string;
    };
  };
  likes: string[];
  commentsCount: number;
}

export function PostCard({ postId, author, timestamp, content, likes, commentsCount: initialCommentsCount }: PostCardProps) {
  const { user, userData } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      setIsLiked(likes.includes(user.uid));
    }
  }, [user?.uid, likes]);

  useEffect(() => {
    if (!showComments) return;

    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    const commentsRef = collection(db, 'communityPosts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(loadedComments);
    });

    return () => unsubscribe();
  }, [postId, showComments]);

  const handleLike = async () => {
    if (!user?.uid) return;

    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    const postRef = doc(db, 'communityPosts', postId);
    const newIsLiked = !isLiked;

    // Optimistic update
    setIsLiked(newIsLiked);
    setLocalLikes(prev => 
      newIsLiked 
        ? [...prev, user.uid] 
        : prev.filter(uid => uid !== user.uid)
    );

    try {
      await updateDoc(postRef, {
        likes: newIsLiked ? arrayUnion(user.uid) : arrayRemove(user.uid)
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(!newIsLiked);
      setLocalLikes(likes);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user?.uid) return;

    setSubmittingComment(true);
    try {
      const app = getFirebaseClientApp();
      if (!app) return;
      const db = getFirestore(app);

      const commentsRef = collection(db, 'communityPosts', postId, 'comments');
      await addDoc(commentsRef, {
        authorUid: user.uid,
        authorName: userData?.name || user?.displayName || 'Member',
        authorPhotoURL: userData?.photoURL || user?.photoURL || null,
        text: commentText.trim(),
        likes: [],
        createdAt: serverTimestamp(),
      });

      // Increment comment count on post
      const postRef = doc(db, 'communityPosts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });

      setCommentsCount(prev => prev + 1);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentLike = async (commentId: string, commentLikes: string[]) => {
    if (!user?.uid) return;

    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    const commentRef = doc(db, 'communityPosts', postId, 'comments', commentId);
    const isCommentLiked = commentLikes.includes(user.uid);

    try {
      await updateDoc(commentRef, {
        likes: isCommentLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <article 
      className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md border transition-all duration-300 ${
        content.type === 'announcement' 
          ? 'relative bg-gradient-to-br from-indigo-600 to-purple-700'
          : content.type === 'spotlight'
          ? 'relative bg-gradient-to-br from-amber-500 to-amber-600'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      {(content.type === 'announcement' || content.type === 'spotlight') && (
        <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full blur-2xl" />
      )}
      
      <div className={(content.type === 'announcement' || content.type === 'spotlight') ? 'relative p-6' : ''}>
        {/* Post Header */}
        {content.type !== 'announcement' && content.type !== 'spotlight' && (
          <div className="p-4 flex justify-between items-start">
            <div className="flex gap-3">
              <div 
                className="size-10 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700" 
                style={{ 
                  backgroundImage: author.photoUrl 
                    ? `url(${author.photoUrl})` 
                    : 'url(https://via.placeholder.com/40)'
                }}
              />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{author.name}</p>
                <p className="text-xs text-gray-500">{author.role} • {timestamp}</p>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Header */}
        {content.type === 'announcement' && (
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <span className="material-symbols-outlined">celebration</span>
              </div>
              <div>
                <p className="text-white font-bold">{author.name}</p>
                <p className="text-white/60 text-xs">{author.role} • {timestamp}</p>
              </div>
            </div>
            <span className="bg-[#FCCE10] text-amber-900 text-xs font-black px-2 py-1 rounded uppercase tracking-wider">
              New
            </span>
          </div>
        )}

        {/* Spotlight Header */}
        {content.type === 'spotlight' && (
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                <span className="material-symbols-outlined">star</span>
              </div>
              <div>
                <p className="text-white/80 font-bold text-xs uppercase tracking-widest">Member Spotlight</p>
              </div>
            </div>
          </div>
        )}

        {/* Post Content */}
        <div className={(content.type === 'announcement' || content.type === 'spotlight') ? '' : 'px-4 pb-3'}>
          {content.title && (
            <h3 className={`font-bold mb-2 ${
              content.type === 'announcement' 
                ? 'text-2xl text-white' 
                : 'text-lg text-gray-900 dark:text-white'
            }`}>
              {content.title}
            </h3>
          )}
          <p className={`leading-relaxed mb-4 whitespace-pre-wrap ${
            content.type === 'announcement' 
              ? 'text-indigo-100 max-w-lg' 
              : 'text-gray-600 dark:text-gray-300'
          }`}>
            {content.body}
          </p>

          {/* Images */}
          {content.images && content.images.length > 0 && (
            <div className={`grid gap-2 rounded-xl overflow-hidden mb-4 ${
              content.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
              {content.images.map((img, idx) => (
                <div 
                  key={idx}
                  className="bg-cover bg-center aspect-square hover:scale-105 transition-transform duration-500 cursor-pointer" 
                  style={{ backgroundImage: `url(${img})` }}
                  onClick={() => window.open(img, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Link Preview */}
          {content.link && (
            <a 
              href={content.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors mb-4"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm text-[#17b0cf] mb-1">
                  {content.link.title || new URL(content.link.url).hostname}
                </p>
                <p className="text-xs text-gray-500 break-all">{content.link.url}</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">open_in_new</span>
            </a>
          )}

          {/* Document */}
          {content.document && (
            <a 
              href={content.document.url} 
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group mb-4"
            >
              <div className="size-12 bg-red-100 dark:bg-red-900/20 rounded flex items-center justify-center text-red-500 shrink-0">
                <span className="material-symbols-outlined">picture_as_pdf</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-[#17b0cf] transition-colors">
                  {content.document.name}
                </h4>
                <p className="text-xs text-gray-500">{content.document.size}</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">download</span>
            </a>
          )}

          {/* Event Card */}
          {content.event && (
            <div className="p-4 rounded-lg border-2 border-[#17b0cf]/30 bg-[#17b0cf]/5 mb-4">
              <div className="flex items-center gap-3">
                <div className="size-12 bg-[#17b0cf]/20 rounded-lg flex items-center justify-center text-[#17b0cf]">
                  <span className="material-symbols-outlined">event</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white">{content.event.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {content.event.date} • {content.event.time}
                  </p>
                </div>
                <a 
                  href={`/portal/events/${content.event.id}`}
                  className="text-[#17b0cf] hover:underline text-sm font-semibold"
                >
                  View →
                </a>
              </div>
            </div>
          )}

          {/* Member Spotlight Card */}
          {content.type === 'spotlight' && content.spotlight && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 mb-4">
              <div className="flex items-center gap-4 mb-3">
                <div 
                  className="size-16 rounded-full bg-cover bg-center border-2 border-white/30"
                  style={{ backgroundImage: `url(${content.spotlight.photoURL || 'https://via.placeholder.com/64'})` }}
                />
                <div>
                  <p className="font-bold text-xl text-white">{content.spotlight.name}</p>
                  <p className="text-sm text-white/80">{content.spotlight.role}</p>
                </div>
              </div>
              {content.spotlight.quote && (
                <p className="text-white/90 italic text-sm leading-relaxed mb-4">
                  "{content.spotlight.quote}"
                </p>
              )}
              <button
                onClick={() => {
                  if (content.spotlight?.userId) {
                    window.location.href = `/portal/directory?member=${content.spotlight.userId}`;
                  }
                }}
                className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors"
              >
                Say Hello 👋
              </button>
            </div>
          )}

          {/* Announcement CTA */}
          {content.type === 'announcement' && (
            <button
              onClick={() => alert('Feature coming soon!')}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors"
            >
              Say Hello 👋
            </button>
          )}
        </div>

        {/* Reactions Bar */}
        {content.type !== 'announcement' && content.type !== 'spotlight' && (
          <>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-2 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-pink-50 dark:group-hover:bg-pink-900/30 transition-colors">
                    <span className={`material-symbols-outlined text-[20px] transition-colors ${
                      isLiked ? 'text-pink-500 fill-current' : 'text-gray-500 group-hover:text-pink-500'
                    }`}>
                      favorite
                    </span>
                  </div>
                  <span className={`text-sm font-bold transition-colors ${
                    isLiked ? 'text-pink-500' : 'text-gray-500 group-hover:text-pink-500'
                  }`}>
                    {localLikes.length}
                  </span>
                </button>
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center gap-2 group"
                >
                  <div className="p-2 rounded-full group-hover:bg-[#17b0cf]/10 transition-colors">
                    <span className="material-symbols-outlined text-gray-500 group-hover:text-[#17b0cf] transition-colors text-[20px]">
                      chat_bubble
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-500 group-hover:text-[#17b0cf] transition-colors">
                    {commentsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            {showComments && (
              <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                {/* Add Comment */}
                <div className="flex gap-3 mb-4">
                  <div 
                    className="size-8 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700 shrink-0" 
                    style={{ 
                      backgroundImage: userData?.photoURL 
                        ? `url(${userData.photoURL})` 
                        : 'url(https://via.placeholder.com/32)'
                    }}
                  />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-1 focus:ring-[#17b0cf]"
                      disabled={submittingComment}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || submittingComment}
                      className="px-4 py-2 bg-[#17b0cf] hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div 
                        className="size-8 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700 shrink-0" 
                        style={{ 
                          backgroundImage: comment.authorPhotoURL 
                            ? `url(${comment.authorPhotoURL})` 
                            : 'url(https://via.placeholder.com/32)'
                        }}
                      />
                      <div className="flex-1">
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {comment.authorName}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {comment.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-1 px-2">
                          <button
                            onClick={() => handleCommentLike(comment.id, comment.likes)}
                            className="text-xs font-semibold text-gray-500 hover:text-pink-500 transition-colors"
                          >
                            {comment.likes.includes(user?.uid || '') ? '❤️' : 'Like'}
                            {comment.likes.length > 0 && ` (${comment.likes.length})`}
                          </button>
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
