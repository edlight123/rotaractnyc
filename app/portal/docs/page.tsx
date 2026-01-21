'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { addDoc, collection, query, where, getDocs, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Document } from '@/types/portal';
import { 
  FiFileText, 
  FiDownload, 
  FiExternalLink, 
  FiSearch, 
  FiUpload,
  FiEye,
  FiEdit,
  FiTrash2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiFile
} from 'react-icons/fi';

// Helper function to generate consistent colors for categories
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsl(${hue}, 85%, 96%)`,
    darkBg: `hsl(${hue}, 60%, 15%)`,
    text: `hsl(${hue}, 70%, 45%)`,
    darkText: `hsl(${hue}, 70%, 70%)`,
    border: `hsl(${hue}, 60%, 85%)`,
    darkBorder: `hsl(${hue}, 50%, 25%)`,
  };
};

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'category';

export default function DocumentsPage() {
  const { loading, user, userData } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Minutes');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<'link' | 'file'>('file');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canUpload = userData?.role === 'BOARD' || userData?.role === 'TREASURER' || userData?.role === 'ADMIN';

  useEffect(() => {
    if (!loading) {
      loadDocuments();
    }
  }, [loading]);

  useEffect(() => {
    filterAndSortDocuments();
  }, [documents, selectedCategory, searchQuery, sortBy]);

  const loadDocuments = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const documentsRef = collection(db, 'documents');
      const documentsQuery = query(
        documentsRef,
        where('visibility', '==', 'member'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(documentsQuery);
      const documentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Document[];
      
      setDocuments(documentsData);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(
        documentsData.map(d => d.category)
      )).sort();
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const filterAndSortDocuments = () => {
    let filtered = documents;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        case 'date-asc':
          return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
    
    setFilteredDocuments(sorted);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return { month: '', day: '', year: '' };
    const date = timestamp.toDate();
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate().toString(),
      year: date.getFullYear().toString()
    };
  };

  const getCategoryColor = (category: string) => {
    const colors = stringToColor(category);
    return {
      light: `bg-[${colors.bg}] text-[${colors.text}] border-[${colors.border}]`,
      dark: `dark:bg-[${colors.darkBg}] dark:text-[${colors.darkText}] dark:border-[${colors.darkBorder}]`,
      style: {
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }
    };
  };

  const getFileIcon = (url: string, title: string) => {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    if (urlLower.includes('.pdf') || titleLower.includes('pdf')) {
      return { icon: '📄', color: 'text-red-500', name: 'PDF' };
    }
    if (urlLower.includes('.doc') || titleLower.includes('doc')) {
      return { icon: '📘', color: 'text-blue-500', name: 'Word' };
    }
    if (urlLower.includes('.xls') || titleLower.includes('excel')) {
      return { icon: '📗', color: 'text-green-500', name: 'Excel' };
    }
    if (urlLower.startsWith('http')) {
      return { icon: '🔗', color: 'text-purple-500', name: 'Link' };
    }
    return { icon: '📎', color: 'text-gray-500', name: 'File' };
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Minutes': 'gavel',
      'Service': 'handshake',
      'Finance': 'payments',
      'Events': 'event',
    };
    return icons[category] || 'folder';
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Pinned documents
  const pinnedDocs = documents.filter(d => d.isPinned).slice(0, 3);

  const trackDownload = async (docId: string) => {
    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);
    
    try {
      const docRef = doc(db, 'documents', docId);
      await updateDoc(docRef, {
        downloadCount: increment(1),
        lastDownloaded: serverTimestamp()
      });
    } catch (error) {
      console.error('Error tracking download:', error);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!canUpload) return;
    
    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);
    
    try {
      await deleteDoc(doc(db, 'documents', docId));
      setDocuments(documents.filter(d => d.id !== docId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleEdit = async () => {
    if (!editDoc || !canUpload) return;
    
    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);
    
    try {
      const docRef = doc(db, 'documents', editDoc.id);
      await updateDoc(docRef, {
        title: editDoc.title,
        category: editDoc.category,
        description: editDoc.description || '',
        isPinned: editDoc.isPinned || false,
      });
      
      setDocuments(documents.map(d => d.id === editDoc.id ? editDoc : d));
      setEditDoc(null);
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update document');
    }
  };

  const togglePin = async (docId: string) => {
    if (!canUpload) return;
    
    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);
    
    const document = documents.find(d => d.id === docId);
    if (!document) return;
    
    try {
      const docRef = doc(db, 'documents', docId);
      await updateDoc(docRef, {
        isPinned: !document.isPinned
      });
      
      setDocuments(documents.map(d => 
        d.id === docId ? { ...d, isPinned: !d.isPinned } : d
      ));
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files: File[]) => {
    setUploadError('');
    const validFiles: File[] = [];
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`${file.name}: Invalid file type. Please upload PDF, Word, or Excel files only.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`${file.name}: File too large. Maximum size is 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setUploadFiles(validFiles);
      // Auto-populate title if only one file
      if (validFiles.length === 1 && !uploadTitle) {
        const fileName = validFiles[0].name.replace(/\.[^/.]+$/, ''); // Remove extension
        setUploadTitle(fileName);
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(uploadFiles.filter((_, i) => i !== index));
  };

  const resetUploadModal = () => {
    setUploadOpen(false);
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('Minutes');
    setUploadUrl('');
    setUploadFile(null);
    setUploadFiles([]);
    setUploadType('file');
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess(false);
    setIsDragging(false);
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const submitUpload = async () => {
    if (!canUpload) {
      setUploadError('Only board members can add documents.');
      return;
    }
    if (!user?.uid) return;
    
    // Clear previous errors
    setUploadError('');
    
    // Validate inputs
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a title');
      return;
    }
    if (!uploadCategory.trim()) {
      setUploadError('Please select or enter a category');
      return;
    }
    
    // Validate based on upload type
    if (uploadType === 'link' && !uploadUrl.trim()) {
      setUploadError('Please provide a URL');
      return;
    }
    if (uploadType === 'file' && uploadFiles.length === 0) {
      setUploadError('Please select at least one file to upload');
      return;
    }

    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const filesToUpload = uploadType === 'file' ? uploadFiles : [null];
      const totalFiles = filesToUpload.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = filesToUpload[i];
        let finalUrl = uploadUrl.trim();
        let docTitle = uploadTitle.trim();
        
        // If multiple files, append number to title
        if (totalFiles > 1) {
          docTitle = `${uploadTitle.trim()} (${i + 1}/${totalFiles})`;
        }
        
        // If uploading a file, upload to Firebase Storage first
        if (uploadType === 'file' && file) {
          const storage = getStorage(app);
          const timestamp = Date.now();
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storageRef = ref(storage, `documents/${user.uid}/${timestamp}-${sanitizedFileName}`);
          
          await uploadBytes(storageRef, file);
          finalUrl = await getDownloadURL(storageRef);
          
          // If no custom title provided, use filename
          if (totalFiles === 1 && uploadTitle.trim() === file.name.replace(/\.[^/.]+$/, '')) {
            docTitle = file.name.replace(/\.[^/.]+$/, '');
          }
        }
        
        await addDoc(collection(db, 'documents'), {
          title: docTitle,
          category: uploadCategory.trim(),
          description: uploadDescription.trim() || '',
          url: finalUrl,
          visibility: 'member',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          isPinned: false,
          downloadCount: 0,
          seeded: false,
        });
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      
      setUploadSuccess(true);
      setUploading(false);
      
      // Wait a moment to show success, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error('Error uploading document:', e);
      setUploadError('Failed to add document. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (uploadOpen && !uploading) {
        if (e.key === 'Escape') {
          resetUploadModal();
        } else if (e.key === 'Enter' && e.ctrlKey) {
          // Ctrl+Enter to submit
          const canSubmit = uploadTitle.trim() && uploadCategory.trim() &&
            ((uploadType === 'link' && uploadUrl.trim()) || (uploadType === 'file' && uploadFiles.length > 0));
          if (canSubmit) {
            submitUpload();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploadOpen, uploading, uploadTitle, uploadCategory, uploadUrl, uploadFiles, uploadType]);


  if (loading || loadingData) {
    return (
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {/* Skeleton Header */}
          <div className="h-10 bg-slate-200 rounded-lg animate-pulse w-64"></div>
          <div className="h-4 bg-slate-200 rounded animate-pulse w-96"></div>
          
          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse mb-4"></div>
                <div className="h-5 bg-slate-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
              </div>
            ))}
          </div>
          
          {/* Skeleton List */}
          <div className="space-y-2 mt-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-text-muted" aria-label="Breadcrumb">
          <a href="/portal" className="hover:text-primary transition-colors">Portal</a>
          <span>/</span>
          <span className="text-text-main font-medium">Resource Center</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Resource Center</h1>
          <p className="text-text-muted mt-1 text-base">Access club documents, minutes, and service guidelines.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 shadow-sm transition-all"
              aria-label="Search documents"
            />
          </div>
          {canUpload ? (
            <button
              onClick={() => setUploadOpen(true)}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm shadow-primary/30 transition-all active:scale-95"
              aria-label="Upload new document"
            >
              <FiUpload className="text-[20px]" />
              <span>Upload</span>
            </button>
          ) : (
            <div className="relative group">
              <button
                className="bg-slate-300 text-slate-500 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-not-allowed"
                disabled
                aria-label="Upload (board members only)"
              >
                <FiUpload className="text-[20px]" />
                <span>Upload</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-10">
                Only board members can upload documents
              </div>
            </div>
          )}
        </div>
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => (uploading || uploadSuccess ? null : resetUploadModal())} 
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl">
            {/* Success State */}
            {uploadSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">Upload Successful!</h3>
                <p className="text-text-muted">Your document{uploadFiles.length > 1 ? 's have' : ' has'} been uploaded and will be available shortly.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-text-main">Add Document</h2>
                    <p className="text-sm text-text-muted mt-0.5">Upload files or add external links</p>
                  </div>
                  <button
                    onClick={() => (uploading ? null : resetUploadModal())}
                    className="text-slate-400 hover:text-text-main transition-colors disabled:opacity-50"
                    disabled={uploading}
                    aria-label="Close"
                  >
                    <FiX className="text-xl" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* Error Display */}
                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">{uploadError}</p>
                      </div>
                      <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600">
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  )}

                  {/* Upload Type Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">Upload Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadType('file');
                          setUploadError('');
                        }}
                        disabled={uploading}
                        className={`px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                          uploadType === 'file'
                            ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-text-main'
                        }`}
                      >
                        <FiUpload className="inline mr-2 text-lg" />
                        Upload Files
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadType('link');
                          setUploadError('');
                        }}
                        disabled={uploading}
                        className={`px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                          uploadType === 'link'
                            ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-text-main'
                        }`}
                      >
                        <FiExternalLink className="inline mr-2 text-lg" />
                        Add Link
                      </button>
                    </div>
                  </div>

                  {/* Drag and Drop Zone - Only for file uploads */}
                  {uploadType === 'file' && (
                    <div
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        isDragging
                          ? 'border-primary bg-primary/5 scale-[1.02]'
                          : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
                      } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFileSelection(Array.from(e.target.files));
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <FiUpload className={`mx-auto text-4xl mb-3 ${isDragging ? 'text-primary' : 'text-slate-400'}`} />
                      <p className="text-sm font-semibold text-text-main mb-1">
                        {isDragging ? 'Drop files here' : 'Drag and drop files here'}
                      </p>
                      <p className="text-xs text-text-muted mb-3">or click to browse</p>
                      <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                        <span className="px-2 py-1 bg-slate-100 rounded">PDF</span>
                        <span className="px-2 py-1 bg-slate-100 rounded">Word</span>
                        <span className="px-2 py-1 bg-slate-100 rounded">Excel</span>
                        <span>• Max 10MB each</span>
                      </div>
                    </div>
                  )}

                  {/* Selected Files Display */}
                  {uploadType === 'file' && uploadFiles.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-text-main">
                        Selected Files ({uploadFiles.length})
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <FiFile className="text-primary text-xl flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-main truncate">{file.name}</p>
                              <p className="text-xs text-text-muted">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            {!uploading && (
                              <button
                                onClick={() => removeFile(index)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                aria-label="Remove file"
                              >
                                <FiX />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Title Field */}
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-1.5">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      disabled={uploading}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="e.g., January 2026 Meeting Minutes"
                    />
                  </div>

                  {/* Description Field */}
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-1.5">
                      Description <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      disabled={uploading}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="Brief description of the document..."
                      rows={3}
                    />
                  </div>

                  {/* Category Field with Autocomplete */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-text-main mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        value={uploadCategory}
                        onChange={(e) => {
                          setUploadCategory(e.target.value);
                          setCategorySearch(e.target.value);
                          setShowCategoryDropdown(true);
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        disabled={uploading}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="e.g., Minutes, Events, Finance"
                      />
                      {showCategoryDropdown && !uploading && filteredCategories.length > 0 && uploadCategory !== '' && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredCategories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setUploadCategory(cat);
                                setShowCategoryDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm text-text-main transition-colors"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {categories.length > 0 && (
                      <p className="mt-1.5 text-xs text-text-muted">
                        Existing: {categories.slice(0, 5).join(', ')}{categories.length > 5 ? '...' : ''}
                      </p>
                    )}
                  </div>

                  {/* URL Field - Only for links */}
                  {uploadType === 'link' && (
                    <div>
                      <label className="block text-sm font-semibold text-text-main mb-1.5">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={uploadUrl}
                        onChange={(e) => setUploadUrl(e.target.value)}
                        disabled={uploading}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="https://example.com/document.pdf"
                      />
                      <p className="mt-1.5 text-xs text-text-muted">
                        Link to an external document or resource
                      </p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {uploading && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-text-main">Uploading...</span>
                        <span className="text-text-muted">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                  <p className="text-xs text-text-muted">
                    Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px]">Esc</kbd> to cancel
                    {uploadTitle && uploadCategory && ((uploadType === 'link' && uploadUrl) || (uploadType === 'file' && uploadFiles.length > 0)) && (
                      <> or <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px]">Ctrl+Enter</kbd> to upload</>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={resetUploadModal}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitUpload}
                      disabled={
                        uploading ||
                        !uploadTitle.trim() ||
                        !uploadCategory.trim() ||
                        (uploadType === 'link' && !uploadUrl.trim()) ||
                        (uploadType === 'file' && uploadFiles.length === 0)
                      }
                      className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Uploading...
                        </span>
                      ) : (
                        <>
                          {uploadType === 'file' ? (
                            <>
                              <FiUpload className="inline mr-1.5" />
                              Upload {uploadFiles.length > 1 ? `${uploadFiles.length} Files` : 'File'}
                            </>
                          ) : (
                            <>
                              <FiExternalLink className="inline mr-1.5" />
                              Add Link
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pinned Resources Section */}
      {pinnedDocs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">push_pin</span>
              Pinned Resources
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pinnedDocs.map((doc) => {
              const fileInfo = getFileIcon(doc.url, doc.title);
              return (
              <div
                key={doc.id}
                className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="size-10 rounded-lg bg-[#eaf1f0] flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{getCategoryIcon(doc.category)}</span>
                  </div>
                  <div className="flex gap-1">
                    {canUpload && (
                      <button
                        onClick={() => togglePin(doc.id)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Unpin"
                        aria-label="Unpin document"
                      >
                        <span className="material-symbols-outlined text-primary text-sm">push_pin</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        trackDownload(doc.id);
                        setPreviewDoc(doc);
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                      title="Preview"
                      aria-label="Preview document"
                    >
                      <FiEye className="text-slate-400 group-hover:text-primary transition-colors" />
                    </button>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{fileInfo.icon}</span>
                    <span className="text-xs text-text-muted">{fileInfo.name}</span>
                  </div>
                  <h3 className="font-bold text-text-main mb-1 group-hover:text-primary transition-colors">{doc.title}</h3>
                  <p className="text-sm text-text-muted line-clamp-2">
                    {doc.category} • {formatDate(doc.createdAt).month} {formatDate(doc.createdAt).year}
                    {doc.downloadCount ? ` • ${doc.downloadCount} downloads` : ''}
                  </p>
                </div>
              </div>
            )})}
          </div>
        </section>
      )}

      {/* Club Updates & Minutes */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
          <h2 className="text-lg font-bold text-text-main">Club Updates &amp; Documents</h2>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Sort documents"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="category">Category</option>
            </select>

            {/* Category Filters */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  selectedCategory === 'all' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-text-muted hover:bg-slate-50'
                }`}
                aria-label="Show all categories"
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedCategory === category 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-text-muted hover:bg-slate-50'
                  }`}
                  aria-label={`Filter by ${category}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Table */}
        {filteredDocuments.length > 0 ? (
          <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header Row */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-6">Topic</div>
              <div className="col-span-4 text-right">Actions</div>
            </div>

            {/* Document Rows */}
            {paginatedDocuments.map((document, index) => {
              const date = formatDate(document.createdAt);
              const isLast = index === paginatedDocuments.length - 1;
              const fileInfo = getFileIcon(document.url, document.title);
              const categoryColors = getCategoryColor(document.category);
              
              return (
                <div 
                  key={document.id}
                  className={`group grid grid-cols-1 md:grid-cols-12 gap-4 p-4 ${!isLast ? 'border-b border-slate-100' : ''} hover:bg-slate-50 transition-colors items-center`}
                >
                  <div className="md:col-span-2 flex flex-col">
                    <span className="text-sm font-medium text-text-main">{date.month} {date.day}</span>
                    <span className="text-xs text-text-muted">{date.year}</span>
                  </div>
                  <div className="md:col-span-6 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border"
                        style={categoryColors.style}
                      >
                        {document.category}
                      </span>
                      <span className="text-lg">{fileInfo.icon}</span>
                      {document.isPinned && (
                        <span className="material-symbols-outlined text-primary text-sm" title="Pinned">push_pin</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">{document.title}</p>
                    {document.description && (
                      <p className="text-xs text-text-muted line-clamp-1">{document.description}</p>
                    )}
                    {(document.downloadCount || 0) > 0 && (
                      <p className="text-xs text-text-muted">{document.downloadCount} downloads</p>
                    )}
                  </div>
                  <div className="md:col-span-4 flex justify-start md:justify-end gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        trackDownload(document.id);
                        setPreviewDoc(document);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-primary hover:text-primary text-text-main text-xs font-medium transition-all bg-white"
                      aria-label="Preview document"
                    >
                      <FiEye className="text-[16px]" />
                      <span>Preview</span>
                    </button>
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackDownload(document.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-primary hover:text-primary text-text-main text-xs font-medium transition-all bg-white"
                      aria-label="Download document"
                    >
                      <FiDownload className="text-[16px]" />
                      <span>Download</span>
                    </a>
                    {canUpload && (
                      <>
                        {!document.isPinned && (
                          <button
                            onClick={() => togglePin(document.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-primary hover:text-primary text-text-main text-xs font-medium transition-all bg-white"
                            title="Pin to top"
                            aria-label="Pin document"
                          >
                            <span className="material-symbols-outlined text-[16px]">push_pin</span>
                          </button>
                        )}
                        <button
                          onClick={() => setEditDoc(document)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:text-blue-500 text-text-main text-xs font-medium transition-all bg-white"
                          aria-label="Edit document"
                        >
                          <FiEdit className="text-[16px]" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(document.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-500 hover:text-red-500 text-text-main text-xs font-medium transition-all bg-white"
                          aria-label="Delete document"
                        >
                          <FiTrash2 className="text-[16px]" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Items per page"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <FiChevronLeft />
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'border border-slate-200 hover:bg-slate-50'
                        }`}
                        aria-label={`Page ${pageNum}`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <FiFileText className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery 
                ? 'No documents match your search'
                : selectedCategory === 'all' 
                  ? 'No documents available'
                  : 'No documents in this category'
              }
            </p>
          </div>
        )}
      </section>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreviewDoc(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex-1">
                <h2 id="preview-title" className="text-xl font-bold text-text-main">{previewDoc.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border"
                    style={getCategoryColor(previewDoc.category).style}
                  >
                    {previewDoc.category}
                  </span>
                  <span className="text-sm text-text-muted">
                    {formatDate(previewDoc.createdAt).month} {formatDate(previewDoc.createdAt).day}, {formatDate(previewDoc.createdAt).year}
                  </span>
                </div>
                {previewDoc.description && (
                  <p className="text-sm text-text-muted mt-2">{previewDoc.description}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors ml-4"
                aria-label="Close preview"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5">
              {previewDoc.url.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[600px] border border-slate-200 rounded-lg"
                  title={`Preview of ${previewDoc.title}`}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{getFileIcon(previewDoc.url, previewDoc.title).icon}</div>
                  <p className="text-text-muted mb-4">Preview not available for this file type</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <FiExternalLink />
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <FiDownload />
                  {previewDoc.downloadCount || 0} downloads
                </span>
              </div>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <FiDownload />
                Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="edit-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditDoc(null)} />
          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 id="edit-title" className="text-lg font-bold text-text-main">Edit Document</h2>
              <button
                onClick={() => setEditDoc(null)}
                className="text-slate-400 hover:text-text-main"
                aria-label="Close"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1">Title</label>
                <input
                  value={editDoc.title}
                  onChange={(e) => setEditDoc({ ...editDoc, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-1">Description</label>
                <textarea
                  value={editDoc.description || ''}
                  onChange={(e) => setEditDoc({ ...editDoc, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-1">Category</label>
                <input
                  value={editDoc.category}
                  onChange={(e) => setEditDoc({ ...editDoc, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editDoc.isPinned || false}
                    onChange={(e) => setEditDoc({ ...editDoc, isPinned: e.target.checked })}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-text-main">Pin to top</span>
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditDoc(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiTrash2 className="text-red-600 text-xl" />
              </div>
              <div>
                <h2 id="delete-title" className="text-lg font-bold text-text-main">Delete Document</h2>
                <p className="text-sm text-text-muted">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-text-main mb-6">
              Are you sure you want to delete this document? This will permanently remove it from the portal.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
