/**
 * Every browser-side Firestore query needs a matching composite index.
 *
 * This is not bookkeeping. The portal reads collections straight from the
 * browser, and a query with no index fails outright with FAILED_PRECONDITION
 * — the member sees an empty list, not a slow one. That is exactly how
 * usePortalEvents shipped in 0f2c56e: the where('audience','in',…) clause
 * landed without the index it requires, so every signed-in member saw no
 * events while signed-out visitors (served from adminDb, which was fine)
 * could see and register for them.
 *
 * Direction matters and is not forgiving. Verified against the live project:
 * the existing (isPublic ASC, status ASC, date ASC) index serves
 * orderBy('date','asc') and is rejected for orderBy('date','desc'). So the
 * index must carry the same order the query asks for.
 *
 * Adding a where() + orderBy() pair to a client query means adding the index
 * here and to firestore.indexes.json, then `npm run deploy:indexes`.
 */
import fs from 'fs';
import path from 'path';
import { visibleAudiences } from '@/lib/utils/eventAudience';

type IndexField = { fieldPath: string; order?: string; arrayConfig?: string };
type CompositeIndex = { collectionGroup: string; fields: IndexField[] };

const indexes: CompositeIndex[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firestore.indexes.json'), 'utf8'),
).indexes;

function hasIndex(collectionGroup: string, required: IndexField[]): boolean {
  return indexes.some(
    (index) =>
      index.collectionGroup === collectionGroup &&
      index.fields.length === required.length &&
      index.fields.every(
        (f, i) => f.fieldPath === required[i].fieldPath && f.order === required[i].order,
      ),
  );
}

const ASC = 'ASCENDING';
const DESC = 'DESCENDING';

describe('firestore.indexes.json covers the client-side queries', () => {
  it('serves usePortalEvents — the whole member events list depends on it', () => {
    // where('audience','in',['public','members']).orderBy('date','desc')
    expect(visibleAudiences({ signedIn: true })).toEqual(['public', 'members']);
    expect(
      hasIndex('events', [
        { fieldPath: 'audience', order: ASC },
        { fieldPath: 'date', order: DESC },
      ]),
    ).toBe(true);
  });

  it('serves usePortalEvents for board members on the same index', () => {
    // A wider `in` list does not change the index the query needs.
    expect(visibleAudiences({ signedIn: true, role: 'board' })).toEqual([
      'public',
      'members',
      'board',
    ]);
    expect(
      hasIndex('events', [
        { fieldPath: 'audience', order: ASC },
        { fieldPath: 'date', order: DESC },
      ]),
    ).toBe(true);
  });

  it('no longer declares an index for the renamed `visibility` field', () => {
    // `visibility` became `audience` in 0f2c56e. The index was left behind
    // pointing at a field no document carries, which is what made the gap
    // easy to miss when skimming this file.
    expect(
      indexes.some(
        (i) => i.collectionGroup === 'events' && i.fields.some((f) => f.fieldPath === 'visibility'),
      ),
    ).toBe(false);
  });

  it('serves useCommitteeDocuments', () => {
    expect(
      hasIndex('documents', [
        { fieldPath: 'committeeId', order: ASC },
        { fieldPath: 'createdAt', order: DESC },
      ]),
    ).toBe(true);
  });

  it('serves useCommitteePosts', () => {
    expect(
      hasIndex('posts', [
        { fieldPath: 'committeeId', order: ASC },
        { fieldPath: 'createdAt', order: DESC },
      ]),
    ).toBe(true);
  });

  it('serves useMemberRsvps, useServiceHours and useMessages', () => {
    expect(
      hasIndex('rsvps', [
        { fieldPath: 'memberId', order: ASC },
        { fieldPath: 'createdAt', order: DESC },
      ]),
    ).toBe(true);
    expect(
      hasIndex('serviceHours', [
        { fieldPath: 'memberId', order: ASC },
        { fieldPath: 'createdAt', order: DESC },
      ]),
    ).toBe(true);
    expect(
      hasIndex('messages', [
        { fieldPath: 'recipientId', order: ASC },
        { fieldPath: 'createdAt', order: DESC },
      ]),
    ).toBe(true);
  });
});
