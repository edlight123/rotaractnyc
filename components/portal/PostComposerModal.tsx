'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/Toast';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import type { PostType } from '@/types';

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type Audience = 'all' | 'board';

interface PostComposerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    content: string;
    type: PostType;
    imageURLs?: string[];
    linkURL?: string;
    audience: Audience;
  }) => Promise<void>;
}

interface ImageUpload {
  id: string;
  file: File;
  preview: string;
  progress: number;
  url?: string;
  error?: string;
}

interface DraftState {
  content: string;
  type: PostType;
  audience: Audience;
  linkURL: string;
}

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const MAX_CHARS = 1000;
const MAX_IMAGES = 4;
const DRAFT_KEY = 'rotaract-post-draft';

const POST_TYPES: { id: PostType; label: string; color: string; activeClass: string; icon: string }[] = [
  {
    id: 'text',
    label: 'Update',
    color: 'text-gray-600 dark:text-gray-400',
    activeClass: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    icon: '💬',
  },
  {
    id: 'announcement',
    label: 'Announcement',
    color: 'text-cranberry-700 dark:text-cranberry-400',
    activeClass: 'bg-cranberry text-white',
    icon: '📢',
  },
  {
    id: 'spotlight',
    label: 'Spotlight',
    color: 'text-gold-700 dark:text-gold-400',
    activeClass: 'bg-gold-600 text-white',
    icon: '⭐',
  },
];

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😜', '🤔', '🤗', '🫡', '😎'],
  },
  {
    label: 'Hands',
    emojis: ['👍', '👏', '🙌', '🤝', '💪', '✊', '🤜', '🤛', '👋', '✌️', '🤞', '🫶', '👊', '☝️', '👉', '👈'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💖', '💝', '💕', '❤️‍🔥', '💯'],
  },
  {
    label: 'Objects',
    emojis: ['🎉', '🎊', '🏆', '🥇', '🎯', '🔥', '⭐', '🌟', '💡', '📣', '🎶', '☕', '🍕', '🥂', '🫡', '📸', '🎓', '🌍', '🤝', '🙏'],
  },
];

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */

