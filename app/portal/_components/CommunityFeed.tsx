'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth';

interface Post {
  id: string;
  author: {
    name: string;
    role: string;
    photoUrl?: string;
  };
  timestamp: string;
  content: {
    title?: string;
    body: string;
    type: 'text' | 'images' | 'announcement' | 'document';
    images?: string[];
    document?: {
      name: string;
      size: string;
      url: string;
    };
  };
  reactions: {
    likes: number;
    comments: number;
  };
}

export default function CommunityFeed() {
  const { userData } = useAuth();
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);

  // Sample posts for demonstration
  useEffect(() => {
    const samplePosts: Post[] = [
      {
        id: '1',
        author: {
          name: 'Elena Rodriguez',
          role: 'Service Committee Chair',
          photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzh7Q0gSXQtod3NZU0NkIDGmOvzIwxgaiRI9x2uP5OVi9IP02xu-QjqvSQENePzui8kD6kLrHUVHkRFNuPTtsYL6ORDp8wV8lm4E2hYNshW6IiDBVNw5k_GLTYuCaZ_U5ZBCZJX6xKwghUOXLJAIBW2DTrZt-3MYUMrLe4eTYB__YzkGoWyixNCtV1RSoj5nLdoHpeVwe8fkSQX2keApOFFbOosZ73pzS44veMr-JVXGqKob-SmgOCagPVm4GMfEZWAqinzDYOGoY'
        },
        timestamp: '2h ago',
        content: {
          title: 'Highlights from the Park Clean-up 🌳',
          body: 'What an incredible turnout this weekend! We collected over 50 bags of trash and planted 12 new saplings. Huge thanks to everyone who woke up early on a Saturday.',
          type: 'images',
          images: [
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDk8FRRFvZHccj0BJ-8YYxKZwCjdRLZNCrxMszTiXEjIf_03yOaOxpxHUPkOv4fSSyJrqz1NoXKtp3orluI9PSkfg6kLrDbV30M7SqPeSGndFrJlcIuCdQZC4Y0QThzTq0nP_c6WT99hlANaPwiCpM6sTkMv_gSpo4Y6VsIevleg-7aWyYH45WTqr8S7GiJuwLAqgLQBxuXJu-hL8h98wMGvUB9CmhaXnjbr-KLJIS4yIq545kXwGTqluA3fsuBHknExf6wZeF_8xk',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCaR2L4M3F0ZuX1KBldE75AO88elk4K3JrOUdumI80iqIsdLy-ji86Rk5Aqb1rTno1ujSk7X5ErBEqQSeLw8XLIsBf6bMc5j3-OZWmBA6UNLcHoniTLT2pB3gw4xYouaT2GQ9-KamDe3rp6-nI7qHZUJWLTQUiR4KcsZg32HTO4uJnFNh33KNgADU73pxz2xsmmJxrM8lud9Ok_6zNGwKJeU4VTzYInaU0KnfJlGFyO4Nl8c1iCJYVnPXrMWR35WhB7dLxugGqc-8A',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuAAfdA5-2iDOhAnmA9G0v0DoLHY30NEo_uaiYTGX26qSpWcD6ZIITe1cEkeLurkaEr-Ag4ZB3rG4L1yyvjMXMeH-S2DrqMUmzh4kXJaQhtwXuyFLbHc7G9dekvmGnr27w3aY8N_q1HvOdYlkXF_u1RylsLlxfCkqkxMjqgjkE0VL9llLe9JQ4MH8IGbHR6dnc_7JXYwJ2dDkWXb6xY72HPxqL-sSFR5yK3po5UBMBKGvY2F1yci8lvSgohciIdkniRR1WsEvd2gWl0'
          ]
        },
        reactions: {
          likes: 24,
          comments: 6
        }
      },
      {
        id: '2',
        author: {
          name: 'Rotaract NYC',
          role: 'Official Announcement',
        },
        timestamp: '5h ago',
        content: {
          title: 'Welcome our newest members! 🚀',
          body: 'We are thrilled to welcome 4 new passionate individuals to our club this month. Make sure to say hi at the next mixer!',
          type: 'announcement'
        },
        reactions: {
          likes: 42,
          comments: 12
        }
      },
      {
        id: '3',
        author: {
          name: 'Marcus Chen',
          role: 'Club Secretary',
          photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQvTNslLnPB1HN0wvPXeeFhMME_NdB8LyFVmBprQGmo_G_aeS1wCeR0w2MI4EeVnUTi2inVYCp4k1QV0Cr096VjPwPvbs68V3iA0HmkJUiRkrFQsTCANsoI5QYeZ-VnIbkCKBPEENCd2_wGmMpaxGrhRqiCYNFjOZ2_Zp3ESuiG4rSQ9eTXQ32cgP2p84ZE9h1WMAymKUOA6iGiqE26nH20JwvRDVR4sdBAQGzUpLwZjjasC68EH0vfhp9FHATPse_vsXjbdcB4-w'
        },
        timestamp: '1d ago',
        content: {
          body: 'Just uploaded the minutes from last Tuesday\'s strategy session. Please review before next week.',
          type: 'document',
          document: {
            name: 'August_Strategy_Meeting_Minutes.pdf',
            size: '1.2 MB',
            url: '#'
          }
        },
        reactions: {
          likes: 8,
          comments: 3
        }
      }
    ];
    setPosts(samplePosts);
  }, []);

  const handlePost = () => {
    if (!postText.trim()) return;
    // TODO: Implement actual post creation
    setPostText('');
  };

  return (
    <main className="flex-1 w-full lg:max-w-[720px] mx-auto flex flex-col gap-6">
      {/* Page Heading & Greeting */}
      <div className="flex flex-col gap-1 pb-2">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          Community Hub
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {userData?.name?.split(' ')[0] || 'Member'}! Here's what's happening today.
        </p>
      </div>

      {/* Composer (Create Post) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:ring-2 focus-within:ring-[#17b0cf]/20">
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
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors" 
                  title="Add Photo"
                >
                  <span className="material-symbols-outlined">image</span>
                </button>
                <button 
                  className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors" 
                  title="Add Event"
                >
                  <span className="material-symbols-outlined">event</span>
                </button>
                <button 
                  className="p-2 text-[#17b0cf] hover:bg-[#17b0cf]/10 rounded-full transition-colors" 
                  title="Attach Link"
                >
                  <span className="material-symbols-outlined">link</span>
                </button>
              </div>
              <button 
                onClick={handlePost}
                className="bg-[#17b0cf] hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-[#17b0cf]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={!postText.trim()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Posts */}
      {posts.map((post) => (
        <article 
          key={post.id} 
          className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md border transition-all duration-300 ${
            post.content.type === 'announcement' 
              ? 'relative bg-gradient-to-br from-indigo-600 to-purple-700' 
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          {post.content.type === 'announcement' && (
            <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full blur-2xl" />
          )}
          
          <div className={post.content.type === 'announcement' ? 'relative p-6' : ''}>
            {/* Post Header */}
            {post.content.type !== 'announcement' && (
              <div className="p-4 flex justify-between items-start">
                <div className="flex gap-3">
                  <div 
                    className="size-10 rounded-full bg-cover bg-center border border-gray-200 dark:border-gray-700" 
                    style={{ 
                      backgroundImage: post.author.photoUrl 
                        ? `url(${post.author.photoUrl})` 
                        : 'url(https://via.placeholder.com/40)'
                    }}
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{post.author.name}</p>
                    <p className="text-xs text-gray-500">{post.author.role} • {post.timestamp}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
              </div>
            )}

            {/* Announcement Header */}
            {post.content.type === 'announcement' && (
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                    <span className="material-symbols-outlined">celebration</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{post.author.name}</p>
                    <p className="text-white/60 text-xs">{post.author.role} • {post.timestamp}</p>
                  </div>
                </div>
                <span className="bg-[#FCCE10] text-amber-900 text-xs font-black px-2 py-1 rounded uppercase tracking-wider">
                  New
                </span>
              </div>
            )}

            {/* Post Content */}
            <div className={post.content.type === 'announcement' ? '' : 'px-4 pb-3'}>
              {post.content.title && (
                <h3 className={`font-bold mb-2 ${
                  post.content.type === 'announcement' 
                    ? 'text-2xl text-white' 
                    : 'text-lg text-gray-900 dark:text-white'
                }`}>
                  {post.content.title}
                </h3>
              )}
              <p className={`leading-relaxed mb-4 ${
                post.content.type === 'announcement' 
                  ? 'text-indigo-100 max-w-lg' 
                  : post.content.type === 'document'
                  ? 'text-gray-700 dark:text-gray-300 text-sm'
                  : 'text-gray-600 dark:text-gray-300'
              }`}>
                {post.content.body}
              </p>

              {/* Images Grid */}
              {post.content.images && post.content.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 h-64 md:h-80 rounded-xl overflow-hidden">
                  <div 
                    className="bg-cover bg-center h-full hover:scale-105 transition-transform duration-500 cursor-pointer" 
                    style={{ backgroundImage: `url(${post.content.images[0]})` }}
                  />
                  {post.content.images.length > 1 && (
                    <div className="grid grid-rows-2 gap-2 h-full">
                      {post.content.images.slice(1).map((img, idx) => (
                        <div 
                          key={idx}
                          className="bg-cover bg-center h-full hover:scale-105 transition-transform duration-500 cursor-pointer" 
                          style={{ backgroundImage: `url(${img})` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Document Attachment */}
              {post.content.document && (
                <a 
                  href={post.content.document.url} 
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="size-12 bg-red-100 dark:bg-red-900/20 rounded flex items-center justify-center text-red-500 shrink-0">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-[#17b0cf] transition-colors">
                      {post.content.document.name}
                    </h4>
                    <p className="text-xs text-gray-500">{post.content.document.size} • Added {post.timestamp}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">download</span>
                </a>
              )}

              {/* Announcement CTA */}
              {post.content.type === 'announcement' && (
                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors">
                  Say Hello 👋
                </button>
              )}
            </div>

            {/* Post Footer / Reactions */}
            {post.content.type !== 'announcement' && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex gap-4">
                  <button className="flex items-center gap-2 group">
                    <div className="p-2 rounded-full group-hover:bg-pink-50 dark:group-hover:bg-pink-900/30 transition-colors">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-pink-500 transition-colors text-[20px]">
                        favorite
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-500 group-hover:text-pink-500 transition-colors">
                      {post.reactions.likes}
                    </span>
                  </button>
                  <button className="flex items-center gap-2 group">
                    <div className="p-2 rounded-full group-hover:bg-[#17b0cf]/10 transition-colors">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-[#17b0cf] transition-colors text-[20px]">
                        chat_bubble
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-500 group-hover:text-[#17b0cf] transition-colors">
                      {post.reactions.comments}
                    </span>
                  </button>
                </div>
                <button className="text-gray-400 hover:text-[#17b0cf] transition-colors">
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </main>
  );
}
