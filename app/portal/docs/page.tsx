'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { addDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Document } from '@/types/portal';
import { 
  FiFileText, 
  FiDownload, 
  FiExternalLink, 
  FiSearch, 
  FiUpload,
  FiEye,
  FiCreditCard
} from 'react-icons/fi';

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
  const [uploadCategory, setUploadCategory] = useState('Minutes');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const canUpload = userData?.role === 'BOARD' || userData?.role === 'TREASURER' || userData?.role === 'ADMIN';

  useEffect(() => {
    if (!loading) {
      loadDocuments();
    }
  }, [loading]);

  useEffect(() => {
    filterDocuments();
  }, [documents, selectedCategory, searchQuery]);

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

  const filterDocuments = () => {
    let filtered = documents;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredDocuments(filtered);
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
    const colors: Record<string, string> = {
      'Minutes': 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-800',
      'Service': 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border-green-100 dark:border-green-800',
      'Finance': 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 border-orange-100 dark:border-orange-800',
      'Events': 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-purple-100 dark:border-purple-800',
    };
    return colors[category] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
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

  // Pinned documents (first 3)
  const pinnedDocs = documents.slice(0, 3);

  const submitUpload = async () => {
    if (!canUpload) {
      alert('Only board members can add documents.');
      return;
    }
    if (!user?.uid) return;
    if (!uploadTitle.trim() || !uploadCategory.trim() || !uploadUrl.trim()) return;

    const app = getFirebaseClientApp();
    if (!app) return;
    const db = getFirestore(app);

    setUploading(true);
    try {
      await addDoc(collection(db, 'documents'), {
        title: uploadTitle.trim(),
        category: uploadCategory.trim(),
        url: uploadUrl.trim(),
        visibility: 'member',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        seeded: false,
      });
      setUploadOpen(false);
      setUploadTitle('');
      setUploadCategory('Minutes');
      setUploadUrl('');
      window.location.reload();
    } catch (e) {
      console.error('Error uploading document:', e);
      alert('Failed to add document.');
      setUploading(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
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
            />
          </div>
          <button
            onClick={() => {
              if (!canUpload) {
                alert('Only board members can add documents.');
                return;
              }
              setUploadOpen(true);
            }}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm shadow-primary/30 transition-all active:scale-95"
          >
            <FiUpload className="text-[20px]" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {uploadOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => (uploading ? null : setUploadOpen(false))} />
          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-main">Add a document link</h2>
              <button
                onClick={() => (uploading ? null : setUploadOpen(false))}
                className="text-slate-400 hover:text-text-main"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="block text-sm font-semibold text-text-main mb-1">Title</label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  placeholder="e.g., January Meeting Minutes"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-1">Category</label>
                <input
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  placeholder="e.g., Minutes"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-main mb-1">URL</label>
                <input
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  placeholder="https://…"
                />
                <p className="mt-1 text-xs text-text-muted">This does not upload a file; it saves a link.</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => (uploading ? null : setUploadOpen(false))}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={submitUpload}
                disabled={uploading || !uploadTitle.trim() || !uploadCategory.trim() || !uploadUrl.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            {pinnedDocs.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="size-10 rounded-lg bg-[#eaf1f0] flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{getCategoryIcon(doc.category)}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_outward</span>
                </div>
                <div className="relative z-10">
                  <h3 className="font-bold text-text-main mb-1 group-hover:text-primary transition-colors">{doc.title}</h3>
                  <p className="text-sm text-text-muted line-clamp-2">
                    {doc.category} • {formatDate(doc.createdAt).month} {formatDate(doc.createdAt).year}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Club Updates & Minutes */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
          <h2 className="text-lg font-bold text-text-main">Club Updates &amp; Documents</h2>
          
          {/* Filters */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 w-fit">
            <button 
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-text-muted hover:bg-slate-50'
              }`}
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
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Table */}
        {filteredDocuments.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header Row */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-text-muted uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-7">Topic</div>
              <div className="col-span-3 text-right">Action</div>
            </div>

            {/* Document Rows */}
            {filteredDocuments.map((document, index) => {
              const date = formatDate(document.createdAt);
              const isLast = index === filteredDocuments.length - 1;
              
              return (
                <div 
                  key={document.id}
                  className={`group grid grid-cols-1 md:grid-cols-12 gap-4 p-4 ${!isLast ? 'border-b border-slate-100' : ''} hover:bg-slate-50 transition-colors items-center`}
                >
                  <div className="md:col-span-2 flex flex-col">
                    <span className="text-sm font-medium text-text-main">{date.month} {date.day}</span>
                    <span className="text-xs text-text-muted">{date.year}</span>
                  </div>
                  <div className="md:col-span-7 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getCategoryColor(document.category)}`}>
                        {document.category}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">{document.title}</p>
                  </div>
                  <div className="md:col-span-3 flex justify-start md:justify-end">
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-primary hover:text-primary text-text-main text-xs font-medium transition-all bg-white"
                    >
                      <FiDownload className="text-[16px]" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
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
      </div>
    </main>
  );
}
