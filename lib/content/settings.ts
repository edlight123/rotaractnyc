export type SiteSettings = {
  contactEmail: string
  addressLines: string[]
  facebookUrl: string
  instagramUrl: string
  linkedinUrl: string
  meetingLabel: string
  meetingTime: string
}

export const DEFAULT_SETTINGS: SiteSettings = {
  contactEmail: 'rotaractnewyorkcity@gmail.com',
  addressLines: ['216 East 45th Street', 'New York, NY 10017', 'United States'],
  facebookUrl: 'https://www.facebook.com/rotaractnewyorkcity/',
  instagramUrl: 'http://instagram.com/rotaractnyc',
  linkedinUrl: 'https://www.linkedin.com/company/rotaract-at-the-un-nyc/',
  meetingLabel: 'Weekly Meetings:',
  meetingTime: 'Thursday 7PM - 8PM',
}
