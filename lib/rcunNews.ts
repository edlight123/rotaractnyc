export type RcunNewsArticle = {
  slug: string
  title: string
  date: string
  author: string
  category: string
  excerpt: string
  content: string[]
}

export const RCUN_NEWS: RcunNewsArticle[] = [
  {
    slug: 'holiday-charity-drive',
    title: 'Holiday Charity Drive: Community Impact Highlights',
    date: 'December 2023',
    author: 'Rotaract NYC',
    category: 'Service Projects',
    excerpt:
      'A recap of our seasonal giving effort and how members and partners came together to support local families.',
    content: [
      'Each year, we focus on practical support for neighbors who need it most—through targeted donations, volunteer coordination, and community partnerships.',
      'This update shares the goals of the drive, how members contributed, and the impact areas we prioritized. If you’d like to help with future collections, reach out and we’ll connect you with the next planning cycle.',
    ],
  },
  {
    slug: 'new-board-members-elected',
    title: 'New Board Members Elected',
    date: 'November 2023',
    author: 'Rotaract NYC',
    category: 'Club News',
    excerpt:
      'Introducing the incoming board and the priorities for the year ahead—service, fellowship, and professional development.',
    content: [
      'Our club is powered by members who step up to lead. This announcement welcomes the newly elected board and outlines what they’ll focus on this year.',
      'Want to get involved in leadership or help on a committee? We’re always looking for members who want to build experience while strengthening the club.',
    ],
  },
  {
    slug: 'un-youth-summit-highlights',
    title: 'UN Youth Summit: Highlights & Takeaways',
    date: 'November 2023',
    author: 'Rotaract NYC',
    category: 'Events',
    excerpt:
      'Key themes, lessons, and reflections from youth-focused sessions on global issues and civic engagement.',
    content: [
      'Our members attend events that connect local action to global conversations—especially where youth leadership is centered.',
      'This recap summarizes the main themes we brought back to the club and how they influenced our project planning and partnerships.',
    ],
  },
]

export function getRcunNewsArticleBySlug(slug: string): RcunNewsArticle | undefined {
  return RCUN_NEWS.find((a) => a.slug === slug)
}
