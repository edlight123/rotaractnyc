// =============================================
// Rotaract NYC — Type Definitions
// =============================================

// ----- Roles & Statuses -----
export type MemberRole = 'member' | 'board' | 'president' | 'treasurer';
export type MemberStatus = 'pending' | 'active' | 'inactive' | 'alumni';
export type EventType = 'free' | 'paid' | 'service' | 'hybrid';
export type RSVPStatus = 'going' | 'maybe' | 'not';
export type DuesPaymentStatus = 'UNPAID' | 'PAID' | 'PAID_OFFLINE' | 'WAIVED';
export type ServiceHourStatus = 'pending' | 'approved' | 'rejected';
export type PostType = 'text' | 'image' | 'link' | 'announcement' | 'spotlight';
export type OnboardingStatus = 'INVITED' | 'PENDING_PROFILE' | 'PENDING_PAYMENT' | 'ACTIVE' | 'INACTIVE';

// ----- Member -----
export interface Member {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  bio?: string;
  role: MemberRole;
  status: MemberStatus;
  memberType?: 'professional' | 'student';
  committee?: string;
  phone?: string;
  birthday?: string;
  interests?: string[];
  linkedIn?: string;
  occupation?: string;
  employer?: string;
  address?: string;
  whatsAppPhone?: string;
  whatsAppSameAsPhone?: boolean;
  onboardingComplete?: boolean;
  invitedAt?: string;
  joinedAt: string;
  updatedAt?: string;
}

// ----- Event -----
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;          // e.g. every 2 weeks — defaults to 1
  daysOfWeek?: number[];      // 0=Sun … 6=Sat — for weekly/biweekly
  dayOfMonth?: number;        // 1-31 for monthly
  endDate?: string;           // stop generating occurrences after this ISO date
  occurrences?: number;       // OR stop after N occurrences (default 10)
}

export interface EventPricing {
  memberPrice: number; // in cents
  guestPrice: number;
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;
}

export interface RotaractEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  date: string;
  endDate?: string;
  time: string;
  endTime?: string;
  location: string;
  address?: string;
  type: EventType;
  pricing?: EventPricing;
  imageURL?: string;
  tags?: string[];
  capacity?: number;
  attendeeCount?: number;
  isPublic: boolean;
  status: 'draft' | 'published' | 'cancelled';
  // Recurrence fields
  isRecurring?: boolean;
  recurrence?: RecurrenceRule;
  recurrenceParentId?: string;   // set on generated child occurrences
  occurrenceIndex?: number;      // 0-based index within the series
  createdAt: string;
  updatedAt?: string;
}

export interface RSVP {
  id: string;
  eventId: string;
  memberId: string;
  memberName: string;
  memberPhoto?: string;
  status: RSVPStatus;
  createdAt: string;
}

// ----- News / Article -----
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: {
    id: string;
    name: string;
    photoURL?: string;
  };
  category: string;
  tags?: string[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  viewCount?: number;
  likeCount?: number;
}

// ----- Community Post -----
export type PostAudience = 'all' | 'board';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  type: PostType;
  content: string;
  imageURLs?: string[];
  linkURL?: string;
  audience?: PostAudience;
  likeCount: number;
  commentCount: number;
  likedBy?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  likeCount: number;
  createdAt: string;
}

// ----- Service Hours -----
export interface ServiceHour {
  id: string;
  memberId: string;
  memberName: string;
  eventId: string;
  eventTitle: string;
  hours: number;
  notes?: string;
  status: ServiceHourStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ----- Dues -----
export interface DuesCycle {
  id: string;
  name: string; // e.g., "2025-2026"
  startDate: string;
  endDate: string;
  amountProfessional: number; // in cents, 8500 = $85
  amountStudent: number; // 6500 = $65
  gracePeriodDays: number;
  isActive: boolean;
  createdAt: string;
}

export interface MemberDues {
  id: string;
  memberId: string;
  cycleId: string;
  memberType: 'professional' | 'student';
  amount: number;
  status: DuesPaymentStatus;
  paidAt?: string;
  stripePaymentId?: string;
  paymentMethod?: PaymentMethod;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// ----- Finance -----
export type PaymentMethod = 'stripe' | 'zelle' | 'venmo' | 'cashapp' | 'cash' | 'check';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  createdBy: string;
  createdAt: string;
  receiptUrl?: string;
  paymentMethod?: PaymentMethod;
  approvedBy?: string;
  approvedAt?: string;
  relatedMemberId?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyBreakdown: { month: string; income: number; expenses: number }[];
}

// ----- Document -----
export type DocumentCategory =
  | 'Minutes'
  | 'Policies'
  | 'Bylaws'
  | 'Handbook'
  | 'Reports'
  | 'Financial'
  | 'Templates'
  | 'Google Drive'
  | 'Other';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Minutes',
  'Policies',
  'Bylaws',
  'Handbook',
  'Reports',
  'Financial',
  'Templates',
  'Google Drive',
  'Other',
];

