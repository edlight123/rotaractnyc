'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Pencil,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Cake,
  MapPin,
  CalendarDays,
  GraduationCap,
  IdCard,
  MessageCircle,
  Linkedin,
  Users,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, useAllMembers } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/firebase/auth';
import { uploadFile, validateFile } from '@/lib/firebase/upload';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import PhoneInput from '@/components/ui/PhoneInput';
import MessageModal from '@/components/portal/MessageModal';
import MemberCard from '@/components/portal/MemberCard';
import PageContainer from '@/components/portal/PageContainer';
import PageHeader from '@/components/portal/PageHeader';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import type { Member, MemberRole, MemberStatus } from '@/types';

const roleColors: Record<string, 'cranberry' | 'gold' | 'azure' | 'gray'> = {
  president: 'cranberry',
  treasurer: 'gold',
  board: 'azure',
  member: 'gray',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'alumni', label: 'Alumni' },
];

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'board', label: 'Board' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'president', label: 'President' },
];

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** A single Notion-style property row: icon + label on the left, value on the right. */
function PropertyRow({
  icon: Icon,
  label,
  children,
  adminOnly = false,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  adminOnly?: boolean;
  href?: string;
}) {
  const value = href ? (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="text-gray-900 dark:text-white hover:text-cranberry dark:hover:text-cranberry-400 transition-colors break-words"
    >
      {children}
    </a>
  ) : (
    <span className="text-gray-900 dark:text-white break-words">{children}</span>
  );

  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
        <dt className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          {label}
          {adminOnly && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400 uppercase tracking-wide">
              Admin
            </span>
          )}
        </dt>
        <dd className="min-w-0 text-sm">{value}</dd>
      </div>
    </div>
  );
}

/** A grouped card of property rows with a section title. */
function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
      <h3 className="font-display font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <dl className="divide-y divide-gray-100 dark:divide-gray-800">{children}</dl>
    </div>
  );
}

