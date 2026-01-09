export type MemberGroup = 'board' | 'member'

export type SiteMember = {
  id: string
  group: MemberGroup
  title: string
  name: string
  role: string
  photoUrl?: string
  order: number
  active: boolean
}

export const DEFAULT_BOARD_MEMBERS: SiteMember[] = [
  {
    id: 'president',
    group: 'board',
    title: 'Club President',
    name: 'President',
    role: 'Leads the club and oversees all operations',
    order: 1,
    active: true,
  },
  {
    id: 'vice-president',
    group: 'board',
    title: 'Vice President',
    name: 'Vice President',
    role: 'Assists the President and manages internal affairs',
    order: 2,
    active: true,
  },
  {
    id: 'secretary',
    group: 'board',
    title: 'Club Secretary',
    name: 'Secretary',
    role: 'Handles communications and record-keeping',
    order: 3,
    active: true,
  },
  {
    id: 'treasurer',
    group: 'board',
    title: 'Club Treasurer',
    name: 'Treasurer',
    role: 'Manages finances and fundraising',
    order: 4,
    active: true,
  },
  {
    id: 'service-director',
    group: 'board',
    title: 'Service Chair',
    name: 'Service Director',
    role: 'Coordinates community service projects',
    order: 5,
    active: true,
  },
  {
    id: 'membership-director',
    group: 'board',
    title: 'Membership Chair',
    name: 'Membership Director',
    role: 'Recruits and engages members',
    order: 6,
    active: true,
  },
]
