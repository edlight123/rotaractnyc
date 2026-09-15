/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import EventsFilter from '@/components/public/EventsFilter';
import type { RotaractEvent } from '@/types';

const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

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

  beforeEach(() => {
    mockSearchParams.delete('host');
  });

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

  it('seeds the filter from ?host=community', () => {
    mockSearchParams.set('host', 'community');
    render(<EventsFilter events={events} />);
    expect(screen.getByText('Hunger Project Gala')).toBeInTheDocument();
    expect(screen.queryByText('Our Supper')).not.toBeInTheDocument();
    expect(screen.queryByText('District Conference')).not.toBeInTheDocument();
  });

  it('falls back to All for an unrecognised ?host= value', () => {
    mockSearchParams.set('host', 'nonsense');
    render(<EventsFilter events={events} />);
    expect(screen.getByText('Our Supper')).toBeInTheDocument();
    expect(screen.getByText('District Conference')).toBeInTheDocument();
  });

  it('treats an event with no host as a Rotaract event', () => {
    mockSearchParams.set('host', 'rotaract');
    render(<EventsFilter events={[evt({ id: 'z', title: 'Legacy Event', slug: 'legacy' })]} />);
    expect(screen.getByText('Legacy Event')).toBeInTheDocument();
  });

  it('shows a host badge on partner events only', () => {
    render(<EventsFilter events={events} />);
    expect(screen.getByText('The Hunger Project')).toBeInTheDocument();
    expect(screen.getByText('District 7230')).toBeInTheDocument();
  });
});
