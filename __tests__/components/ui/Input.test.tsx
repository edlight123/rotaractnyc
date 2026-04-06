/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from '@/components/ui/Input';

describe('Input component', () => {
  it('renders with a label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor/id', () => {
    render(<Input label="Full Name" />);
    const input = screen.getByLabelText('Full Name');
    expect(input).toHaveAttribute('id', 'full-name');
  });

  it('uses the provided id over the auto-generated one', () => {
    render(<Input label="Full Name" id="custom-id" />);
    const input = screen.getByLabelText('Full Name');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('shows error message with role="alert"', () => {
    render(<Input label="Email" error="Email is required" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Email is required');
  });

  it('sets aria-invalid when error prop is provided', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when no error', () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('sets aria-describedby pointing to error id', () => {
    render(<Input label="Email" error="Bad email" />);
    const input = screen.getByLabelText('Email');
    const errorEl = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-describedby', errorEl.id);
  });

  it('shows helper text when no error', () => {
    render(<Input label="Phone" helperText="Include area code" />);
    expect(screen.getByText('Include area code')).toBeInTheDocument();
  });

  it('does not show helper text when error is present', () => {
    render(
      <Input label="Phone" helperText="Include area code" error="Phone is required" />
    );
    expect(screen.queryByText('Include area code')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Phone is required');
  });

  it('sets aria-describedby to helper id when no error', () => {
    render(<Input label="Phone" helperText="Include area code" />);
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAttribute('aria-describedby', 'phone-helper');
  });

  it('passes through placeholder', () => {
    render(<Input label="Email" placeholder="you@example.com" />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('passes through required attribute', () => {
    render(<Input label="Email" required />);
    expect(screen.getByLabelText('Email')).toBeRequired();
  });

  it('passes through type attribute', () => {
    render(<Input label="Password" type="password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders without a label', () => {
    render(<Input placeholder="search..." />);
    expect(screen.getByPlaceholderText('search...')).toBeInTheDocument();
  });
});
