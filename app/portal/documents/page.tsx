'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth';
import { useDocuments, useDocumentFolders, apiDelete, apiPatch, apiPost } from '@/hooks/useFirestore';
import { useToast } from '@/components/ui/Toast';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as getDb } from '@/lib/firebase/client';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchInput from '@/components/ui/SearchInput';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import type { PortalDocument, DocumentCategory, DocumentFolder } from '@/types';
import { DOCUMENT_CATEGORIES } from '@/types';
import {
  ClipboardList,
  ScrollText,
  Scale,
  BookOpen,
  BarChart3,
  DollarSign,
  FileText,
  FolderOpen,
  Folder,
  FolderPlus,
  File,
  Pin,
  PinOff,
  Trash2,
  Download,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  MoreVertical,
  FolderInput,
  ArrowUpDown,
  type LucideIcon,
} from 'lucide-react';

// ── Visual config ────────────────────────────────────────────────
const categoryMeta: Record<DocumentCategory, { color: 'cranberry' | 'azure' | 'gold' | 'green' | 'gray'; Icon: LucideIcon; description: string }> = {
  Minutes:        { color: 'azure',     Icon: ClipboardList, description: 'Board & general meeting minutes' },
  Policies:       { color: 'cranberry', Icon: ScrollText,    description: 'Club policies and procedures' },
  Bylaws:         { color: 'cranberry', Icon: Scale,         description: 'Club bylaws and amendments' },
  Handbook:       { color: 'gold',      Icon: BookOpen,      description: 'Member handbooks and guides' },
  Reports:        { color: 'green',     Icon: BarChart3,     description: 'Monthly / annual reports' },
  Financial:      { color: 'gold',      Icon: DollarSign,    description: 'Budgets, treasurer reports, receipts' },
  Templates:      { color: 'gray',      Icon: FileText,      description: 'Reusable form & letter templates' },
  'Google Drive': { color: 'azure',     Icon: FolderOpen,    description: 'Shared Google Drive folders' },
  Other:          { color: 'gray',      Icon: File,          description: 'Miscellaneous documents' },
};

type FolderColor = DocumentFolder['color'];

const FOLDER_COLORS: { value: FolderColor; label: string }[] = [
  { value: 'cranberry', label: 'Cranberry' },
  { value: 'azure',     label: 'Azure' },
  { value: 'gold',      label: 'Gold' },
  { value: 'green',     label: 'Green' },
  { value: 'purple',    label: 'Purple' },
  { value: 'teal',      label: 'Teal' },
  { value: 'gray',      label: 'Gray' },
];

const folderColorClasses: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  cranberry: { bg: 'bg-cranberry-50 dark:bg-cranberry-900/20', text: 'text-cranberry-600 dark:text-cranberry-400', border: 'border-cranberry-200 dark:border-cranberry-800', dot: 'bg-cranberry-500' },
  azure:     { bg: 'bg-azure-50 dark:bg-azure-900/20',       text: 'text-azure-600 dark:text-azure-400',       border: 'border-azure-200 dark:border-azure-800',       dot: 'bg-azure-500' },
  gold:      { bg: 'bg-amber-50 dark:bg-amber-900/20',       text: 'text-amber-600 dark:text-amber-400',       border: 'border-amber-200 dark:border-amber-800',       dot: 'bg-amber-500' },
  green:     { bg: 'bg-emerald-50 dark:bg-emerald-900/20',   text: 'text-emerald-600 dark:text-emerald-400',   border: 'border-emerald-200 dark:border-emerald-800',   dot: 'bg-emerald-500' },
  purple:    { bg: 'bg-purple-50 dark:bg-purple-900/20',     text: 'text-purple-600 dark:text-purple-400',     border: 'border-purple-200 dark:border-purple-800',     dot: 'bg-purple-500' },
  teal:      { bg: 'bg-teal-50 dark:bg-teal-900/20',         text: 'text-teal-600 dark:text-teal-400',         border: 'border-teal-200 dark:border-teal-800',         dot: 'bg-teal-500' },
  gray:      { bg: 'bg-gray-50 dark:bg-gray-800/50',         text: 'text-gray-500 dark:text-gray-400',         border: 'border-gray-200 dark:border-gray-700',         dot: 'bg-gray-500' },
};

