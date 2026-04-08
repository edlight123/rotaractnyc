import type { RotaractEvent, Article, FAQItem, BoardMember, GalleryImage, Testimonial } from '@/types';

// ---- Default Events ----
export const defaultEvents: RotaractEvent[] = [
  {
    id: 'evt-1',
    title: 'Monthly General Meeting',
    slug: 'monthly-general-meeting-feb',
    description: 'Join us for our regular general meeting. All members and prospective members welcome! We will discuss upcoming service projects, fellowship events, and club business.',
    date: '2026-02-26T19:00:00',
    time: '7:00 PM',
    endTime: '8:00 PM',
    location: '216 East 45th Street, New York, NY 10017',
    type: 'free',
    imageURL: '',
    tags: ['meeting', 'general'],
    isPublic: true,
    status: 'published',
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: 'evt-2',
    title: 'Spring Service Day: Central Park Cleanup',
    slug: 'spring-service-day-central-park',
    description: 'Our annual spring service project! Join fellow Rotaractors for a morning of community service beautifying Central Park. Gloves and supplies provided. All ages welcome.',
    date: '2026-03-15T09:00:00',
    time: '9:00 AM',
    endTime: '1:00 PM',
    location: 'Central Park, New York, NY',
    type: 'service',
    imageURL: '',
    tags: ['service', 'outdoor', 'community'],
    isPublic: true,
    status: 'published',
    createdAt: '2026-01-15T00:00:00',
  },
  {
    id: 'evt-3',
    title: 'Professional Networking Mixer',
    slug: 'professional-networking-mixer',
    description: 'An evening of professional networking with members from Rotaract clubs across the tri-state area. Light refreshments provided. Business casual attire.',
    date: '2026-04-10T18:30:00',
    time: '6:30 PM',
    endTime: '9:00 PM',
    location: 'The Roosevelt Hotel, 45 E 45th St, New York, NY',
    type: 'paid',
    pricing: { memberPrice: 1500, guestPrice: 2500 },
    imageURL: '',
    tags: ['networking', 'professional', 'social'],
    isPublic: true,
    status: 'published',
    createdAt: '2026-02-01T00:00:00',
  },
  {
    id: 'evt-4',
    title: 'Rotaract Day of Unity',
    slug: 'rotaract-day-of-unity',
    description: 'Celebrate Rotaract Day with clubs worldwide! A day of service, fellowship, and global unity. Activities include community service in the morning and a celebration dinner in the evening.',
    date: '2026-03-13T10:00:00',
    time: '10:00 AM',
    endTime: '8:00 PM',
    location: 'Multiple locations, New York, NY',
    type: 'hybrid',
    pricing: { memberPrice: 0, guestPrice: 1000 },
    imageURL: '',
    tags: ['rotaract-day', 'global', 'fellowship'],
    isPublic: true,
    status: 'published',
    createdAt: '2026-01-20T00:00:00',
  },
];

// ---- Default News ----
export const defaultArticles: Article[] = [
  {
    id: 'art-1',
    title: 'Rotaract NYC Raises $15,000 for Local Food Banks',
    slug: 'rotaract-nyc-raises-15000-food-banks',
    excerpt: 'Our annual holiday fundraiser exceeded expectations, raising over $15,000 for local food banks across New York City.',
    content: '<p>We are thrilled to announce that our annual holiday fundraiser has raised over $15,000 for local food banks across New York City. This incredible achievement was made possible by the generous contributions of our members, partners, and the broader community.</p><p>The funds will be distributed to five food banks throughout the five boroughs, helping to provide meals for thousands of families in need during the holiday season and beyond.</p>',
    coverImage: '',
    author: { id: '1', name: 'Sarah Chen', photoURL: '' },
    category: 'Service',
    tags: ['fundraiser', 'community', 'service'],
    isPublished: true,
    publishedAt: '2026-01-15T10:00:00',
    createdAt: '2026-01-14T10:00:00',
  },
  {
    id: 'art-2',
    title: 'Welcome to Our New Board for 2025-2026',
    slug: 'new-board-2025-2026',
    excerpt: 'Meet the incoming board members who will lead Rotaract NYC through an exciting year of service, fellowship, and professional development.',
    content: '<p>We are excited to introduce the new board of directors for the 2025-2026 Rotary year. Our incoming leadership team brings a wealth of experience and fresh ideas to continue our mission of Service Above Self.</p>',
    coverImage: '',
    author: { id: '2', name: 'Michael Torres', photoURL: '' },
    category: 'Leadership',
    tags: ['board', 'leadership', 'announcement'],
    isPublished: true,
    publishedAt: '2026-01-05T10:00:00',
    createdAt: '2026-01-04T10:00:00',
  },
  {
    id: 'art-3',
    title: 'International Service Trip to Dominican Republic',
    slug: 'international-service-trip-dr',
    excerpt: 'Ten members traveled to the Dominican Republic for a week-long service project building clean water infrastructure.',
    content: '<p>In partnership with Rotary International and local organizations, ten of our members spent a week in the Dominican Republic building clean water infrastructure for rural communities.</p><p>The project installed water filtration systems in three villages, providing clean drinking water access for over 500 people.</p>',
    coverImage: '',
    author: { id: '3', name: 'Amanda Rodriguez', photoURL: '' },
    category: 'International',
    tags: ['international', 'service', 'water'],
    isPublished: true,
    publishedAt: '2025-12-20T10:00:00',
    createdAt: '2025-12-19T10:00:00',
  },
];