export interface PortalDocument {
  id: string;
  title: string;
  description?: string;
  category: DocumentCategory;
  folderId?: string;
  fileURL?: string;
  linkURL?: string;
  storagePath?: string;
  pinned?: boolean;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt?: string;
}

// ----- Document Folder -----
export interface DocumentFolder {
  id: string;
  name: string;
  color: 'cranberry' | 'azure' | 'gold' | 'green' | 'gray' | 'purple' | 'teal';
  icon?: string;
  pinned?: boolean;
  order?: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

// ----- Gallery -----
export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  event?: string;
  date?: string;
  uploadedBy?: string;
  createdAt: string;
}

// ----- Messages -----
export interface MemberMessage {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  subject: string;
  body: string;
  read: boolean;
  sentAt: string;
}

// ----- Site Settings -----
export interface SiteSettings {
  contactEmail: string;
  address: string;
  phone?: string;
  meetingSchedule: string;
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    facebook?: string;
  };
  profileOptions?: {
    committees: string[];
    occupations: string[];
  };
}

// ----- Payment Settings -----
export interface PaymentSettings {
  zelleIdentifier?: string; // Email or phone number
  zelleEnabled: boolean;
  venmoUsername?: string; // Username without @
  venmoEnabled: boolean;
}

// ----- Finance / Activities -----
export type ActivityType = 'gala' | 'social' | 'volunteering' | 'conference' | 'excursion' | 'website' | 'maintenance' | 'other';
export type ActivityStatus = 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled';
export type ExpenseCategory = 'venue' | 'catering' | 'decorations' | 'supplies' | 'entertainment' | 'transportation' | 'marketing' | 'insurance' | 'permits' | 'other';
export type OfflinePaymentMethod = 'zelle' | 'venmo' | 'cashapp' | 'cash' | 'check';
export type OfflinePaymentStatus = 'pending' | 'approved' | 'rejected';

export interface BudgetLineItem {
  name: string;
  amount: number; // cents
  notes?: string;
}

export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  customType?: string; // If type is 'other'
  date: string; // ISO
  location?: string;
  address?: string;
  description?: string;
  status: ActivityStatus;
  linkedEventId?: string; // Reference to events collection
  
  // Budget (proposed)
  budget: {
    totalEstimate: number; // cents
    lineItems: BudgetLineItem[];
  };
  
  // Actual (post-event)
  actual?: {
    totalSpent: number; // cents
    revenue?: number; // cents (from ticket sales if linked event)
  };
  
  // Approvals
  approvals: {
    treasurerSubmitted: boolean;
    treasurerSubmittedAt?: string;
    presidentApproved: boolean;
    presidentApprovedAt?: string;
    presidentNotes?: string;
  };
  
  // Permissions
  allowedExpenseSubmitters?: string[]; // memberIds who can submit expenses
  
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  activityId: string;
  activityName?: string; // Denormalized for easy display
  description?: string;
  amount: number; // cents
  category: ExpenseCategory;
  customCategory?: string; // If category is 'other'
  date: string; // ISO
  receiptURL?: string;
  receiptUrl?: string; // Alternative naming (be flexible)
  vendor?: string;
  paymentMethod?: string;
  submittedBy: string;
  submittedByName?: string; // Denormalized
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface OfflinePayment {
  id: string;
  type: 'dues' | 'event';
  relatedId: string; // duesId or eventId
  relatedName?: string; // Denormalized for display
  memberId: string;
  memberName?: string; // Denormalized
  memberEmail?: string; // Denormalized
  amount: number; // cents
  method: OfflinePaymentMethod;
  status: OfflinePaymentStatus;
  notes?: string;
  proofURL?: string; // Screenshot/receipt of payment
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

// ----- Onboarding -----
export interface OnboardingInvite {
  id: string;
  email: string;
  token: string;
  status: 'SENT' | 'USED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

// ----- FAQ -----
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

// ----- Board Member (for leadership page) -----
export interface BoardMember {
  id: string;
  name: string;
  title: string;
  photoURL?: string;
  bio?: string;
  linkedIn?: string;
  order: number;
}

// ----- Navigation -----
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}
