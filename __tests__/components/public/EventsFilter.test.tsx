/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import EventsFilter from '@/components/public/EventsFilter';
import type { RotaractEvent } from '@/types';

function evt(over: Partial<RotaractEvent>): RotaractEvent {
  const future = new Date(Date.now() + 30 * 864e5).toISOString();
  return {
    id: 'e1',
    title: 'Event',
    slug: 'event',
    description: '',
    date: future,
    time: '6:00 PM',
    location: 'New York, NY',
    type: 'free',
    isPublic: true,
    status: 'published',
    createdAt: future,
    ...over,
  } as RotaractEvent;
}

describe('EventsFilter host chips', () => {
  const events = [
    evt({ id: 'a', title: 'Our Supper', slug: 'our-supper', host: 'rotaract' }),
    evt({ id: 'b', title: 'District Conference', slug: 'district', host: 'rotary', hostName: 'District 7230' }),
    evt({ id: 'c', title: 'Hunger Project Gala', slug: 'thp', host: 'community', hostName: 'The Hunger Project' }),
  ];

  it('renders all three bucket chips', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByRole('button', { name: 'Rotaract NYC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotary & District' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Community & Partner' })).toBeInTheDocument();
  });

  it('shows every event by default', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByText('Our Supper')).toBeInTheDocument();
    expect(screen.getByText('District Conference')).toBeInTheDocument();
    expect(screen.getByText('Hunger Project Gala')).toBeInTheDocument();
  });

  it('seeds the filter from initialHost="community"', () => {
    render(<EventsFilter events={events} initialHost="community" />);
    expect(screen.getByText('Hunger Project Gala')).toBeInTheDocument();
    expect(screen.queryByText('Our Supper')).not.toBeInTheDocument();
    expect(screen.queryByText('District Conference')).not.toBeInTheDocument();
  });

  it('shows everything when initialHost is omitted', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByText('Our Supper')).toBeInTheDocument();
    expect(screen.getByText('District Conference')).toBeInTheDocument();
  });

  it('treats an event with no host as a Rotaract event', () => {
    render(<EventsFilter events={[evt({ id: 'z', title: 'Legacy Event', slug: 'legacy' })]} initialHost="rotaract" />);
    expect(screen.getByText('Legacy Event')).toBeInTheDocument();
  });

  it('shows a host badge on partner events only', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByText('The Hunger Project')).toBeInTheDocument();
    expect(screen.getByText('District 7230')).toBeInTheDocument();
  });
});

describe('the "Free" badge and partner events', () => {
  const ticketedPartner = evt({
    id: 'thp',
    title: 'Hunger Project Fall Event',
    slug: 'thp-fall',
    type: 'paid',
    host: 'community',
    hostName: 'The Hunger Project',
    externalUrl: 'https://thp.org/events/fall-event/',
  });

  /** Scope to the card itself — the type-filter chips also read "✓ Free". */
  function card(container: HTMLElement, slug: string) {
    const el = container.querySelector(`a[href="/events/${slug}"]`);
    if (!el) throw new Error(`no card for ${slug}`);
    return within(el as HTMLElement);
  }

  // We have no idea what a partner charges. The old fallback badge asserted
  // "Free" for any non-free event without pricing, which on a ticketed
  // partner event is an outright false claim.
  it('does not claim a ticketed partner event is free', () => {
    const { container } = render(<EventsFilter events={[ticketedPartner]} />);
    expect(card(container, 'thp-fall').queryByText('✓ Free')).not.toBeInTheDocument();
    expect(card(container, 'thp-fall').getByText('The Hunger Project')).toBeInTheDocument();
  });

  it('still shows Free for one of our own non-free events without pricing', () => {
    const { container } = render(
      <EventsFilter events={[evt({ id: 'o', title: 'Our Service Day', slug: 'ours', type: 'service' })]} />,
    );
    expect(card(container, 'ours').getByText('✓ Free')).toBeInTheDocument();
  });
});