// ---- Default FAQ ----
export const defaultFAQ: FAQItem[] = [
  { id: 'faq-1', question: 'What is Rotaract?', answer: 'Rotaract is a global community of young leaders aged 18–30 who are dedicated to creating positive, lasting change in their communities and around the world. Rotaract clubs are part of the Rotary International family.', category: 'General', order: 1 },
  { id: 'faq-2', question: 'How do I join Rotaract NYC?', answer: 'Attend one of our general meetings as a guest, meet current members, and express your interest in joining. You\'ll go through a short prospective member period before becoming a full member. Visit our Membership page for details.', category: 'Membership', order: 2 },
  { id: 'faq-3', question: 'What are the membership dues?', answer: 'Annual dues are $85 for professional members and $65 for student members. Dues cover the Rotary year from July 1 to June 30 and include Rotary International registration.', category: 'Membership', order: 3 },
  { id: 'faq-4', question: 'When and where do you meet?', answer: 'We meet every 2nd and 4th Thursday of the month from 7:00 PM to 8:00 PM at 216 East 45th Street, New York, NY 10017. Some meetings may be held virtually.', category: 'Meetings', order: 4 },
  { id: 'faq-5', question: 'Do I need to be invited to attend a meeting?', answer: 'No! Our meetings are open to all. We welcome guests and prospective members to attend and learn about our club. Just show up and introduce yourself!', category: 'Meetings', order: 5 },
  { id: 'faq-6', question: 'What kind of service projects do you do?', answer: 'We organize a wide range of projects including park cleanups, food bank volunteering, mentoring programs, and international service trips. We also partner with other Rotary and Rotaract clubs for larger initiatives.', category: 'Service', order: 6 },
  { id: 'faq-7', question: 'Can I attend events without being a member?', answer: 'Many of our public events are open to non-members. Some events may require registration or have a guest fee. Check our Events page for details on upcoming activities.', category: 'Events', order: 7 },
  { id: 'faq-8', question: 'What is the relationship between Rotaract and Rotary?', answer: 'Rotaract is sponsored by Rotary International. Our club is specifically sponsored by The Rotary Club of New York. Rotary provides mentorship, resources, and a global network to Rotaract clubs.', category: 'General', order: 8 },
  { id: 'faq-9', question: 'How do I sign in to the member portal?', answer: 'Go to the Member Portal and click "Sign in with Google." Use the Google account associated with your membership. If you\'re a new member, your account will be in a "Pending Approval" state until a board member approves you.', category: 'Portal', order: 9 },
  { id: 'faq-10', question: 'My account says "Pending Approval" — what do I do?', answer: 'New accounts require approval from a board member before you can access the portal. If you\'ve already been invited or are a current member, reach out to a board member to approve your account. Invited members are usually approved automatically.', category: 'Portal', order: 10 },
  { id: 'faq-11', question: 'I signed in with the wrong Google account. How do I switch?', answer: 'Sign out of the portal, then sign in again and choose a different Google account. If you\'re having trouble, clear your browser cookies for the site or use an incognito window to sign in with the correct account.', category: 'Portal', order: 11 },
];

// ---- Default Board ----
export const defaultBoard: BoardMember[] = [
  { id: 'b-1', name: 'Sarah Chen', title: 'President', photoURL: '', linkedIn: '#', order: 1 },
  { id: 'b-2', name: 'Michael Torres', title: 'Vice President', photoURL: '', linkedIn: '#', order: 2 },
  { id: 'b-3', name: 'Amanda Rodriguez', title: 'Secretary', photoURL: '', linkedIn: '#', order: 3 },
  { id: 'b-4', name: 'James Park', title: 'Treasurer', photoURL: '', linkedIn: '#', order: 4 },
  { id: 'b-5', name: 'Emily Washington', title: 'Service Chair', photoURL: '', linkedIn: '#', order: 5 },
  { id: 'b-6', name: 'David Kim', title: 'Fellowship Chair', photoURL: '', linkedIn: '#', order: 6 },
  { id: 'b-7', name: 'Rachel Green', title: 'Professional Development Chair', photoURL: '', linkedIn: '#', order: 7 },
  { id: 'b-8', name: 'Carlos Martinez', title: 'Communications Chair', photoURL: '', linkedIn: '#', order: 8 },
];

// ---- Default Gallery ----
export const defaultGallery: GalleryImage[] = [
  { id: 'g-1', url: '/images/gallery/placeholder-1.jpg', caption: 'Spring Service Day 2025', event: 'Central Park Cleanup', date: '2025-04-15', createdAt: '2025-04-15' },
  { id: 'g-2', url: '/images/gallery/placeholder-2.jpg', caption: 'Annual Gala 2025', event: 'Annual Gala', date: '2025-06-20', createdAt: '2025-06-20' },
  { id: 'g-3', url: '/images/gallery/placeholder-3.jpg', caption: 'UN Visit', event: 'United Nations Tour', date: '2025-09-10', createdAt: '2025-09-10' },
  { id: 'g-4', url: '/images/gallery/placeholder-4.jpg', caption: 'Holiday Fundraiser', event: 'Holiday Charity Drive', date: '2025-12-15', createdAt: '2025-12-15' },
];

// ---- Default Testimonials ----
export const defaultTestimonials: Testimonial[] = [
  {
    id: 'testimonial-1',
    quote: 'Joining Rotaract NYC was the best decision I made after moving to the city. I found not just a service club, but a family of passionate, driven people.',
    name: 'Sarah Chen',
    title: 'Past President',
    order: 0,
    isActive: true,
    createdAt: '2025-01-01T00:00:00',
  },
];
