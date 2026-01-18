'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useState, useRef } from 'react';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { updateProfile } from 'firebase/auth';

export default function SettingsPage() {
  const { user, userData, loading } = useAuth();
  const [name, setName] = useState(userData?.name || '');
  const [bio, setBio] = useState(userData?.bio || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Photo must be less than 5MB' });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const app = getFirebaseClientApp();
      if (!app) throw new Error('Firebase not initialized');

      const storage = getStorage(app);
      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}-${file.name}`);
      
      // Upload file
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      // Update user profile in Firebase Auth
      await updateProfile(user, { photoURL });

      // Update user doc in Firestore
      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL,
        updatedAt: new Date()
      });

      setMessage({ type: 'success', text: 'Profile photo updated!' });
      
      // Reload to update UI
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const app = getFirebaseClientApp();
      if (!app) throw new Error('Firebase not initialized');

      const db = getFirestore(app);
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        bio: bio.trim(),
        updatedAt: new Date()
      });

      // Update auth profile name
      if (name.trim() !== user.displayName) {
        await updateProfile(user, { displayName: name.trim() });
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Reload to update UI
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17b0cf]"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your profile information and preferences
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Profile Photo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Profile Photo</h2>
          
          <div className="flex items-center gap-6">
            <div 
              className="size-24 rounded-full bg-cover bg-center border-4 border-gray-200 dark:border-gray-700"
              style={user?.photoURL ? { backgroundImage: `url(${user.photoURL})` } : {}}
            >
              {!user?.photoURL && (
                <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined text-[36px]">person</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-[#17b0cf] hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    Change Photo
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Personal Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#17b0cf] focus:border-transparent"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#17b0cf] focus:border-transparent resize-none"
                placeholder="Tell us a bit about yourself..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {bio.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Role
              </label>
              <input
                type="text"
                value={userData?.role || 'Member'}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Role is managed by administrators
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={saving || !name.trim()}
              className="px-6 py-2 bg-[#17b0cf] hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
