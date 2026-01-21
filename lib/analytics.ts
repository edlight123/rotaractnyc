// Analytics tracking utilities
export const analytics = {
  // Track page views
  pageview: (url: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
      })
    }
  },

  // Track custom events
  event: ({
    action,
    category,
    label,
    value,
  }: {
    action: string
    category: string
    label?: string
    value?: number
  }) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      })
    }
  },

  // Track form submissions
  trackFormSubmit: (formName: string) => {
    analytics.event({
      action: 'form_submit',
      category: 'engagement',
      label: formName,
    })
  },

  // Track button clicks
  trackButtonClick: (buttonName: string, location: string) => {
    analytics.event({
      action: 'button_click',
      category: 'engagement',
      label: `${buttonName} - ${location}`,
    })
  },

  // Track membership actions
  trackMembershipAction: (action: 'view_requirements' | 'start_application' | 'submit_application') => {
    analytics.event({
      action: 'membership_action',
      category: 'conversion',
      label: action,
    })
  },

  // Track event actions
  trackEventAction: (action: 'view_event' | 'rsvp' | 'share') => {
    analytics.event({
      action: 'event_action',
      category: 'engagement',
      label: action,
    })
  },

  // Track donations
  trackDonation: (amount: number) => {
    analytics.event({
      action: 'donation',
      category: 'conversion',
      value: amount,
    })
  },

  // Track social shares
  trackSocialShare: (platform: string, contentType: string) => {
    analytics.event({
      action: 'social_share',
      category: 'engagement',
      label: `${platform} - ${contentType}`,
    })
  },

  // Track search
  trackSearch: (searchTerm: string) => {
    analytics.event({
      action: 'search',
      category: 'engagement',
      label: searchTerm,
    })
  },

  // Track downloads
  trackDownload: (fileName: string) => {
    analytics.event({
      action: 'download',
      category: 'engagement',
      label: fileName,
    })
  },

  // Track portal login
  trackPortalLogin: (success: boolean) => {
    analytics.event({
      action: 'portal_login',
      category: 'authentication',
      label: success ? 'success' : 'failure',
    })
  },
}

// React hook for tracking page views
export function useAnalytics() {
  return analytics
}
