export type EventCategory = 'upcoming' | 'past'

export type SiteEvent = {
  id: string
  category: EventCategory
  title: string
  date: string
  time?: string
  location?: string
  description: string
  order: number
}

export const DEFAULT_EVENTS: SiteEvent[] = [
  {
    id: 'monthly-general-meeting',
    category: 'upcoming',
    title: 'Monthly General Meeting',
    date: 'Every 2nd Thursday',
    time: '7:00 PM - 9:00 PM',
    location: 'Manhattan, NY',
    description:
      'Join us for our regular meeting to discuss club business, upcoming projects, and network with fellow members.',
    order: 1,
  },
  {
    id: 'community-service-day',
    category: 'upcoming',
    title: 'Community Service Day',
    date: 'TBD',
    time: 'All Day',
    location: 'Various Locations',
    description:
      'Participate in hands-on service projects that make a real difference in our community.',
    order: 2,
  },
  {
    id: 'networking-social',
    category: 'upcoming',
    title: 'Networking Social',
    date: 'Monthly',
    time: '6:00 PM - 8:00 PM',
    location: 'TBD',
    description:
      'Casual networking event for members to connect and build professional relationships.',
    order: 3,
  },
  {
    id: 'holiday-charity-drive',
    category: 'past',
    title: 'Holiday Charity Drive',
    date: 'December 2023',
    description: 'Collected donations for local families in need during the holiday season.',
    order: 1,
  },
  {
    id: 'un-youth-summit',
    category: 'past',
    title: 'UN Youth Summit',
    date: 'November 2023',
    description:
      'Attended special summit at the United Nations focusing on youth leadership and global issues.',
    order: 2,
  },
  {
    id: 'central-park-cleanup',
    category: 'past',
    title: 'Central Park Cleanup',
    date: 'October 2023',
    description: 'Environmental service project cleaning and maintaining Central Park trails.',
    order: 3,
  },
]