// ── Helpers ──────────────────────────────────────────────────────
function toGDriveEmbedUrl(url: string): string | null {
  const folderMatch = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const docsMatch = url.match(/(docs|spreadsheets|presentation)\.google\.com\/.*\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return url.replace(/\/edit.*/, '/preview');
  return null;
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

// ── Page ─────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const { data: rawDocs, loading: docsLoading } = useDocuments();
  const { data: rawFolders, loading: foldersLoading } = useDocumentFolders();
  const docs = rawDocs as PortalDocument[];
  const folders = rawFolders as DocumentFolder[];

  const loading = docsLoading || foldersLoading;

  const [search, setSearch] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedDrive, setExpandedDrive] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'category'>('newest');

  // Folder management
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);
  const [folderForm, setFolderForm] = useState<{ name: string; color: FolderColor }>({ name: '', color: 'azure' });
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);

  // Move document to folder
  const [movingDoc, setMovingDoc] = useState<PortalDocument | null>(null);

  const [uploadForm, setUploadForm] = useState<{
    title: string;
    category: DocumentCategory;
    description: string;
    linkURL: string;
    folderId: string;
  }>({ title: '', category: 'Other', description: '', linkURL: '', folderId: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const isBoardOrAbove = member?.role === 'board' || member?.role === 'president' || member?.role === 'treasurer';

  // Current open folder object
  const currentFolder = useMemo(() =>
    openFolderId ? folders.find((f) => f.id === openFolderId) ?? null : null,
    [openFolderId, folders],
  );

  // ── Filtering & Sorting ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = docs;
    if (openFolderId === '__unfiled__') {
      list = list.filter((d) => !d.folderId);
    } else if (openFolderId) {
      list = list.filter((d) => d.folderId === openFolderId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.uploadedByName?.toLowerCase().includes(q),
      );
    }
    // Apply sort
    const sorted = [...list];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        break;
      case 'oldest':
        sorted.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'category':
        sorted.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        break;
    }
    return sorted;
  }, [docs, openFolderId, search, sortBy]);

  const pinned = useMemo(() => docs.filter((d) => d.pinned), [docs]);

  // Sorted folders: pinned first, then by order
  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [folders]);

  // Document counts per folder
  const folderDocCounts = useMemo(() => {
    const counts = new Map<string, number>();
    docs.forEach((d) => {
      if (d.folderId) counts.set(d.folderId, (counts.get(d.folderId) || 0) + 1);
    });
    return counts;
  }, [docs]);

  // Unfiled documents count
  const unfiledCount = useMemo(() =>
    docs.filter((d) => !d.folderId).length,
    [docs],
  );

  // ── Folder CRUD ────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!folderForm.name.trim()) return;
    setSavingFolder(true);
    try {
      await apiPost('/api/portal/document-folders', {
        name: folderForm.name.trim(),
        color: folderForm.color,
      });
      toast('Folder created!');
      setShowCreateFolder(false);
      setFolderForm({ name: '', color: 'azure' });
    } catch (err: any) {
      toast(err.message || 'Failed to create folder', 'error');
    } finally {
      setSavingFolder(false);
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder || !folderForm.name.trim()) return;
    setSavingFolder(true);
    try {
      await apiPatch('/api/portal/document-folders', {
        id: editingFolder.id,
        name: folderForm.name.trim(),
        color: folderForm.color,
      });
      toast('Folder updated!');
      setEditingFolder(null);
      setFolderForm({ name: '', color: 'azure' });
    } catch (err: any) {
      toast(err.message || 'Failed to update folder', 'error');
    } finally {
      setSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? Documents inside will be moved to "Unfiled".')) return;
    try {
      await apiDelete(`/api/portal/document-folders?id=${folderId}`);
      toast('Folder deleted.');
      if (openFolderId === folderId) setOpenFolderId(null);
    } catch (err: any) {
      toast(err.message || 'Failed to delete folder', 'error');
    }
  };

  const handleTogglePinFolder = async (folder: DocumentFolder) => {
    try {
      await apiPatch('/api/portal/document-folders', { id: folder.id, pinned: !folder.pinned });
      toast(folder.pinned ? 'Folder unpinned.' : 'Folder pinned!');
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    }
    setFolderMenuOpen(null);
  };

  // ── Move document to folder ────────────────────────────────────
  const handleMoveDoc = async (docId: string, folderId: string | null) => {
    try {
      await apiPatch('/api/portal/documents', { id: docId, folderId: folderId || '' });
      toast(folderId ? 'Document moved!' : 'Document moved to Unfiled.');
      setMovingDoc(null);
    } catch (err: any) {
      toast(err.message || 'Failed to move document', 'error');
    }
  };

  // ── Upload handler ─────────────────────────────────────────────
  const handleUpload = async () => {
    if (!member || !uploadForm.title.trim()) return;

    const isLink = uploadForm.category === 'Google Drive' || uploadForm.linkURL.trim();
    const file = fileRef.current?.files?.[0];

    if (!isLink && !file) { toast('Please select a file or enter a link.', 'error'); return; }

    if (file) {
      const err = validateFile(file, { maxSizeMB: 25, allowedTypes: ['application/pdf', 'application/vnd', 'text/', 'image/'] });
      if (err) { toast(err, 'error'); return; }
    }

    setUploading(true);
    try {
      let fileURL = '';
      let storagePath = '';

      if (file) {
        const result = await uploadFile(file, 'documents', undefined, setUploadProgress);
        fileURL = result.url;
        storagePath = result.path;
      }

      await addDoc(collection(getDb(), 'documents'), {
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || null,
        category: uploadForm.category,
        folderId: uploadForm.folderId || (openFolderId || null),
        ...(fileURL ? { fileURL, storagePath } : {}),
        ...(uploadForm.linkURL.trim() ? { linkURL: uploadForm.linkURL.trim() } : {}),
        pinned: false,
        uploadedBy: member.id,
        uploadedByName: member.displayName,
        createdAt: serverTimestamp(),
      });
      toast('Document uploaded!');
      setShowUpload(false);
      setUploadForm({ title: '', category: 'Other', description: '', linkURL: '', folderId: '' });
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      toast(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Actions ────────────────────────────────────────────────────
  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await apiDelete(`/api/portal/documents?id=${docId}`);
      toast('Document deleted.');
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleTogglePin = async (doc: PortalDocument) => {
    try {
      await apiPatch('/api/portal/documents', { id: doc.id, pinned: !doc.pinned });
      toast(doc.pinned ? 'Unpinned.' : 'Pinned to top!');
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    }
  };

  // ── Render a single document row ──────────────────────────────
  const renderDocRow = (doc: PortalDocument) => {
    const meta = categoryMeta[doc.category as DocumentCategory] || categoryMeta.Other;
    const DocIcon = meta.Icon;
    const colors = folderColorClasses[meta.color] || folderColorClasses.gray;
    const url = doc.fileURL || doc.linkURL;
    const isGDrive = doc.category === 'Google Drive' && doc.linkURL;
    const embedUrl = isGDrive ? toGDriveEmbedUrl(doc.linkURL!) : null;

    return (
      <div key={doc.id}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
                <DocIcon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {doc.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{doc.title}</h3>
                </div>
                {doc.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{doc.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant={meta.color}>{doc.category}</Badge>
                  <span className="text-xs text-gray-400">{doc.uploadedByName}</span>
                  {doc.createdAt && <span className="text-xs text-gray-400">· {formatDate(doc.createdAt)}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {embedUrl && (
                <button
                  onClick={() => setExpandedDrive(expandedDrive === doc.id ? null : doc.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-azure-600 hover:bg-azure-50 dark:hover:bg-azure-900/10 transition-colors"
                  title="Preview in page"
                >
                  {expandedDrive === doc.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-cranberry hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title={doc.fileURL ? 'Download' : 'Open link'}>
                  {doc.fileURL ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                </a>
              )}
              {isBoardOrAbove && (
                <>
                  <button onClick={() => setMovingDoc(doc)} className="p-2 rounded-lg text-gray-400 hover:text-azure-600 hover:bg-azure-50 dark:hover:bg-azure-900/10 transition-colors" title="Move to folder">
                    <FolderInput className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleTogglePin(doc)} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors" title={doc.pinned ? 'Unpin' : 'Pin to top'}>
                    {doc.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {embedUrl && expandedDrive === doc.id && (
          <div className="mt-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <iframe src={embedUrl} className="w-full h-[300px] sm:h-[500px] bg-white" title={doc.title} allow="autoplay" />
          </div>
        )}
      </div>
    );
  };

  // ── Render a folder card ───────────────────────────────────────
  const renderFolderCard = (folder: DocumentFolder) => {
    const colors = folderColorClasses[folder.color] || folderColorClasses.gray;
    const count = folderDocCounts.get(folder.id) || 0;

    return (
      <div key={folder.id} className="relative group">
        <button
          onClick={() => { setOpenFolderId(folder.id); setSearch(''); }}
          className={`w-full flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all hover:shadow-md hover:scale-[1.02] ${colors.border} ${colors.bg} cursor-pointer text-left`}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center">
            <Folder className={`w-8 h-8 ${colors.text}`} />
          </div>
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-1.5">
              {folder.pinned && <Pin className="w-3 h-3 text-amber-500" />}
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{folder.name}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{count} {count === 1 ? 'document' : 'documents'}</p>
          </div>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600 transition-colors" />
        </button>

        {/* Folder context menu trigger */}
        {isBoardOrAbove && (
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/80 dark:hover:bg-gray-800/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {folderMenuOpen === folder.id && (
              <div className="absolute right-0 top-8 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolder(folder);
                    setFolderForm({ name: folder.name, color: folder.color });
                    setFolderMenuOpen(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleTogglePinFolder(folder); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {folder.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  {folder.pinned ? 'Unpin' : 'Pin to top'}
                </button>
                <hr className="my-1 border-gray-100 dark:border-gray-800" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); setFolderMenuOpen(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Close folder menu when clicking outside
  const handlePageClick = useCallback(() => {
    if (folderMenuOpen) setFolderMenuOpen(null);
  }, [folderMenuOpen]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter" onClick={handlePageClick}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Meeting minutes, bylaws, handbooks, reports &amp; shared folders.
          </p>
        </div>
        {isBoardOrAbove && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { setShowCreateFolder(true); setFolderForm({ name: '', color: 'azure' }); }}>
              <FolderPlus className="w-4 h-4 mr-1.5 inline" />New Folder
            </Button>
            <Button onClick={() => {
              setShowUpload(!showUpload);
              if (!showUpload) setUploadForm({ title: '', category: 'Other', description: '', linkURL: '', folderId: openFolderId && openFolderId !== '__unfiled__' ? openFolderId : '' });
            }}>
              {showUpload ? 'Cancel' : <><Plus className="w-4 h-4 mr-1.5 inline" />Upload</>}
            </Button>
          </div>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Upload Document</h3>
          <div className="space-y-4">
            <Input
              label="Title"
              required
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="e.g., Board Meeting Minutes — Feb 2026"
            />

            <Input
              label="Description (optional)"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Brief description of the document"
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as DocumentCategory })}
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Folder</label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cranberry-500/20 focus:border-cranberry-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                  value={uploadForm.folderId}
                  onChange={(e) => setUploadForm({ ...uploadForm, folderId: e.target.value })}
                >
                  <option value="">— No Folder (Unfiled) —</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {uploadForm.category === 'Google Drive' ? (
              <Input
                label="Google Drive URL"
                required
                value={uploadForm.linkURL}
                onChange={(e) => setUploadForm({ ...uploadForm, linkURL: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
              />
            ) : (
              <>
                <Input
                  label="Link URL (optional — use instead of file)"
                  value={uploadForm.linkURL}
                  onChange={(e) => setUploadForm({ ...uploadForm, linkURL: e.target.value })}
                  placeholder="https://docs.google.com/document/d/..."
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">File</label>
                  <input
                    type="file"
                    ref={fileRef}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cranberry-50 file:text-cranberry-700 hover:file:bg-cranberry-100 dark:file:bg-cranberry-900/20 dark:file:text-cranberry-300"
                  />
                </div>
              </>
            )}

            {uploading && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-cranberry h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <Button onClick={handleUpload} loading={uploading}>
              {uploadForm.category === 'Google Drive' ? 'Add Drive Link' : 'Upload'}
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-6">
          {/* ── Folders strip — always visible at top ─────────── */}
          {sortedFolders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-1 mb-3">
                <Folder className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Folders</h2>
                <span className="text-xs text-gray-400">({sortedFolders.length})</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                {/* "All Documents" chip */}
                <button
                  onClick={() => { setOpenFolderId(null); setSearch(''); }}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    !openFolderId
                      ? 'border-cranberry bg-cranberry-50 dark:bg-cranberry-900/10 text-cranberry-700 dark:text-cranberry-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <File className="w-4 h-4" />
                  All
                  <span className="text-xs opacity-70">({docs.length})</span>
                </button>

                {sortedFolders.map((folder) => {
                  const colors = folderColorClasses[folder.color] || folderColorClasses.gray;
                  const count = folderDocCounts.get(folder.id) || 0;
                  const isActive = openFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => { setOpenFolderId(isActive ? null : folder.id); setSearch(''); }}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        isActive
                          ? `${colors.border} ${colors.bg} ${colors.text}`
                          : `border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:${colors.bg}`
                      }`}
                    >
                      {folder.pinned && <Pin className="w-3 h-3 text-amber-500" />}
                      <Folder className={`w-4 h-4 ${isActive ? colors.text : 'text-gray-400'}`} />
                      <span className="whitespace-nowrap">{folder.name}</span>
                      <span className="text-xs opacity-70">({count})</span>
                    </button>
                  );
                })}

                {/* Unfiled chip */}
                {unfiledCount > 0 && (
                  <button
                    onClick={() => { setOpenFolderId('__unfiled__'); setSearch(''); }}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      openFolderId === '__unfiled__'
                        ? 'border-gray-400 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <File className="w-4 h-4 text-gray-400" />
                    Unfiled
                    <span className="text-xs opacity-70">({unfiledCount})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Search + Sort bar ─────────────────────────────── */}
          {(docs.length > 0 || folders.length > 0) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={openFolderId && openFolderId !== '__unfiled__' ? `Search in ${currentFolder?.name || 'folder'}...` : 'Search all documents...'}
                className="max-w-sm flex-1"
              />
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cranberry-500/20"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Active folder header ──────────────────────────── */}
          {openFolderId && openFolderId !== '__unfiled__' && currentFolder && (
            <div className="flex items-center gap-3 px-1">
              <FolderOpen className={`w-5 h-5 ${(folderColorClasses[currentFolder.color] || folderColorClasses.gray).text}`} />
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">{currentFolder.name}</h2>
              {currentFolder.pinned && <Pin className="w-4 h-4 text-amber-500" />}
              <span className="text-sm text-gray-400">({folderDocCounts.get(currentFolder.id) || 0} documents)</span>
            </div>
          )}

          {openFolderId === '__unfiled__' && (
            <div className="flex items-center gap-3 px-1">
              <File className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white">Unfiled Documents</h2>
              <span className="text-sm text-gray-400">({unfiledCount})</span>
            </div>
          )}

          {/* ── Pinned docs ───────────────────────────────────── */}
          {!openFolderId && !search.trim() && pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Pin className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Pinned</h2>
              </div>
              <div className="space-y-2">{pinned.map(renderDocRow)}</div>
            </div>
          )}

          {/* ── Folder grid (when not filtering by folder) ────── */}
          {!openFolderId && !search.trim() && sortedFolders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-1 mb-4">
                <Folder className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Browse Folders</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sortedFolders.map(renderFolderCard)}
              </div>
            </div>
          )}

          {/* ── Document list ─────────────────────────────────── */}
          {(search.trim() || openFolderId) ? (
            <div className="space-y-2">
              {search.trim() && (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
                </p>
              )}
              {filtered.length === 0 ? (
                <EmptyState
                  icon={openFolderId ? <FolderOpen className="w-12 h-12" /> : <File className="w-12 h-12" />}
                  title="No documents found"
                  description={
                    search
                      ? 'Try a different search term.'
                      : 'This folder is empty. Upload a document to get started.'
                  }
                />
              ) : (
                filtered.map(renderDocRow)
              )}
            </div>
          ) : (
            /* Show unfiled documents when at root */
            unfiledCount > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <File className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Unfiled ({unfiledCount})
                  </h2>
                </div>
                <div className="space-y-2">
                  {docs.filter((d) => !d.folderId).map(renderDocRow)}
                </div>
              </div>
            )
          )}

          {/* Empty state when no content at all */}
          {!openFolderId && !search.trim() && sortedFolders.length === 0 && docs.length === 0 && (
            <EmptyState
              icon={<File className="w-12 h-12" />}
              title="No documents yet"
              description={isBoardOrAbove ? 'Create a folder and start uploading documents.' : 'No documents have been uploaded yet.'}
            />
          )}
        </div>
      )}

      {/* ── Create Folder Modal ───────────────────────── */}
      {showCreateFolder && (
        <Modal open title="Create Folder" onClose={() => setShowCreateFolder(false)}>
          <div className="space-y-4">
            <Input
              label="Folder Name"
              required
              value={folderForm.name}
              onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
              placeholder="e.g., Board Meetings 2026"
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => {
                  const cls = folderColorClasses[c.value] || folderColorClasses.gray;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setFolderForm({ ...folderForm, color: c.value })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${
                        folderForm.color === c.value
                          ? `${cls.border} ${cls.bg} font-semibold`
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${cls.dot}`} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreateFolder(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} loading={savingFolder} disabled={!folderForm.name.trim()}>
                Create Folder
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Folder Modal ─────────────────────────── */}
      {editingFolder && (
        <Modal open title="Edit Folder" onClose={() => setEditingFolder(null)}>
          <div className="space-y-4">
            <Input
              label="Folder Name"
              required
              value={folderForm.name}
              onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => {
                  const cls = folderColorClasses[c.value] || folderColorClasses.gray;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setFolderForm({ ...folderForm, color: c.value })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${
                        folderForm.color === c.value
                          ? `${cls.border} ${cls.bg} font-semibold`
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${cls.dot}`} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditingFolder(null)}>Cancel</Button>
              <Button onClick={handleUpdateFolder} loading={savingFolder} disabled={!folderForm.name.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Move to Folder Modal ──────────────────────── */}
      {movingDoc && (
        <Modal open title="Move Document" onClose={() => setMovingDoc(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Move <span className="font-semibold text-gray-900 dark:text-white">{movingDoc.title}</span> to:
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleMoveDoc(movingDoc.id, null)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  !movingDoc.folderId ? 'bg-cranberry-50 dark:bg-cranberry-900/10 border-2 border-cranberry-200 dark:border-cranberry-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                }`}
              >
                <File className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unfiled</span>
                {!movingDoc.folderId && <Badge variant="cranberry" className="ml-auto text-[10px]">Current</Badge>}
              </button>
              {sortedFolders.map((f) => {
                const cls = folderColorClasses[f.color] || folderColorClasses.gray;
                const isCurrent = movingDoc.folderId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleMoveDoc(movingDoc.id, f.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      isCurrent ? `${cls.bg} border-2 ${cls.border}` : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                    }`}
                  >
                    <Folder className={`w-5 h-5 ${cls.text}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.name}</span>
                    {isCurrent && <Badge variant={f.color as any} className="ml-auto text-[10px]">Current</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
