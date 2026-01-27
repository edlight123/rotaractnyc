import { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'MEMBER' | 'BOARD' | 'TREASURER' | 'ADMIN';
export type UserStatus = 'pending' | 'active' | 'inactive' | 'alumni';

// Visibility levels
export type Visibility = 'public' | 'member' | 'board';

// User type
export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  bio?: string;
  birthday?: string | Date;
  featured?: boolean;
  role: UserRole;
  status: UserStatus;
  committee?: string;
  phoneOptIn: boolean;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  joinedAt?: Timestamp;
  interests?: string[];
  rotaryYears?: string[]; // Array of Rotary years (e.g., ["2023-2024", "2024-2025"])
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Event pricing types
export type EventType = 'free' | 'paid' | 'service' | 'hybrid';
export type EventPricingTier = 'member' | 'guest' | 'earlybird' | 'standard';

export interface EventPricing {
  type: EventType;
  currency: string; // e.g., 'usd'
  
  // Member pricing
  memberPrice?: number;
  memberEarlyBirdPrice?: number;
  memberEarlyBirdDeadline?: Timestamp;
  
  // Guest pricing (if allowGuests is true)
  guestPrice?: number;
  guestEarlyBirdPrice?: number;
  
  // Service hours (for service events)
  serviceHours?: number;
  serviceDescription?: string;
  
  // Stripe integration
  stripeProductId?: string;
  stripePriceIds?: {
    member?: string;
    guest?: string;
    memberEarlyBird?: string;
    guestEarlyBird?: string;
  };
}

// Recurrence types for events
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type WeekDay = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number; // e.g., every 2 weeks
  endDate?: string; // YYYY-MM-DD when recurrence ends
  occurrences?: number; // OR number of occurrences
  weekDays?: WeekDay[]; // For weekly: which days
  monthDay?: number; // For monthly: which day of month (1-31)
  monthWeek?: number; // For monthly: which week (1-4, -1 for last)
  monthWeekDay?: WeekDay; // For monthly: which day of that week
}

// Event type
export interface Event {
  id: string;
  title: string;
  description: string;
  startAt: Timestamp;
  endAt: Timestamp;
  location: string;
  visibility: Visibility;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Legacy fields for backward compatibility
  date?: string;
  time?: string;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  order?: number;
  
  // Enhanced registration & pricing
  requiresRegistration: boolean;
  capacity?: number;
  registrationDeadline?: Timestamp;
  allowGuests: boolean;
  pricing: EventPricing;
  
  // Event metadata
  imageUrl?: string;
  venueType?: 'physical' | 'virtual' | 'hybrid';
  virtualLink?: string;
  category?: string[];
  tags?: string[];
  status: 'draft' | 'published' | 'cancelled';
  
  // Recurring event fields
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
  parentEventId?: string; // For recurring instances, reference to parent
  
  // Admin notes
  adminNotes?: string;
}

// RSVP type
export type RSVPStatus = 'going' | 'maybe' | 'not';

export interface RSVP {
  uid: string;
  eventId: string;
  status: RSVPStatus;
  updatedAt: Timestamp;
}

// Announcement type
export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  visibility: 'member' | 'board';
  createdBy: string;
  createdAt: Timestamp;
}

// Document type
export interface Document {
  id: string;
  title: string;
  description?: string;
  category: string;
  url: string;
  visibility: 'member' | 'board';
  createdBy: string;
  createdAt: Timestamp;
  isPinned?: boolean;
  downloadCount?: number;
  lastDownloaded?: Timestamp;
}

// Transaction type
export interface Transaction {
  id: string;
  date: Timestamp;
  vendor: string;
  category: string;
  eventId?: string;
  amount: number;
  noteForMembers?: string;
  receiptUrl?: string;
  visibility: 'member' | 'board';
  createdBy: string;
  createdAt: Timestamp;
}

// Monthly summary type
export interface MonthlySummary {
  month: string; // YYYY-MM format
  startingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  endingBalance: number;
  categoryTotals: Record<string, number>; // Map of category to total
  notes?: string;
  updatedAt: Timestamp;
}

// Service Hours types
export type ServiceHourStatus = 'pending' | 'approved' | 'rejected';

export interface ServiceHourSubmission {
  id: string;
  uid: string;
  eventId: string;
  eventName: string;
  hours: number;
  date: Timestamp;
  notes?: string;
  status: ServiceHourStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Helper types for creating documents
export type CreateUser = Omit<User, 'uid' | 'createdAt' | 'updatedAt'>;
export type UpdateUser = Partial<Omit<User, 'uid' | 'email' | 'createdAt'>>;

export type CreateEvent = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEvent = Partial<Omit<Event, 'id' | 'createdBy' | 'createdAt'>>;

export type CreateAnnouncement = Omit<Announcement, 'id' | 'createdAt'>;
export type UpdateAnnouncement = Partial<Omit<Announcement, 'id' | 'createdBy' | 'createdAt'>>;

export type CreateDocument = Omit<Document, 'id' | 'createdAt'>;
export type UpdateDocument = Partial<Omit<Document, 'id' | 'createdBy' | 'createdAt'>>;

export type CreateTransaction = Omit<Transaction, 'id' | 'createdAt'>;
export type UpdateTransaction = Partial<Omit<Transaction, 'id' | 'createdBy' | 'createdAt'>>;

export type CreateMonthlySummary = Omit<MonthlySummary, 'updatedAt'>;
export type UpdateMonthlySummary = Partial<MonthlySummary>;

export type CreateServiceHourSubmission = Omit<ServiceHourSubmission, 'id' | 'status' | 'createdAt' | 'updatedAt'>;
export type UpdateServiceHourSubmission = Partial<Omit<ServiceHourSubmission, 'id' | 'uid' | 'createdAt'>>;
