// =============================================
// Rotaract NYC — Member Achievement Badge System
// =============================================

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: 'engagement' | 'service' | 'community' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold';
}

export const BADGES: BadgeDefinition[] = [
  // Engagement
  { id: 'first-event', name: 'First Steps', description: 'RSVP to your first event', icon: '🎉', category: 'engagement', tier: 'bronze' },
  { id: 'event-regular', name: 'Regular', description: 'Attend 5 events', icon: '📅', category: 'engagement', tier: 'silver' },
  { id: 'event-champion', name: 'Event Champion', description: 'Attend 20 events', icon: '🏆', category: 'engagement', tier: 'gold' },

  // Service
  { id: 'first-hours', name: 'Volunteer', description: 'Log your first service hours', icon: '🤝', category: 'service', tier: 'bronze' },
  { id: '10-hours', name: 'Dedicated', description: 'Complete 10 service hours', icon: '⭐', category: 'service', tier: 'silver' },
  { id: '40-hours', name: 'Service Star', description: 'Complete 40 service hours', icon: '🌟', category: 'service', tier: 'gold' },

  // Community
  { id: 'first-post', name: 'Voice', description: 'Create your first community post', icon: '💬', category: 'community', tier: 'bronze' },
  { id: 'profile-complete', name: 'All Set', description: 'Complete your profile 100%', icon: '✅', category: 'community', tier: 'bronze' },
  { id: 'connector', name: 'Connector', description: 'Be part of a committee', icon: '🔗', category: 'community', tier: 'silver' },

  // Milestones
  { id: 'dues-ontime', name: 'Timely', description: 'Pay dues within the first month', icon: '⏰', category: 'milestone', tier: 'silver' },
  { id: 'one-year', name: 'Anniversary', description: 'Be a member for 1 year', icon: '🎂', category: 'milestone', tier: 'gold' },
  { id: 'founding', name: 'Founding Member', description: 'Joined during the founding year', icon: '🏅', category: 'milestone', tier: 'gold' },
];

/** Look up a badge definition by its id. */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}