export default function PostComposerModal({ open, onClose, onSubmit }: PostComposerModalProps) {
  const { member } = useAuth();
  const { toast } = useToast();

  /* ── State ── */
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [audience, setAudience] = useState<Audience>('all');
  const [linkURL, setLinkURL] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [posting, setPosting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  /* ── Draft autosave ── */
  const draftState: DraftState = { content, type: postType, audience, linkURL };
  const debouncedDraft = useDebounce(draftState, 500);

  // Save draft on debounced changes
  useEffect(() => {
    if (!open) return;
    if (!debouncedDraft.content && !debouncedDraft.linkURL) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(debouncedDraft));
    } catch { /* quota exceeded — ignore */ }
  }, [debouncedDraft, open]);

  // Restore draft on open
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: DraftState = JSON.parse(raw);
        if (draft.content || draft.linkURL) {
          setContent(draft.content || '');
          setPostType(draft.type || 'text');
          setAudience(draft.audience || 'all');
          setLinkURL(draft.linkURL || '');
          if (draft.linkURL) setShowLinkInput(true);
          setDraftRestored(true);
        }
      }
    } catch { /* corrupted — ignore */ }
  }, [open]);

  // Show toast for restored draft
  useEffect(() => {
    if (draftRestored) {
      toast('Draft restored', 'info');
      setDraftRestored(false);
    }
  }, [draftRestored, toast]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 120)}px`;
  }, [content]);

  /* ── Click-outside for emoji picker ── */
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  /* ── Character counter ── */
  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;
  const charRatio = Math.min(content.length / MAX_CHARS, 1);

  // SVG donut ring
  const RING_SIZE = 28;
  const RING_R = 10;
  const RING_C = 2 * Math.PI * RING_R;
  const ringColor = isOverLimit
    ? '#ef4444'
    : charRatio > 0.9
      ? '#ef4444'
      : charRatio > 0.8
        ? '#d97706'
        : '#9ca3af';

  /* ── Image handling ── */
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).slice(0, MAX_IMAGES - images.length);
    if (fileArr.length === 0) return;

    const newImages: ImageUpload[] = fileArr.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
    }));

    setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));

    // Upload each
    for (const img of newImages) {
      const err = validateFile(img.file, { maxSizeMB: 5, allowedTypes: ['image/'] });
      if (err) {
        setImages((prev) =>
          prev.map((i) => (i.id === img.id ? { ...i, error: err, progress: 100 } : i)),
        );
        continue;
      }
      try {
        const result = await uploadFile(img.file, 'post-attachments', undefined, (pct) => {
          setImages((prev) =>
            prev.map((i) => (i.id === img.id ? { ...i, progress: pct } : i)),
          );
        });
        setImages((prev) =>
          prev.map((i) => (i.id === img.id ? { ...i, url: result.url, progress: 100 } : i)),
        );
      } catch {
        setImages((prev) =>
          prev.map((i) => (i.id === img.id ? { ...i, error: 'Upload failed', progress: 100 } : i)),
        );
      }
    }
  }, [images.length]);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  /* ── Drag & Drop ── */
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  /* ── Emoji insertion ── */
  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((prev) => prev + emoji);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    // Restore cursor position after emoji
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  /* ── Link handling ── */
  const handleLinkConfirm = () => {
    if (!linkURL.trim()) {
      setShowLinkInput(false);
      setLinkURL('');
      return;
    }
    try {
      const url = new URL(linkURL.startsWith('http') ? linkURL : `https://${linkURL}`);
      if (!['http:', 'https:'].includes(url.protocol)) {
        toast('Please enter a valid URL', 'error');
        return;
      }
      setLinkURL(url.href);
      setShowLinkInput(false);
    } catch {
      toast('Please enter a valid URL', 'error');
    }
  };

  const removeLink = () => {
    setLinkURL('');
    setShowLinkInput(false);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!content.trim() || isOverLimit) return;

    // Check images are done uploading
    const uploading = images.some((i) => !i.url && !i.error);
    if (uploading) {
      toast('Please wait for images to finish uploading', 'warning');
      return;
    }

    const successfulImages = images.filter((i) => i.url).map((i) => i.url!);
    const hasImages = successfulImages.length > 0;
    const hasLink = !!linkURL;

    // Auto-derive type if not explicitly chosen
    let finalType = postType;
    if (finalType === 'text' && hasImages) finalType = 'image';
    if (finalType === 'text' && hasLink && !hasImages) finalType = 'link';

    setPosting(true);
    try {
      await onSubmit({
        content: content.trim(),
        type: finalType,
        imageURLs: hasImages ? successfulImages : undefined,
        linkURL: hasLink ? linkURL : undefined,
        audience,
      });
      // Reset everything
      setContent('');
      setPostType('text');
      setAudience('all');
      setLinkURL('');
      setShowLinkInput(false);
      setImages([]);
      clearDraft();
      onClose();
    } catch {
      toast('Failed to create post', 'error');
    } finally {
      setPosting(false);
    }
  };

  /* ── Reset on close ── */
  const handleClose = () => {
    setShowEmojiPicker(false);
    setShowLinkInput(false);
    onClose();
  };

  /* ── Computed ── */
  const canSubmit = content.trim().length > 0 && !isOverLimit && !posting;
  const hasAttachments = images.length > 0 || !!linkURL;

  /* ═══════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════ */

  return (
    <Modal open={open} onClose={handleClose} size="lg" className="!p-0 overflow-hidden">
      {/* Cranberry accent bar */}
      <div className="h-1 bg-gradient-to-r from-cranberry-600 via-cranberry to-cranberry-800" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <Avatar src={member?.photoURL} alt={member?.displayName || ''} size="md" />
          <div>
            <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg leading-tight">
              Create Post
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={() => setAudience(audience === 'all' ? 'board' : 'all')}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-cranberry dark:hover:text-cranberry-400 transition-colors rounded-lg px-1.5 py-0.5 -mx-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {audience === 'all' ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    All Members
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Board Only
                  </>
                )}
                <svg className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* ── Post type pills ── */}
      <div className="px-6 pb-3">
        <div className="flex items-center gap-1.5">
          {POST_TYPES.map((pt) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => setPostType(pt.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                postType === pt.id
                  ? pt.activeClass + ' shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 ' + pt.color + ' hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-sm leading-none">{pt.icon}</span>
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Textarea with drag-and-drop ── */}
      <div
        className="relative px-6"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 mx-6 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-cranberry-400 bg-cranberry-50/80 dark:bg-cranberry-900/30 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-cranberry-600 dark:text-cranberry-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
              <p className="text-sm font-semibold">Drop images here</p>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            postType === 'announcement'
              ? 'Write your announcement…'
              : postType === 'spotlight'
                ? 'Recognize someone amazing…'
                : 'What would you like to share?'
          }
          className="w-full bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-[15px] leading-relaxed resize-none focus:outline-none min-h-[120px]"
          maxLength={MAX_CHARS + 50}
        />
      </div>

      {/* ── Attachments area ── */}
      {hasAttachments && (
        <div className="px-6 pb-2 space-y-3">
          {/* Image grid */}
          {images.length > 0 && (
            <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video">
                  <img
                    src={img.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {/* Upload progress overlay */}
                  {img.progress < 100 && !img.error && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-12 h-12">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="14" fill="none" stroke="white" strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 14}
                            strokeDashoffset={2 * Math.PI * 14 * (1 - img.progress / 100)}
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  {/* Error overlay */}
                  {img.error && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-[1px]">
                      <p className="text-xs font-medium text-white bg-red-600 px-2 py-1 rounded-lg">{img.error}</p>
                    </div>
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all"
                    aria-label="Remove image"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link preview card */}
          {linkURL && !showLinkInput && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 group">
              <div className="w-10 h-10 rounded-lg bg-azure-100 dark:bg-azure-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-azure-600 dark:text-azure-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.313a4.5 4.5 0 00-6.364 0L4.5 14.25m11.19-5.562l4.5-4.5a4.5 4.5 0 00-6.364-6.364l-4.5 4.5" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {(() => { try { return new URL(linkURL).hostname.replace('www.', ''); } catch { return 'Link'; } })()}
                </p>
                <p className="text-xs text-gray-400 truncate">{linkURL}</p>
              </div>
              <button
                type="button"
                onClick={removeLink}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Remove link"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Link URL input (inline, below textarea) ── */}
      {showLinkInput && !linkURL && (
        <div className="px-6 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.313a4.5 4.5 0 00-6.364 0L4.5 14.25m11.19-5.562l4.5-4.5a4.5 4.5 0 00-6.364-6.364l-4.5 4.5" /></svg>
              </div>
              <input
                ref={linkInputRef}
                type="url"
                placeholder="Paste a URL…"
                value={linkURL}
                onChange={(e) => setLinkURL(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLinkConfirm()}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-300 dark:focus:border-cranberry-700 transition-all"
                autoFocus
              />
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={handleLinkConfirm}>Add</Button>
            <button
              type="button"
              onClick={() => { setShowLinkInput(false); setLinkURL(''); }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="border-t border-gray-100 dark:border-gray-800 mx-6" />

      {/* ── Footer toolbar ── */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-0.5 relative">
          {/* Image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={images.length >= MAX_IMAGES ? `Max ${MAX_IMAGES} images` : 'Add images'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files) processFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Link button */}
          <button
            type="button"
            onClick={() => {
              if (linkURL) {
                removeLink();
              } else {
                setShowLinkInput(!showLinkInput);
                requestAnimationFrame(() => linkInputRef.current?.focus());
              }
            }}
            className={`p-2.5 rounded-xl transition-colors ${
              linkURL || showLinkInput
                ? 'text-azure-600 bg-azure-50 dark:text-azure-400 dark:bg-azure-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10'
            }`}
            title="Add link"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.313a4.5 4.5 0 00-6.364 0L4.5 14.25m11.19-5.562l4.5-4.5a4.5 4.5 0 00-6.364-6.364l-4.5 4.5" /></svg>
          </button>

          {/* Emoji button */}
          <div className="relative" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2.5 rounded-xl transition-colors ${
                showEmojiPicker
                  ? 'text-gold-600 bg-gold-50 dark:text-gold-400 dark:bg-gold-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-cranberry hover:bg-cranberry-50 dark:hover:bg-cranberry-900/10'
              }`}
              title="Add emoji"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
            </button>

            {/* Emoji picker popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-[320px] max-h-[280px] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl animate-scale-in origin-bottom-left p-3 z-50">
                {EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.label} className="mb-2 last:mb-0">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">{cat.label}</p>
                    <div className="grid grid-cols-8 gap-0.5">
                      {cat.emojis.map((emoji, i) => (
                        <button
                          key={`${cat.label}-${i}`}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1.5" />

          {/* Donut character counter */}
          <div className="flex items-center gap-1.5">
            <svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 36 36" className="-rotate-90">
              <circle
                cx="18" cy="18" r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="3"
                className="text-gray-400 dark:text-gray-600"
              />
              {content.length > 0 && (
                <circle
                  cx="18" cy="18" r={RING_R}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="3"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - charRatio)}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              )}
            </svg>
            {charsLeft <= 100 && (
              <span className={`text-xs tabular-nums font-semibold ${isOverLimit ? 'text-red-500' : 'text-amber-600'}`}>
                {charsLeft}
              </span>
            )}
          </div>
        </div>

        {/* Post button */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={posting}
          className="!rounded-full !px-6 bg-gradient-to-r from-cranberry-600 to-cranberry-700 hover:from-cranberry-700 hover:to-cranberry-800 shadow-lg shadow-cranberry-500/20 hover:shadow-cranberry-500/30 transition-all"
        >
          Post
        </Button>
      </div>
    </Modal>
  );
}
