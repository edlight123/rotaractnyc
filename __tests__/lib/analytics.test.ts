import { analytics } from '@/lib/analytics'

// Mock gtag
const mockGtag = jest.fn()
Object.defineProperty(window, 'gtag', {
  value: mockGtag,
})

describe('Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('pageview', () => {
    it('calls gtag with correct parameters', () => {
      const url = '/test-page'
      analytics.pageview(url)

      expect(mockGtag).toHaveBeenCalledWith('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
      })
    })
  })

  describe('event', () => {
    it('tracks custom events correctly', () => {
      const eventData = {
        action: 'button_click',
        category: 'engagement',
        label: 'test-button',
        value: 1,
      }

      analytics.event(eventData)

      expect(mockGtag).toHaveBeenCalledWith('event', 'button_click', {
        event_category: 'engagement',
        event_label: 'test-button',
        value: 1,
      })
    })
  })

  describe('trackMembershipAction', () => {
    it('tracks membership actions', () => {
      analytics.trackMembershipAction('start_application')

      expect(mockGtag).toHaveBeenCalledWith('event', 'membership_action', {
        event_category: 'conversion',
        event_label: 'start_application',
        value: undefined,
      })
    })
  })

  describe('trackFormSubmit', () => {
    it('tracks form submissions', () => {
      analytics.trackFormSubmit('contact-form')

      expect(mockGtag).toHaveBeenCalledWith('event', 'form_submit', {
        event_category: 'engagement',
        event_label: 'contact-form',
        value: undefined,
      })
    })
  })
})