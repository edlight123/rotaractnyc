/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import CreateEventModal from '@/components/portal/CreateEventModal';
import { apiPost, apiPatch } from '@/hooks/useFirestore';

jest.mock('@/hooks/useFirestore', () => ({
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
}));
jest.mock('@/lib/firebase/upload', () => ({
  uploadFile: jest.fn(),
  validateFile: jest.fn(),
}));

describe('CreateEventModal step navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
  });

  it('does not save the event when Next is clicked through every step', () => {
    render(<CreateEventModal open onClose={() => {}} />);

    // Basics -> When -> Where -> Details; the last click used to submit the form.
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }

    expect(apiPost).not.toHaveBeenCalled();
    expect(apiPatch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /create event/i })).toBeTruthy();
  });

  it('advances a step instead of saving when the form is submitted early', () => {
    const { container } = render(<CreateEventModal open onClose={() => {}} />);

    fireEvent.submit(container.ownerDocument.querySelector('form')!);

    expect(apiPost).not.toHaveBeenCalled();
    expect(screen.queryByText(/event title is required/i)).toBeNull();
  });
});
