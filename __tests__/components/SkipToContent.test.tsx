import { render, screen } from '@testing-library/react'
import SkipToContent from '@/components/SkipToContent'

describe('SkipToContent', () => {
  it('renders skip to content link', () => {
    render(<SkipToContent />)
    
    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('has screen reader only class by default', () => {
    render(<SkipToContent />)
    
    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveClass('sr-only')
  })

  it('becomes visible on focus', () => {
    render(<SkipToContent />)
    
    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveClass('focus:not-sr-only')
  })
})