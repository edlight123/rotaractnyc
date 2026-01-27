export type EventCategory = 'upcoming' | 'past'

export type SiteEvent = {
  id: string
  category: EventCategory
  title: string
  date: string
  time?: string
  /** Calendar fields (optional). Use these for Google Calendar/ICS. */
  startDate?: string // YYYY-MM-DD
  startTime?: string // HH:MM (24h)
  endTime?: string // HH:MM (24h)
  timezone?: string // IANA tz, default America/New_York
  location?: string
  description: string
  order: number
}

// Events are now fetched from portalEvents collection in Firestore
// This empty array serves as a fallback when the API is unavailable
export const DEFAULT_EVENTS: SiteEvent[] = []
