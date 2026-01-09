export type CmsPageSlug = 'faq' | 'mission' | 'membership' | 'sisterclubs'

export type FaqItem = {
  question: string
  answer: string
}

export type EmphasisText = {
  prefix: string
  strong: string
  suffix?: string
}

export type MembershipData = {
  benefits: string[]
  membershipFormUrl: string
  eligibilityIntro: string
  eligibilityRequirements: EmphasisText[]
  duesIntro: string
  membershipTypes: string[]
  duesOutro: string
  treasurerEmail: string
  paymentMethods: {
    venmoLabel: string
    venmoHandle: string
  }
}

export type SisterClubItem = {
  name: string
  sinceYear: string
  location: string
  presidents: string
}

export type SisterClubBenefit = {
  title: string
  description: string
}

export type SisterClubsData = {
  introParagraphs: string[]
  clubs: SisterClubItem[]
  benefits: SisterClubBenefit[]
}

export type CmsPageDoc = {
  slug: CmsPageSlug
  heroTitle: string
  heroSubtitle: string
  data: unknown
}

export const DEFAULT_PAGES: Record<CmsPageSlug, CmsPageDoc> = {
  faq: {
    slug: 'faq',
    heroTitle: 'Frequently Asked Questions',
    heroSubtitle: 'Find answers to common questions about our club',
    data: {
      faqs: [
        {
          question: 'I am visiting NYC for a short period of time. Do you have any events I can attend?',
          answer:
            "Please see our Events page for a list of events. All of those events are open to Rotaractors, Rotarians, and those who support Rotaract and Rotary's mission. Feel free to come! Due to the number of requests we receive from visitors to NYC, it is difficult to schedule additional events if there is not an event planned for the time you are here. For now, please feel free to post on our Facebook page to connect with other visitors.",
        },
        {
          question:
            'I am not a member of the Rotaract Club at the United Nations. Can I attend your meetings and/or events?',
          answer:
            "All of our events that are on our Events page are open to Rotaractors, Rotarians, and those who support Rotaract and Rotary's mission.",
        },
        {
          question: 'I am visiting NYC and I am looking for a place to stay. Can your members host me?',
          answer: 'Due to the number of requests we receive for hosts, we cannot offer this service.',
        },
        {
          question: 'I would like to send your club a gift from my club. Do you accept gifts?',
          answer:
            'While we see it as a great compliment that you would like to send us a gift, we only have a PO Box mailing address. If you would like to show support for our club, we ask that you support us by joining in our post-Rotary UN Day fundraising efforts or our international project.',
        },
        {
          question: 'What is Rotaract?',
          answer:
            "Rotaract is a Rotary-sponsored service club for young men and women ages 18 to 30. Rotaract clubs are either community or university based, and they're sponsored by a local Rotary club. This makes them true partners in service and creates a special mentoring relationship.",
        },
        {
          question: 'How much does membership cost?',
          answer:
            'Membership dues vary by year. Please contact us for current membership fee information. Dues help cover meeting costs, materials, and club activities.',
        },
        {
          question: 'When and where do you meet?',
          answer:
            'We typically meet twice a month in Manhattan. Meeting locations and times are posted on our events page. Members receive email notifications about all meetings and events.',
        },
        {
          question: 'Do I need to attend every meeting?',
          answer:
            'While regular attendance is encouraged, we understand members have busy schedules. We ask that members make an effort to attend meetings when possible and participate in at least one service project per year.',
        },
        {
          question: 'What kind of service projects does the club do?',
          answer:
            'Our projects range from local community service to international initiatives. Past projects have included food drives, environmental cleanups, fundraising for global causes, and educational programs.',
        },
        {
          question: "Can I join if I don't live in New York City?",
          answer:
            'While we prefer members who can regularly attend in-person meetings in NYC, we may accommodate members from nearby areas. Contact us to discuss your situation.',
        },
        {
          question: 'What is the connection to the United Nations?',
          answer:
            "Our club has special access to UN events and programs through our sponsoring Rotary club's relationship with the United Nations. This provides unique opportunities for members to engage with international issues.",
        },
        {
          question: 'How can I get involved in leadership?',
          answer:
            'We encourage all members to take on leadership roles. Board positions are elected annually, and there are many committee chair positions available throughout the year. Express your interest to current board members.',
        },
      ] satisfies FaqItem[],
    },
  },
  mission: {
    slug: 'mission',
    heroTitle: 'About Us',
    heroSubtitle: 'Empowering young leaders to create positive change in New York City and beyond',
    data: {},
  },
  membership: {
    slug: 'membership',
    heroTitle: 'Membership',
    heroSubtitle: 'Join a vibrant community of young professionals dedicated to service and leadership',
    data: {
      benefits: [
        'Professional networking opportunities',
        'Leadership development training',
        'Community service projects',
        'International connections',
        'Social events and activities',
        'Career advancement opportunities',
        'United Nations access and events',
        'Skill-building workshops',
      ],
      membershipFormUrl: '#',
      eligibilityIntro:
        'Prospective members must complete the following requirements to be eligible for induction into the club. All requirements must occur within the same Rotaract Year (July 1st through June 30th).',
      eligibilityRequirements: [
        { prefix: 'Attend at least ', strong: '2 general meetings' },
        { prefix: 'Attend at least ', strong: '1 rotary or rotaract service event' },
        { prefix: 'Attend at least ', strong: '1 rotaract social event' },
        { prefix: '', strong: 'Pay annual membership dues', suffix: ' (see below)' },
      ],
      duesIntro:
        "Dues are paid on an annual basis. All dues are required to be paid upon a new member's induction to the club and then annually from that point forward.",
      membershipTypes: ['Professional Membership', 'Student Membership'],
      duesOutro:
        'You may continue as a member of the Rotaract Club at the United Nations after you leave if you continue to pay your annual dues.',
      treasurerEmail: 'TreasurerRCUN@gmail.com',
      paymentMethods: {
        venmoLabel: 'Venmo:',
        venmoHandle: 'Rotaract-AtTheUnitedNations',
      },
    } satisfies MembershipData,
  },
  sisterclubs: {
    slug: 'sisterclubs',
    heroTitle: 'Sister Clubs',
    heroSubtitle: 'Building global connections through partnership and collaboration',
    data: {
      introParagraphs: [
        'As part of Rotary International, our club is connected to thousands of Rotaract clubs around the world. We maintain special relationships with sister clubs that share our commitment to service and international understanding.',
        'Through these partnerships, we exchange ideas, collaborate on projects, and create lasting friendships that span continents.',
      ],
      clubs: [
        {
          name: 'København Rotaract',
          sinceYear: '2021',
          location: 'Copenhagen, Denmark',
          presidents: 'Vincenzo Giordano (RCUN) and Charlotte Katrine Melchiorsen (KR)',
        },
      ],
      benefits: [
        {
          title: 'Joint Projects',
          description:
            'Collaborate on service projects that have global impact and address shared challenges.',
        },
        {
          title: 'Cultural Exchange',
          description:
            'Share cultural experiences and learn from different perspectives around the world.',
        },
        {
          title: 'Travel Opportunities',
          description:
            'Visit sister clubs and experience hospitality and friendship in different countries.',
        },
        {
          title: 'Global Network',
          description: 'Build professional and personal connections that span the globe.',
        },
      ],
    } satisfies SisterClubsData,
  },
}
