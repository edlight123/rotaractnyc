'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import Image from 'next/image';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewPostModal({ isOpen, onClose }: NewPostModalProps) {
  const { user, userData } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Community Service');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [publicationDate, setPublicationDate] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lastEdited, setLastEdited] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setPublicationDate(today);
      updateLastEdited();
    }
  }, [isOpen]);

  useEffect(() => {
    // Count words
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
  }, [content]);

  const updateLastEdited = () => {
    setLastEdited('just now');
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - Date.now()) / 60000);
      if (diff === 0) setLastEdited('just now');
      else if (diff === 1) setLastEdited('1 min ago');
      else setLastEdited(`${diff} mins ago`);
    }, 60000);
    return () => clearInterval(interval);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setFeaturedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFeaturedImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Implement save draft API call
      console.log('Saving draft:', { title, content, category, publishImmediately });
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!content.trim()) {
      alert('Please enter some content');
      return;
    }

    setIsSaving(true);
    try {
      // Create slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Upload featured image if present
      let imageUrl = '';
      if (featuredImage) {
        // TODO: Upload image to storage
        console.log('Would upload image:', featuredImage.name);
      }

      // Get Firebase ID token
      const { getAuth } = await import('firebase/auth');
      const { getFirebaseClientApp } = await import('@/lib/firebase/client');
      const app = getFirebaseClientApp();
      if (!app) throw new Error('Firebase not initialized');
      
      const auth = getAuth(app);
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('Not authenticated');
      }

      // Create post
      const response = await fetch('/api/portal/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          slug,
          title,
          content: content.split('\n\n').filter(p => p.trim()),
          category,
          date: publicationDate,
          published: publishImmediately,
          featuredImage: imageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      alert('Post published successfully!');
      onClose();
      // Reset form
      setTitle('');
      setContent('');
      setFeaturedImage(null);
      setFeaturedImagePreview(null);
    } catch (error) {
      console.error('Error publishing post:', error);
      alert(`Failed to publish post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-[1100px] max-h-[90vh] my-auto bg-white dark:bg-[#0a0a0a] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-zinc-800">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-[#003a70] dark:text-blue-400">
                <svg className="size-6" fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"></path>
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">Create New Post</h1>
                <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-400"></span>
                  Draft Mode
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={isSaving}
              className="px-6 py-2.5 text-sm font-bold bg-[#003a70] hover:bg-[#003a70]/90 text-white rounded-lg shadow-lg shadow-[#003a70]/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isSaving ? 'Publishing...' : 'Publish'}</span>
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1"></div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Editor */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-white dark:bg-zinc-900">
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-sm font-medium">
                <a className="text-[#003a70] hover:underline dark:text-blue-400" href="/portal">Portal</a>
                <span className="text-slate-300">/</span>
                <span className="text-slate-400 dark:text-zinc-500">New Post</span>
              </nav>

              {/* Title Field */}
              <div className="space-y-2">
                <input
                  className="w-full text-4xl font-black text-slate-900 dark:text-white border-0 focus:ring-0 placeholder:text-slate-200 dark:placeholder:text-zinc-800 p-0 bg-transparent"
                  placeholder="Enter post title..."
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Editor Toolbar */}
              <div className="flex items-center flex-wrap gap-1 p-1 border-b border-slate-100 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm z-10">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Bold">
                  <span className="material-symbols-outlined">format_bold</span>
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Italic">
                  <span className="material-symbols-outlined">format_italic</span>
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="List">
                  <span className="material-symbols-outlined">format_list_bulleted</span>
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Link">
                  <span className="material-symbols-outlined">link</span>
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Image">
                  <span className="material-symbols-outlined">image</span>
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Quote">
                  <span className="material-symbols-outlined">format_quote</span>
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Code">
                  <span className="material-symbols-outlined">code</span>
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1"></div>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Undo">
                  <span className="material-symbols-outlined">undo</span>
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-400" title="Redo">
                  <span className="material-symbols-outlined">redo</span>
                </button>
              </div>

              {/* Content Textarea */}
              <textarea
                className="w-full min-h-[400px] border-0 focus:ring-0 text-lg leading-relaxed text-slate-700 dark:text-zinc-300 placeholder:text-slate-300 dark:placeholder:text-zinc-700 p-0 resize-none font-display bg-transparent"
                placeholder="Start writing your post content here..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  updateLastEdited();
                }}
              />
            </div>
          </main>

          {/* Right Sidebar: Admin Controls */}
          <aside className="w-[340px] border-l border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Category Section */}
            <section className="space-y-4">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">folder</span>
                Category
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-slate-700 dark:text-zinc-300 focus:ring-2 focus:ring-[#003a70]/20 transition-all outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Community Service</option>
                  <option>Professional Development</option>
                  <option>Club Socials</option>
                  <option>Global Impact</option>
                  <option>Member Spotlights</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none">expand_more</span>
              </div>
            </section>

            {/* Featured Image Section */}
            <section className="space-y-4">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">image</span>
                Featured Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-[#003a70]/50 dark:hover:border-[#003a70]/50 bg-white dark:bg-zinc-900 rounded-xl cursor-pointer transition-all overflow-hidden"
              >
                {featuredImagePreview ? (
                  <Image
                    src={featuredImagePreview}
                    alt="Featured image preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-zinc-700 group-hover:text-[#003a70] transition-colors">add_photo_alternate</span>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-zinc-500">Click or drag image</p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-600">Max size: 5MB (1200x630px)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              {featuredImagePreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeaturedImage(null);
                    setFeaturedImagePreview(null);
                  }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Remove image
                </button>
              )}
            </section>

            {/* Publication Date Section */}
            <section className="space-y-4">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                Publication Date
              </label>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-slate-700 dark:text-zinc-300 focus:ring-2 focus:ring-[#003a70]/20 transition-all outline-none"
                    type="date"
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="rounded border-slate-200 dark:border-zinc-800 text-[#003a70] focus:ring-[#003a70]/20"
                    id="schedule"
                    type="checkbox"
                    checked={publishImmediately}
                    onChange={(e) => setPublishImmediately(e.target.checked)}
                  />
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 cursor-pointer" htmlFor="schedule">
                    Post immediately after publishing
                  </label>
                </div>
              </div>
            </section>

            {/* SEO Snippet Preview */}
            <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-zinc-900">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">search</span>
                Search Preview
              </label>
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800 space-y-1">
                <p className="text-sm font-bold text-[#003a70] dark:text-blue-400 line-clamp-1">
                  {title || 'Enter post title...'}
                </p>
                <p className="text-[11px] text-green-600 dark:text-green-500">
                  rotaractnyc.org/blog/{title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '...'}
                </p>
                <p className="text-[12px] text-slate-500 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                  {content.slice(0, 150) || 'Description will be automatically generated from your post content...'}
                </p>
              </div>
            </section>
          </aside>
        </div>

        {/* Footer / Status Bar */}
        <footer className="px-8 py-3 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6 text-[11px] font-medium text-slate-400 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">history</span>
              Last edited {lastEdited}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">article</span>
              {wordCount} words
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[11px] font-bold text-[#003a70] dark:text-blue-400 uppercase tracking-widest hover:underline">
              Preview Mode
            </button>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
