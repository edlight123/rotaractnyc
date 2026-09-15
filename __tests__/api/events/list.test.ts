/**
 * Tests for GET /api/events (list branch).
 *
 * Regression guard for a silent data-loss bug: the query was
 * .orderBy('date', 'asc').limit(20), which returns the twenty *oldest*
 * events. With 34 documents in the collection, no upcoming event ever
 * appeared in this endpoint — so the site search index built from it could
 * not find anything current.
 */

const mockLimit = jest.fn();
const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
const mockWhere2 = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockWhere1 = jest.fn(() => ({ where: mockWhere2 }));

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: jest.fn(() => ({ where: mockWhere1 })) },
  serializeDoc: (d: unknown) => d,
}));

import { GET } from '@/app/api/events/route';
import { NextRequest } from 'next/server';

function makeDocs(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    data: () => ({ slug: `event-${i}`, date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` }),
  }));
}

describe('GET /api/events — list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLimit.mockReturnValue({ get: jest.fn().mockResolvedValue({ docs: makeDocs(34) }) });
  });

  it('filters to public, published events', async () => {
    await GET(new NextRequest('http://localhost/api/events'));
    expect(mockWhere1).toHaveBeenCalledWith('isPublic', '==', true);
    expect(mockWhere2).toHaveBeenCalledWith('status', '==', 'published');
  });

  // The actual bug: a cap of 20 silently dropped every upcoming event.
  it('does not cap the list anywhere near the size of the collection', async () => {
    await GET(new NextRequest('http://localhost/api/events'));
    const cap = mockLimit.mock.calls[0][0];
    expect(cap).toBeGreaterThanOrEqual(200);
  });

  it('orders by date', async () => {
    await GET(new NextRequest('http://localhost/api/events'));
    expect(mockOrderBy).toHaveBeenCalledWith('date', expect.any(String));
  });

  it('returns every document the query yields', async () => {
    const res = await GET(new NextRequest('http://localhost/api/events'));
    const body = await res.json();
    expect(body).toHaveLength(34);
  });
});
