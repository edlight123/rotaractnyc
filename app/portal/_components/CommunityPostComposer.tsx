'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { 
  collection, 
  doc,
  addDoc, 
  getDocs, 
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  query, 
  where,
  orderBy, 
  limit, 
  serverTimestamp, 
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseClientApp } from '@/lib/firebase/client';

interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhotoURL?: string;
  text: string;
  createdAt: Timestamp;
  likes: string[]; // Array of user UIDs who liked
}

interface Post {
  id: string;
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
  };
  reactions: {
    likes: string[]; // Array of user UIDs who liked
    commentsCount: number;
  };
  comments?: Comment[];
}

interface CreatePostComposerProps {
  user: any;
  userData: any;
  onPostCreated: () => void;
}

function CreatePostComposer({ user, userData, onPostCreated }: CreatePostComposerProps) {
  const [postText, setPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showSpotlightModal, setShowSpotlightModal] = useState(false);
  const [spotlightUser, setSpotlightUser] = useState<any>(null);
  const [spotlightQuote, setSpotlightQuote] = useState('');
  const [uploading, setUploading] = useState(false);

  const isAdminOrBoard = userData?.role === 'ADMIN' || userData?.role === 'BOARD';

  const handlePost = async () => {
    if (!postText.trim() && selectedImages.length === 0 && !linkUrl) return;
    
    setUploading(true);
    try {
      const app = getFirebaseClientApp();
      if (!app) return;
      const db = getFirestore(app);
      const storage = getStorage(app);

      let imageUrls: string[] = [];
      
      // Upload images
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (file) => {
          const storageRef = ref(storage, `community-posts/${user?.uid}/${Date.now()}-${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        });
        imageUrls = await Promise.all(uploadPromises);
      }

      // Determine post type and content
      let type: Post['content']['type'] = 'text';
      let additionalData: any = {};

      if (imageUrls.length > 0) {
        type = 'images';
        additionalData.images = imageUrls;
      } else if (linkUrl) {
        type = 'link';
        additionalData.link = {
          url: linkUrl,
          title: new URL(linkUrl).hostname,
          description: postText,
        };
      } else if (spotlightUser) {
        type = 'spotlight';
        additionalData.spotlight = {
          userId: spotlightUser.uid,
          name: spotlightUser.name,
          role: spotlightUser.role,
          photoURL: spotlightUser.photoURL,
          quote: spotlightQuote || 'Proud to be part of Rotaract NYC!',
        };
      }

      await addDoc(collection(db, 'communityPosts'), {
        authorUid: user?.uid,
        authorName: userData?.name || user?.displayName || 'Member',
        authorRole: userData?.role || 'MEMBER',
        authorPhotoURL: userData?.photoURL || user?.photoURL || null,
        body: postText.trim(),
        type,
        ...additionalData,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });

      setPostText('');
      setSelectedImages([]);
      setLinkUrl('');
      setShowLinkInput(false);
      setSpotlightUser(null);
      setSpotlightQuote('');
      setShowSpotlightModal(false);
      onPostCreated();
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to create post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validImages = files.filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
    
    if (validImages.length + selectedImages.length > 4) {
      alert('You can only upload up to 4 images');
      return;
    }
    
    setSelectedImages(prev => [...prev, ...validImages].slice(0, 4));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex gap-4">
        <div 
          className="size-12 rounded-full bg-cover bg-center shrink-0 border-2 border-white dark:border-gray-700 shadow-sm" 
          style={{ 
            backgroundImage: userData?.photoURL 
              ? `url(${userData.photoURL})` 
              : 'url(https://via.placeholder.com/48)'
          }}
        />
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            className="w-full bg-gray-50 dark:bg-gray-900/50 border-0 rounded-lg p-3 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-0 resize-none h-20"
            placeholder="Share a photo, update, or shoutout with the club..."
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            disabled={uploading}
          />

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {selectedImages.map((file, idx) => (
                <div key={idx} className="relative group">
                  <div 
                    className="aspect-square rounded-lg bg-cover bg-center border border-gray-200 dark:border-gray-700"
                    style={{ backgroundImage: `url(${URL.createObjectURL(file)})` }}
                  />
                  <button
                    onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link Input */}
          {showLinkInput && (
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <button
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <label 
                htmlFor="image-upload"
                className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors cursor-pointer" 
                title="Add Photo"
              >
                <span className="material-symbols-outlined">image</span>
              </label>
              <button 
                className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors" 
                title="Attach Link"
                onClick={() => setShowLinkInput(!showLinkInput)}
                disabled={uploading}
              >
                <span className="material-symbols-outlined">link</span>
              </button>
              {isAdminOrBoard && (
                <button 
                  className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors" 
                  title="Member Spotlight"
                  onClick={() => setShowSpotlightModal(true)}
                  disabled={uploading}
                >
                  <span className="material-symbols-outlined">star</span>
                </button>
              )}
            </div>
            <button 
              onClick={handlePost}
              className="bg-[#17b0cf] hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-[#17b0cf]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={(!postText.trim() && selectedImages.length === 0 && !linkUrl) || uploading}
            >
              {uploading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Spotlight Modal */}
      {showSpotlightModal && (
        <SpotlightModal
          onClose={() => setShowSpotlightModal(false)}
          onSelect={(user, quote) => {
            setSpotlightUser(user);
            setSpotlightQuote(quote);
            setShowSpotlightModal(false);
          }}
        />
      )}

      {/* Spotlight Preview */}
      {spotlightUser && (
        <div className="mt-3 p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">star</span>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">Member Spotlight</span>
            </div>
            <button
              onClick={() => {
                setSpotlightUser(null);
                setSpotlightQuote('');
              }}
              className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-400"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="size-12 rounded-full bg-cover bg-center border-2 border-amber-300 dark:border-amber-600"
              style={{ backgroundImage: `url(${spotlightUser.photoURL || 'https://via.placeholder.com/48'})` }}
            />
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-200">{spotlightUser.name}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">{spotlightUser.role}</p>
            </div>
          </div>
          {spotlightQuote && (
            <p className="mt-2 text-xs italic text-amber-800 dark:text-amber-300">"{spotlightQuote}"</p>
          )}
        </div>
      )}
    </div>
  );
}

function SpotlightModal({ onClose, onSelect }: { onClose: () => void; onSelect: (user: any, quote: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [quote, setQuote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      const app = getFirebaseClientApp();
      if (!app) return;
      const db = getFirestore(app);

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('status', '==', 'active'), orderBy('name'));
        const snapshot = await getDocs(q);
        const loadedUsers = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setUsers(loadedUsers);
      } catch (err) {
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-bold text-lg">Select Member to Spotlight</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17b0cf]"></div>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {users.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      selectedUser?.uid === user.uid
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div 
                      className="size-10 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${user.photoURL || 'https://via.placeholder.com/40'})` }}
                    />
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.role || 'Member'}</p>
                    </div>
                    {selectedUser?.uid === user.uid && (
                      <span className="material-symbols-outlined text-amber-500">check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              {selectedUser && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold mb-2">Spotlight Quote</label>
                    <textarea
                      className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm resize-none h-20"
                      placeholder='e.g. "Proud to be part of Rotaract NYC!"'
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => onSelect(selectedUser, quote)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-bold transition-colors"
                  >
                    Create Spotlight Post
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { CreatePostComposer };
