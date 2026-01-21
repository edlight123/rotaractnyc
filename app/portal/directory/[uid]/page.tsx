'use client';

import { useAuth } from '@/lib/firebase/auth';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getFirebaseClientApp } from '@/lib/firebase/client';
import { User } from '@/types/portal';
import MessageModal from '@/components/portal/MessageModal';
import { sendMemberMessage } from '@/lib/portal/sendMemberMessage';

export default function MemberProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { loading, user, userData } = useAuth();
  const [member, setMember] = useState<User | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      loadMember();
    }
  }, [loading, uid]);

  const loadMember = async () => {
    const app = getFirebaseClientApp();
    if (!app) return;

    const db = getFirestore(app);
    
    try {
      const memberDoc = await getDoc(doc(db, 'users', uid));
      if (memberDoc.exists()) {
        setMember({
          uid: memberDoc.id,
          ...memberDoc.data()
        } as User);
      }
    } catch (error) {
      console.error('Error loading member:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSendMessage = async (data: { subject: string; message: string }) => {
    if (!member) return;

    const result = await sendMemberMessage({
      recipientId: member.uid,
      subject: data.subject,
      message: data.message,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }
  };

  if (loading || loadingData) {
    return (
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          {/* Back button skeleton */}
          <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          
          {/* Profile header skeleton */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="h-32 bg-slate-200 dark:bg-slate-700"></div>
            <div className="px-6 sm:px-8 pb-8 space-y-4">
              <div className="-mt-16 w-32 h-32 bg-slate-300 dark:bg-slate-600 rounded-2xl"></div>
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">person_off</span>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Member not found</p>
          <button
            onClick={() => router.push('/portal/directory')}
            className="mt-4 px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
          >
            Back to Directory
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/portal/directory')}
        className="flex items-center gap-2 text-slate-600 hover:text-primary mb-6 transition-colors"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        <span className="font-semibold">Back to Directory</span>
      </button>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg mb-6">
        {/* Banner Background */}
        <div className="h-32 bg-gradient-to-br from-primary to-primary-dark relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>

        {/* Profile Content */}
        <div className="px-6 sm:px-8 pb-8">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            <div className="inline-block">
              {member.photoURL ? (
                <img
                  src={member.photoURL}
                  alt={member.name}
                  className="w-32 h-32 rounded-2xl border-4 border-white dark:border-surface-dark object-cover shadow-xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-surface-dark bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl">
                  <span className="text-5xl font-bold text-white">
                    {member.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Name & Role */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {member.name}
                </h1>
                {member.featured && (
                  <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg text-xs font-bold shadow-sm">
                    <span className="material-symbols-outlined text-sm mr-1">star</span>
                    Featured
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold">
                  {member.role === 'BOARD' ? 'Board Member' : 
                   member.role === 'TREASURER' ? 'Treasurer' : 
                   member.role === 'ADMIN' ? 'Administrator' : 'Member'}
                </span>
                {member.committee && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold">
                    <span className="material-symbols-outlined text-sm mr-1">group</span>
                    {member.committee}
                  </span>
                )}
                {member.status === 'active' && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Active
                  </span>
                )}
                {member.status === 'alumni' && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-semibold">
                    <span className="material-symbols-outlined text-sm mr-1">school</span>
                    Alumni
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {user && userData?.status === 'active' && member.status === 'active' && (
                <>
                  <button
                    onClick={() => setIsMessageModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg">mail</span>
                    Send Message
                  </button>
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-[#0077b5] hover:border-[#0077b5] rounded-xl transition-colors"
                    >
                      <span className="material-symbols-outlined">link</span>
                    </a>
                  )}
                </>
              )}
              {member.status === 'alumni' && member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-[#0077b5] hover:border-[#0077b5] rounded-xl font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">link</span>
                  LinkedIn Profile
                </a>
              )}
              {user && userData?.status === 'active' && member.status === 'alumni' && (
                <div className="text-sm text-slate-500 dark:text-slate-500 italic">
                  Alumni members can only be contacted via LinkedIn
                </div>
              )}
              {user && userData?.status !== 'active' && member.status === 'active' && (
                <div className="text-sm text-slate-500 dark:text-slate-500 italic">
                  Only active members can send messages
                </div>
              )}
              {!user && (
                <div className="text-sm text-slate-500 dark:text-slate-500 italic">
                  Sign in to contact this member
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Card */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">contact_mail</span>
              Contact Information
            </h2>
            <div className="space-y-4">
              {user && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">mail</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {member.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Use "Send Message" to contact privately
                    </p>
                  </div>
                </div>
              )}
              {!user && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">mail</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-slate-500 dark:text-slate-500 italic text-sm">Sign in to view contact information</p>
                  </div>
                </div>
              )}
              {user && member.phone && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">phone</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                    <a href={`tel:${member.phone}`} className="text-slate-900 dark:text-white hover:text-primary font-medium">
                      {member.phone}
                    </a>
                  </div>
                </div>
              )}
              {user && member.whatsapp && (
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-slate-400 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">WhatsApp</p>
                    <a 
                      href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-slate-900 dark:text-white hover:text-green-600 font-medium"
                    >
                      {member.whatsapp}
                    </a>
                  </div>
                </div>
              )}
              {member.linkedin && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">link</span>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">LinkedIn</p>
                    <a 
                      href={member.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-slate-900 dark:text-white hover:text-primary font-medium"
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              About
            </h2>
            {member.bio ? (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {member.bio}
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">person_off</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">No bio information available</p>
              </div>
            )}
          </div>

          {/* Additional Contact Methods */}
          {user && member.whatsapp && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Connect via WhatsApp for quick messaging
              </p>
              <a
                href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                Send WhatsApp Message
              </a>
            </div>
          )}
        </div>

        {/* Sidebar - Member Info */}
        <div className="space-y-6">
          {/* Birthday */}
          {member.birthday && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
              <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">cake</span>
                Birthday
              </h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {typeof member.birthday === 'string' 
                  ? new Date(member.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  : member.birthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                }
              </p>
            </div>
          )}

          {/* Member Since */}
          {member.joinedAt && (
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                {member.status === 'alumni' ? 'Was Member Since' : 'Member Since'}
              </h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {new Date(member.joinedAt.toDate()).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
          )}

          {/* Rotary Years (Alumni) */}
          {member.status === 'alumni' && member.rotaryYears && member.rotaryYears.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">history_edu</span>
                Rotary Years
              </h3>
              <div className="flex flex-wrap gap-2 mt-3">
                {member.rotaryYears.map((year, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold"
                  >
                    {year}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interests/Skills */}
          {member.interests && member.interests.length > 0 && (
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {member.interests.map((interest, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
              Member Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                  {member.status}
                </p>
              </div>
              {member.committee && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Committee</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {member.committee}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {member && (
        <MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          recipientName={member.name}
          recipientId={member.uid}
          onSend={handleSendMessage}
        />
      )}
    </main>
  );
}
