'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { Document } from '@/types/portal';
import { FiFileText, FiDownload, FiExternalLink, FiFilter } from 'react-icons/fi';

export default function DocumentsPage() {
  const { loading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!loading) {
      loadDocuments();
    }
  }, [loading]);

  useEffect(() => {
    filterDocuments();
  }, [documents, selectedCategory]);

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
    if (selectedCategory === 'all') {
      setFilteredDocuments(documents);
    } else {
      setFilteredDocuments(documents.filter(d => d.category === selectedCategory));
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">
          {filteredDocuments.length} of {documents.length} documents
        </p>
      </div>

      {/* Filter */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <FiFilter className="text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Documents list */}
      {filteredDocuments.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FiFileText className="text-2xl text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {document.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                        {document.category}
                      </span>
                      <span>Added {formatDate(document.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                >
                  <FiDownload />
                  <span className="hidden sm:inline">Download</span>
                  <FiExternalLink className="text-sm" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FiFileText className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {selectedCategory === 'all' 
              ? 'No documents available'
              : 'No documents in this category'
            }
          </p>
        </div>
      )}
    </div>
  );
}
