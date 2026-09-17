/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TicketScarcity from '@/components/public/TicketScarcity';

// `pricing: null` mirrors what Firestore actually holds for a free event.
const free = { type: 'service' as const, pricing: null };
const paid = { type: 'paid' as const, pricing: { memberPrice: 7000, guestPrice: 7500 } };

describe('TicketScarcity', () => {
  describe('a free, capacity-limited event', () => {
    it('says how many places are left', () => {
      render(<TicketScarcity event={free} capacity={20} ticketsSold={10} />);
      expect(screen.getByText('10 spots left')).toBeInTheDocument();
    });

    it('never pressures people about a free event', () => {
      render(<TicketScarcity event={free} capacity={20} ticketsSold={18} />);
      const text = document.body.textContent ?? '';
      expect(text).toMatch(/2 spots left/);
      expect(text).not.toMatch(/sold out|almost|selling fast|🔥/i);
    });

    it('shows nothing when the event has no capacity', () => {
      const { container } = render(<TicketScarcity event={free} capacity={null} ticketsSold={3} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('shows nothing once it is full', () => {
      const { container } = render(<TicketScarcity event={free} capacity={20} ticketsSold={20} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('a ticketed event', () => {
    it('still gets the urgency messaging', () => {
      render(<TicketScarcity event={paid} capacity={20} ticketsSold={10} />);
      expect(document.body.textContent).toMatch(/Almost sold out/i);
    });

    it('does not get the neutral spots line instead', () => {
      render(<TicketScarcity event={paid} capacity={20} ticketsSold={10} />);
      expect(screen.queryByText('10 spots left')).not.toBeInTheDocument();
    });
  });
});
