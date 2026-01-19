'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc,
  addDoc,
  Timestamp,
  updateDoc,
  increment
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { Event, User } from '@/types/portal';
import Link from 'next/link';
import Image from 'next/image';

interface CommunityPost {
  id: string;
  content: string;
  imageUrls?: string[];
  createdBy: string;
  createdAt: Timestamp;
  likes: number;
  comments: number;
}

export default function PortalDashboard() {
  const { user, userData, loading } = useAuth();
  
  // Community Feed State
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  
  // Sidebar State
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [memberOfMonth, setMemberOfMonth] = useState<User | null>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Array<{user: User, daysUntil: number}>>([]);
  const [memberSpotlight, setMemberSpotlight] = useState<User | null>(null);
  
  // Loading States
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSidebar, setLoadingSidebar] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      loadAllData();
    }
  }, [loading, user]);

  const loadAllData = async () => {
    await Promise.all([
      loadCommunityPosts(),
      loadSidebarData()
    ]);
  };

  // ==================== COMMUNITY FEED ====================
  
  const loadCommunityPosts = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const postsQuery = query(
        collection(db, 'communityPosts'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(postsQuery);
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommunityPost[];
      
      setPosts(postsData);
      
      // Load authors
      const uniqueAuthors = Array.from(new Set(postsData.map(p => p.createdBy)));
      const authorsData: Record<string, User> = {};
      
      await Promise.all(
        uniqueAuthors.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              authorsData[uid] = { ...userDoc.data(), uid } as User;
            }
          } catch (error) {
            console.error(`Error loading author ${uid}:`, error);
          }
        })
      );
      
      setAuthors(authorsData);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && selectedImages.length === 0) return;
    if (!user) return;

    setUploadingPost(true);
    const app = getFirebaseClientApp();
    if (!app) {
      setUploadingPost(false);
      return;
    }

    const db = getFirestore(app);
    const storage = getStorage(app);

    try {
      // Upload images if any
      const imageUrls: string[] = [];
      
      for (const image of selectedImages) {
        const storageRef = ref(storage, `community/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      }

      // Create post
      const newPost = {
        content: postContent,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        likes: 0,
        comments: 0
      };

      await addDoc(collection(db, 'communityPosts'), newPost);

      // Reset form
      setPostContent('');
      setSelectedImages([]);
      
      // Reload posts
      await loadCommunityPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setUploadingPost(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    // Limit to 4 images total
    const newImages = [...selectedImages, ...validFiles].slice(0, 4);
    setSelectedImages(newImages);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== SIDEBAR DATA ====================
  
  const loadSidebarData = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      await Promise.all([
        loadNextEvent(db),
        loadMemberOfMonth(db),
        loadUpcomingBirthdays(db),
        loadMemberSpotlight(db)
      ]);
    } catch (error) {
      console.error('Error loading sidebar data:', error);
    } finally {
      setLoadingSidebar(false);
    }
  };

  const loadNextEvent = async (db: any) => {
    try {
      const now = Timestamp.now();
      
      const memberEventsQuery = query(
        collection(db, 'portalEvents'),
        where('visibility', '==', 'member'),
        where('startAt', '>=', now),
        orderBy('startAt', 'asc'),
        limit(1)
      );
      
      const publicEventsQuery = query(
        collection(db, 'portalEvents'),
        where('visibility', '==', 'public'),
        where('startAt', '>=', now),
        orderBy('startAt', 'asc'),
        limit(1)
      );

      const [memberSnapshot, publicSnapshot] = await Promise.all([
        getDocs(memberEventsQuery),
        getDocs(publicEventsQuery)
      ]);

      const events: Event[] = [];
      
      memberSnapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      publicSnapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() } as Event);
      });

      if (events.length > 0) {
        events.sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
        setNextEvent(events[0]);
      }
    } catch (error) {
      console.error('Error loading next event:', error);
    }
  };

  const loadMemberOfMonth = async (db: any) => {
    try {
      // Try to find a featured member
      const featuredQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active'),
        where('featured', '==', true),
        limit(1)
      );
      
      const featuredSnapshot = await getDocs(featuredQuery);
      
      if (!featuredSnapshot.empty) {
        const doc = featuredSnapshot.docs[0];
        const data = doc.data();
        setMemberOfMonth({ ...data, uid: doc.id } as User);
      } else {
        // Random active member
        const usersQuery = query(
          collection(db, 'users'),
          where('status', '==', 'active'),
          limit(25)
        );
        
        const snapshot = await getDocs(usersQuery);
        if (!snapshot.empty) {
          const users: User[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            users.push({ ...data, uid: doc.id } as User);
          });
          
          const randomUser = users[Math.floor(Math.random() * users.length)];
          setMemberOfMonth(randomUser);
        }
      }
    } catch (error) {
      console.error('Error loading member of month:', error);
    }
  };

  const loadUpcomingBirthdays = async (db: any) => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(usersQuery);
      const today = new Date();
      const upcomingBirthdays: Array<{user: User, daysUntil: number}> = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const user = { ...data, uid: doc.id } as User;
        
        if (user.birthday) {
          let birthMonth: number, birthDay: number;
          
          if (user.birthday instanceof Date) {
            birthMonth = user.birthday.getMonth();
            birthDay = user.birthday.getDate();
          } else if (typeof user.birthday === 'string') {
            const parts = user.birthday.split(/[-/]/);
            if (parts.length >= 2) {
              birthMonth = parseInt(parts[0]) - 1;
              birthDay = parseInt(parts[1]);
            } else {
              return;
            }
          } else {
            return;
          }
          
          const birthdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay);
          let daysUntil = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil < 0) {
            const birthdayNextYear = new Date(today.getFullYear() + 1, birthMonth, birthDay);
            daysUntil = Math.ceil((birthdayNextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          if (daysUntil >= 0 && daysUntil <= 30) {
            upcomingBirthdays.push({ user, daysUntil });
          }
        }
      });
      
      upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
      setUpcomingBirthdays(upcomingBirthdays.slice(0, 3));
    } catch (error) {
      console.error('Error loading birthdays:', error);
    }
  };

  const loadMemberSpotlight = async (db: any) => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active'),
        limit(25)
      );
      
      const snapshot = await getDocs(usersQuery);
      if (!snapshot.empty) {
        const users: User[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          users.push({ ...data, uid: doc.id } as User);
        });
        
        const randomUser = users[Math.floor(Math.random() * users.length)];
        setMemberSpotlight(randomUser);
      }
    } catch (error) {
      console.error('Error loading member spotlight:', error);
    }
  };

  // ==================== UTILITY FUNCTIONS ====================
  
  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTimeUntilEvent = (startAt: Timestamp) => {
    const now = Date.now();
    const eventTime = startAt.toDate().getTime();
    const diffDays = Math.ceil((eventTime - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} Days`;
  };

  const getBirthdayText = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const date = new Date();
      date.setDate(date.getDate() + daysUntil);
      return days[date.getDay()];
    }
    return `In ${daysUntil} days`;
  };

  // ==================== LOADING STATE ====================
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17b0cf]"></div>
      </div>
    );
  }

  // ==================== RENDER ====================
  
  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT COLUMN: Main Content */}
        <div className="flex-1 w-full lg:max-w-[720px] mx-auto flex flex-col gap-6">
          
          {/* Post Composer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <div 
                className="size-10 rounded-full bg-cover bg-center shrink-0"
                style={{ backgroundImage: `url(${userData?.photoURL || '/assets/images/default-avatar.png'})` }}
              />
              <div className="flex-1">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share something with the community..."
                  className="w-full resize-none border-none focus:ring-0 text-sm placeholder-gray-400 dark:bg-gray-800 dark:text-white"
                  rows={3}
                  disabled={uploadingPost}
                />
                
                {/* Image Previews */}
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <label className="cursor-pointer flex items-center gap-1 text-gray-500 hover:text-[#17b0cf] transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={uploadingPost || selectedImages.length >= 4}
                      />
                      <span className="material-symbols-outlined text-[20px]">image</span>
                      <span className="text-xs">Photo</span>
                    </label>
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={uploadingPost || (!postContent.trim() && selectedImages.length === 0)}
                    className="bg-[#17b0cf] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-cyan-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {uploadingPost ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {loadingPosts ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17b0cf]"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            <>
              {posts.map((post) => {
                const author = authors[post.createdBy];
                return (
                  <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    {/* Post Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="size-10 rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${author?.photoURL || '/assets/images/default-avatar.png'})` }}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                          {author?.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Post Content */}
                    <p className="text-sm text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">
                      {post.content}
                    </p>
                    
                    {/* Post Images */}
                    {post.imageUrls && post.imageUrls.length > 0 && (
                      <div className={`grid gap-2 mb-4 ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {post.imageUrls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Post image ${index + 1}`}
                            className="w-full h-64 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Post Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button className="flex items-center gap-1 text-gray-500 hover:text-[#17b0cf] transition-colors">
                        <span className="material-symbols-outlined text-[20px]">favorite_border</span>
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-[#17b0cf] transition-colors">
                        <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
                        <span className="text-sm">{post.comments}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <aside className="hidden lg:block w-[320px] shrink-0 sticky top-24 space-y-6">
          
          {/* Member Spotlight */}
          {memberSpotlight && (
            <div className="bg-gradient-to-br from-[#17b0cf] to-cyan-600 rounded-xl p-6 text-white shadow-lg">
              <h3 className="text-xs font-black uppercase tracking-wider mb-4 opacity-90">Member Spotlight</h3>
              <div className="flex flex-col items-center text-center">
                <div 
                  className="size-20 rounded-full bg-cover bg-center border-4 border-white/20 mb-3"
                  style={{ backgroundImage: `url(${memberSpotlight.photoURL || '/assets/images/default-avatar.png'})` }}
                />
                <h4 className="font-black text-lg">{memberSpotlight.name}</h4>
                <p className="text-sm opacity-90 mb-3">{memberSpotlight.role || 'Member'}</p>
                {memberSpotlight.bio && (
                  <p className="text-xs opacity-80 italic">"{memberSpotlight.bio}"</p>
                )}
              </div>
            </div>
          )}

          {/* Member of the Month */}
          {memberOfMonth && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-[#17b0cf] text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg z-10">
                Member of the Month
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4 mt-2">
                  <div className="absolute inset-0 bg-[#17b0cf]/20 rounded-full blur-xl transform group-hover:scale-110 transition-transform duration-500" />
                  <div 
                    className="size-24 rounded-full bg-cover bg-center border-4 border-white dark:border-gray-800 shadow-md relative z-10" 
                    style={{ backgroundImage: `url(${memberOfMonth.photoURL || '/assets/images/default-avatar.png'})` }}
                  />
                  <div className="absolute bottom-0 right-0 bg-[#FCCE10] text-amber-900 p-1.5 rounded-full border-2 border-white dark:border-gray-800 z-20 flex items-center justify-center">
                    <span className="material-symbols-filled text-[14px]">star</span>
                  </div>
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">{memberOfMonth.name}</h3>
                <p className="text-sm text-[#17b0cf] font-medium mb-3">{memberOfMonth.role || 'Member'}</p>
                {memberOfMonth.bio && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 w-full mb-3">
                    <p className="text-xs italic text-gray-600 dark:text-gray-400">
                      {memberOfMonth.bio}
                    </p>
                  </div>
                )}
                <Link 
                  href="/portal/directory"
                  className="text-xs font-bold text-gray-500 hover:text-[#17b0cf] transition-colors flex items-center gap-1"
                >
                  View Profile <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}

          {/* Celebrations */}
          {upcomingBirthdays.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#EE8899]">cake</span> Celebrations
              </h3>
              <div className="flex flex-col gap-4">
                {upcomingBirthdays.map((birthday) => (
                  <div key={birthday.user.uid} className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-[#EE8899]/10 flex items-center justify-center text-[#EE8899] shrink-0">
                      <span className="material-symbols-filled text-[18px]">cake</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{birthday.user.name}</p>
                      <p className="text-xs text-gray-500">Birthday • {getBirthdayText(birthday.daysUntil)}</p>
                    </div>
                    <Link
                      href="/portal/directory"
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-[#EE8899] hover:text-white transition-colors"
                    >
                      Wish
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Meetup */}
          {nextEvent && (
            <div className="bg-[#17b0cf]/5 rounded-xl p-5 border border-[#17b0cf]/10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[#17b0cf] font-bold text-sm">Next Meetup</h3>
                <span className="text-xs bg-white dark:bg-gray-800 text-[#17b0cf] px-2 py-0.5 rounded shadow-sm font-bold">
                  {getTimeUntilEvent(nextEvent.startAt)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-black text-gray-900 dark:text-white leading-tight">
                  {nextEvent.title}
                </p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {nextEvent.location}
                </p>
              </div>
              <Link 
                href={`/portal/events/${nextEvent.id}`}
                className="mt-3 w-full bg-[#17b0cf] text-white text-xs font-bold py-2 rounded-lg shadow-md shadow-[#17b0cf]/20 hover:bg-cyan-600 transition-colors block text-center"
              >
                RSVP Now
              </Link>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/portal/directory" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                <div className="size-8 rounded-lg bg-[#17b0cf]/10 flex items-center justify-center text-[#17b0cf]">
                  <span className="material-symbols-outlined text-[18px]">people</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#17b0cf]">Member Directory</span>
              </Link>
              <Link href="/portal/events" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                  <span className="material-symbols-outlined text-[18px]">event</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-500">View Events</span>
              </Link>
              <Link href="/portal/docs" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-amber-500">Documents</span>
              </Link>
              <Link href="/portal/settings" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                <div className="size-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-500">Settings</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