export default function PortalMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { member: currentMember } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgOpen, setMsgOpen] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  const isBoard = ['president', 'board', 'treasurer'].includes(currentMember?.role || '');
  const isPresident = currentMember?.role === 'president';
  const isSelf = currentMember?.id === id;

  // Full roster (for prev/next navigation + "more from committee")
  const { data: allMembers } = useAllMembers();

  // Directory order = active + alumni, sorted A–Z by name (matches the index default).
  const directoryList = useMemo(() => {
    return ((allMembers as Member[] | undefined) || [])
      .filter((m) => m.status === 'active' || m.status === 'alumni')
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [allMembers]);

  const neighborIndex = directoryList.findIndex((m) => m.id === id);
  const prevMember = neighborIndex > 0 ? directoryList[neighborIndex - 1] : null;
  const nextMember =
    neighborIndex >= 0 && neighborIndex < directoryList.length - 1
      ? directoryList[neighborIndex + 1]
      : null;

  // Other active members on the same committee (encourage connection).
  const sameCommittee = useMemo(() => {
    const committee = member?.committee?.trim();
    if (!committee) return [] as Member[];
    return ((allMembers as Member[] | undefined) || [])
      .filter(
        (m) =>
          m.id !== member?.id &&
          m.status === 'active' &&
          (m.committee || '').trim().toLowerCase() === committee.toLowerCase()
      )
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
      .slice(0, 6);
  }, [allMembers, member]);

  // Admin-edit form state (role/status/boardTitle)
  const [adminForm, setAdminForm] = useState({
    role: 'member' as MemberRole,
    status: 'active' as MemberStatus,
    boardTitle: '',
  });

  // Admin profile-edit mode (firstName/lastName/bio/contact/etc.)
  const [editMode, setEditMode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    phone: '',
    linkedIn: '',
    committee: '',
    occupation: '',
    employer: '',
    roleEmail: '',
  });

  // Admin photo upload
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchMember = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Member>(`/api/portal/members?id=${id}`);
      setMember(data);
      setAdminForm({
        role: (data?.role as MemberRole) || 'member',
        status: (data?.status as MemberStatus) || 'active',
        boardTitle: data?.boardTitle || '',
      });
      setProfileForm({
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        bio: data?.bio || '',
        phone: data?.phone || '',
        linkedIn: data?.linkedIn || '',
        committee: data?.committee || '',
        occupation: data?.occupation || '',
        employer: data?.employer || '',
        roleEmail: data?.roleEmail || '',
      });
    } catch {
      toast('Failed to load member profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const handleSendMessage = async (data: { toId: string; subject: string; message: string }) => {
    await apiPost('/api/portal/messages', data);
    toast('Message sent!');
  };

  async function saveAdminChanges() {
    if (!member) return;
    setSavingAdmin(true);
    try {
      await apiPatch('/api/portal/members', {
        memberId: member.id,
        status: adminForm.status,
        role: adminForm.role,
        boardTitle: adminForm.boardTitle,
      });
      toast('Member updated', 'success');
      await fetchMember();
    } catch (err: any) {
      toast(err?.message || 'Failed to update member', 'error');
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleAdminPhotoChange() {
    const file = photoRef.current?.files?.[0];
    if (!file || !member) return;
    const err = validateFile(file, { maxSizeMB: 5, allowedTypes: ['image/'] });
    if (err) {
      toast(err, 'error');
      return;
    }
    setUploadingPhoto(true);
    try {
      const { url } = await uploadFile(file, 'profile-photos', member.id);
      await apiPatch('/api/portal/members', { memberId: member.id, photoURL: url });
      toast('Profile photo updated', 'success');
      await fetchMember();
    } catch (e: any) {
      toast(e?.message || 'Upload failed', 'error');
    } finally {
      setUploadingPhoto(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  }

  async function saveProfileChanges() {
    if (!member) return;
    setSavingProfile(true);
    try {
      await apiPatch('/api/portal/members', {
        memberId: member.id,
        ...profileForm,
      });
      toast('Profile updated', 'success');
      setEditMode(false);
      await fetchMember();
    } catch (err: any) {
      toast(err?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function deleteMember() {
    if (!member) return;
    if (!confirm(`Delete ${member.displayName || member.email || 'this member'}? This permanently removes their record.`)) return;
    setSavingAdmin(true);
    try {
      const res = await fetch('/api/portal/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete member');
      }
      toast('Member deleted', 'success');
      router.push('/portal/directory');
    } catch (err: any) {
      toast(err?.message || 'Failed to delete member', 'error');
      setSavingAdmin(false);
    }
  }

  if (loading) {
    return (
      <PageContainer width="narrow">
        <DetailSkeleton />
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer width="narrow">
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">Member not found.</p>
          <Button variant="secondary" onClick={() => router.push('/portal/directory')}>
            Back to Directory
          </Button>
        </div>
      </PageContainer>
    );
  }

  const phoneDigits = (member.whatsAppSameAsPhone ? member.phone : member.whatsAppPhone)?.replace(/\D/g, '');
  const joined = fmtDate(member.joinedAt);
  const alumniSince = fmtDate(member.alumniSince);
  const birthday = fmtDate(member.birthday);

  return (
    <PageContainer width="narrow">
      {/* Top bar: back to directory + prev/next member */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/portal/directory"
          className="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cranberry dark:text-gray-400 dark:hover:text-cranberry-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Directory
        </Link>
        <div className="flex items-center gap-1.5">
          {prevMember ? (
            <Link
              href={`/portal/directory/${prevMember.id}`}
              title={`Previous: ${prevMember.displayName}`}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:border-cranberry/40 hover:text-cranberry dark:hover:text-cranberry-400 transition-colors max-w-[9rem]"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="truncate">{prevMember.displayName}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-lg border border-gray-100 dark:border-gray-800/60 px-2.5 py-1.5 text-gray-300 dark:text-gray-700">
              <ChevronLeft className="w-4 h-4" />
            </span>
          )}
          {nextMember ? (
            <Link
              href={`/portal/directory/${nextMember.id}`}
              title={`Next: ${nextMember.displayName}`}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:border-cranberry/40 hover:text-cranberry dark:hover:text-cranberry-400 transition-colors max-w-[9rem]"
            >
              <span className="truncate">{nextMember.displayName}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-lg border border-gray-100 dark:border-gray-800/60 px-2.5 py-1.5 text-gray-300 dark:text-gray-700">
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative shrink-0">
            <Avatar src={member.photoURL} alt={member.displayName} size="xl" />
            {/* Admin (or self) photo upload overlay */}
            {(isBoard || isSelf) && (
              <>
                <input
                  type="file"
                  ref={photoRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAdminPhotoChange}
                />
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  title={isSelf ? 'Change your photo' : 'Change member photo (admin)'}
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-cranberry text-white shadow-lg ring-2 ring-white dark:ring-gray-900 flex items-center justify-center hover:bg-cranberry-700 transition-colors disabled:opacity-60"
                >
                  {uploadingPhoto ? <Spinner size="sm" /> : <Camera className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={roleColors[member.role] || 'gray'}>{member.role}</Badge>
              <Badge variant={member.status === 'active' ? 'green' : 'gray'}>{member.status}</Badge>
              {member.boardTitle && <Badge variant="azure">{member.boardTitle}</Badge>}
              {member.memberType && (
                <Badge variant="gray">
                  <span className="capitalize">{member.memberType}</span>
                </Badge>
              )}
            </div>
            {member.bio && (
              <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                {member.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {!isSelf && (
                <Button size="sm" onClick={() => setMsgOpen(true)}>
                  <MessageCircle className="w-4 h-4 mr-1.5 inline" />
                  Message
                </Button>
              )}
              {isSelf && (
                <Link href="/portal/profile">
                  <Button size="sm">
                    <Pencil className="w-4 h-4 mr-1.5 inline" />
                    Edit My Profile
                  </Button>
                </Link>
              )}
              {isBoard && phoneDigits && (
                <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="!bg-green-50 !text-green-700 hover:!bg-green-100 dark:!bg-green-900/20 dark:!text-green-400"
                  >
                    <svg aria-hidden="true" className="w-4 h-4 mr-1.5 inline" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.818-6.3-2.187l-.44-.358-3.095 1.037 1.037-3.095-.358-.44A9.95 9.95 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                    </svg>
                    WhatsApp
                  </Button>
                </a>
              )}
              {member.linkedIn && (
                <a href={member.linkedIn} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary">
                    <Linkedin className="w-4 h-4 mr-1.5 inline" />
                    LinkedIn
                  </Button>
                </a>
              )}
              {(isBoard || isSelf) && member.email && (
                <a href={`mailto:${member.email}`}>
                  <Button size="sm" variant="ghost">
                    <Mail className="w-4 h-4 mr-1.5 inline" />
                    Email
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details — grouped property sections */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Contact */}
        {(member.email ||
          (member.roleEmail && (isBoard || isSelf)) ||
          (member.phone && (isBoard || isSelf)) ||
          (member.address && (isBoard || isSelf))) && (
          <PropertySection title="Contact">
            {member.email && (
              <PropertyRow icon={Mail} label="Email" href={`mailto:${member.email}`}>
                {member.email}
              </PropertyRow>
            )}
            {member.roleEmail && (isBoard || isSelf) && (
              <PropertyRow icon={Mail} label="Role Email" adminOnly href={`mailto:${member.roleEmail}`}>
                {member.roleEmail}
              </PropertyRow>
            )}
            {member.phone && (isBoard || isSelf) && (
              <PropertyRow icon={Phone} label="Phone" href={`tel:${member.phone.replace(/\s/g, '')}`}>
                {member.phone}
              </PropertyRow>
            )}
            {member.address && (isBoard || isSelf) && (
              <PropertyRow icon={MapPin} label="Address">
                <span className="whitespace-pre-line">{member.address}</span>
              </PropertyRow>
            )}
          </PropertySection>
        )}

        {/* Professional */}
        {(member.occupation || member.employer || member.committee || member.linkedIn) && (
          <PropertySection title="Professional">
            {(member.occupation || member.employer) && (
              <PropertyRow icon={Briefcase} label="Occupation">
                {member.occupation}
                {member.occupation && member.employer ? ' \u00b7 ' : ''}
                {member.employer}
              </PropertyRow>
            )}
            {member.committee && (
              <PropertyRow icon={Building2} label="Committee">
                {member.committee}
              </PropertyRow>
            )}
            {member.linkedIn && (
              <PropertyRow icon={Linkedin} label="LinkedIn" href={member.linkedIn}>
                View profile
              </PropertyRow>
            )}
          </PropertySection>
        )}

        {/* Membership */}
        {(member.memberType || (birthday && (isBoard || isSelf)) || joined || alumniSince) && (
          <PropertySection title="Membership">
            {member.memberType && (
              <PropertyRow icon={IdCard} label="Type">
                <span className="capitalize">{member.memberType}</span>
              </PropertyRow>
            )}
            {birthday && (isBoard || isSelf) && (
              <PropertyRow icon={Cake} label="Birthday" adminOnly>
                {birthday}
              </PropertyRow>
            )}
            {joined && (
              <PropertyRow icon={CalendarDays} label="Joined">
                {joined}
              </PropertyRow>
            )}
            {alumniSince && (
              <PropertyRow icon={GraduationCap} label="Alumni Since">
                {alumniSince}
              </PropertyRow>
            )}
          </PropertySection>
        )}

        {/* Interests */}
        {member.interests && member.interests.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6">
            <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {member.interests.map((i) => (
                <Badge key={i} variant="azure">
                  {i}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Self-edit hint (incl. profile photo) */}
      {isSelf && (
        <div className="bg-gradient-to-br from-cranberry-50 to-gold-50 dark:from-cranberry-900/20 dark:to-gold-900/10 border border-cranberry-100 dark:border-cranberry-900/40 rounded-2xl p-5 flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-white/70 dark:bg-gray-900/40 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-cranberry" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">This is your profile</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Update your bio, contact info, committee, occupation, and profile photo from your profile settings.
            </p>
            <Link href="/portal/profile" className="inline-block mt-3">
              <Button size="sm">Edit My Profile</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Admin: edit profile fields on behalf of this member */}
      {isBoard && !isSelf && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Edit Profile</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Update this member&apos;s name, bio, contact info, and committee on their behalf.
              </p>
            </div>
            {!editMode ? (
              <Button size="sm" variant="secondary" onClick={() => setEditMode(true)}>
                Edit Profile
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditMode(false);
                  // Reset form to current member values
                  setProfileForm({
                    firstName: member.firstName || '',
                    lastName: member.lastName || '',
                    bio: member.bio || '',
                    phone: member.phone || '',
                    linkedIn: member.linkedIn || '',
                    committee: member.committee || '',
                    occupation: member.occupation || '',
                    employer: member.employer || '',
                    roleEmail: member.roleEmail || '',
                  });
                }}
              >
                Cancel
              </Button>
            )}
          </div>

          {editMode && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                />
                <Input
                  label="Last Name"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <Textarea
                label="Bio"
                value={profileForm.bio}
                onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Committee"
                  value={profileForm.committee}
                  onChange={(e) => setProfileForm((f) => ({ ...f, committee: e.target.value }))}
                />
                <PhoneInput
                  label="Phone"
                  value={profileForm.phone}
                  onChange={(v) => setProfileForm((f) => ({ ...f, phone: v }))}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Occupation"
                  value={profileForm.occupation}
                  onChange={(e) => setProfileForm((f) => ({ ...f, occupation: e.target.value }))}
                />
                <Input
                  label="Employer"
                  value={profileForm.employer}
                  onChange={(e) => setProfileForm((f) => ({ ...f, employer: e.target.value }))}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="LinkedIn URL"
                  type="url"
                  value={profileForm.linkedIn}
                  onChange={(e) => setProfileForm((f) => ({ ...f, linkedIn: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                />
                <Input
                  label="Role Email (e.g. treasurer@…)"
                  type="email"
                  value={profileForm.roleEmail}
                  onChange={(e) => setProfileForm((f) => ({ ...f, roleEmail: e.target.value }))}
                />
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                <Button onClick={saveProfileChanges} loading={savingProfile}>
                  Save Profile
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Admin actions */}
      {isBoard && !isSelf && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Admin Actions</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isPresident
                  ? 'You can change role, status, board title, or remove this member.'
                  : 'You can promote a member to Board, or change their status. Only the President can change other roles or delete members.'}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Select
              label="Status"
              value={adminForm.status}
              onChange={(e) => setAdminForm((f) => ({ ...f, status: e.target.value as MemberStatus }))}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Role"
              value={adminForm.role}
              onChange={(e) => setAdminForm((f) => ({ ...f, role: e.target.value as MemberRole }))}
              options={ROLE_OPTIONS}
              disabled={!isPresident && !(member.role === 'member')}
            />
            <Input
              label="Board Title"
              value={adminForm.boardTitle}
              onChange={(e) => setAdminForm((f) => ({ ...f, boardTitle: e.target.value }))}
              placeholder="e.g., Vice President"
            />
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-800">
            {isPresident && (
              <Button variant="outline" onClick={deleteMember} disabled={savingAdmin}>
                Delete Member
              </Button>
            )}
            <Button onClick={saveAdminChanges} loading={savingAdmin}>
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* More from the same committee */}
      {sameCommittee.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="font-display font-bold text-gray-900 dark:text-white">
              More from {member.committee}
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {sameCommittee.map((cm) => (
              <MemberCard key={cm.id} member={cm} viewerRole={currentMember?.role} variant="compact" />
            ))}
          </div>
        </div>
      )}

      <MessageModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        recipientName={member.displayName}
        recipientId={member.id}
        onSend={handleSendMessage}
      />
    </PageContainer>
  );
}
