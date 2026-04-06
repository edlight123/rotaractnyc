/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Textarea from '@/components/ui/Textarea';

describe('Textarea component', () => {
  it('renders with a label', () => {
    render(<Textarea label="Message" />);
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('associates label with textarea via htmlFor/id', () => {
    render(<Textarea label="Your Message" />);
    const textarea = screen.getByLabelText('Your Message');
    expect(textarea).toHaveAttribute('id', 'your-message');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('uses the provided id over the auto-generated one', () => {
    render(<Textarea label="Message" id="custom-textarea" />);
    const textarea = screen.getByLabelText('Message');
    expect(textarea).toHaveAttribute('id', 'custom-textarea');
  });

  it('shows error message with role="alert"', () => {
    render(<Textarea label="Message" error="Message is required" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Message is required');
  });

  it('sets aria-invalid when error prop is provided', () => {
    render(<Textarea label="Message" error="Too short" />);
    const textarea = screen.getByLabelText('Message');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when no error', () => {
    render(<Textarea label="Message" />);
    const textarea = screen.getByLabelText('Message');
    expect(textarea).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-describedby pointing to error id', () => {
    render(<Textarea label="Message" error="Required" />);
    const textarea = screen.getByLabelText('Message');
    const errorEl = screen.getByRole('alert');
    expect(textarea).toHaveAttribute('aria-describedby', errorEl.id);
  });

  it('passes through rows attribute', () => {
    render(<Textarea label="Bio" rows={6} />);
    const textarea = screen.getByLabelText('Bio');
    expect(textarea).toHaveAttribute('rows', '6');
  });

  it('passes through placeholder', () => {
    render(<Textarea label="Notes" placeholder="Write your notes here..." />);
    expect(screen.getByPlaceholderText('Write your notes here...')).toBeInTheDocument();
  });

  it('passes through required attribute', () => {
    render(<Textarea label="Message" required />);
    expect(screen.getByLabelText('Message')).toBeRequired();
  });

  it('renders without a label', () => {
    render(<Textarea placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });
});
