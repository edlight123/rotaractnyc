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
    type: 'text' | 'images' | 'announcement' | 'document' | 'link' | 'event';
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
  const [uploading, setUploading] = useState(false);

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
    </div>
  );
}

export { CreatePostComposer };
