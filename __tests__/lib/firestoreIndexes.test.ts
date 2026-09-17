/**
 * Every browser-side Firestore query needs a matching composite index, and
 * for `events` it also needs a shape the security rules can PROVE safe.
 *
 * Both halves of that sentence cost us an outage, and they are different
 * failures with the same symptom — an empty list for signed-in members while
 * guests, served server-side through adminDb, were fine throughout.
 *
 * 1. The missing index. 0f2c56e added where('audience','in',…) to
 *    usePortalEvents while the index here still read `visibility`, the
 *    field's name before that same commit renamed it. Firestore rejects an
 *    unindexed query outright (FAILED_PRECONDITION) rather than running it
 *    slowly, so the list was empty, not short.
 *
 * 2. The unprovable query. Firestore validates a list query STATICALLY — it
 *    never inspects the stored documents. The query's constraints must prove
 *    every document it could return is readable. The events rule is a
 *    three-branch disjunction, and an `in` over `audience` proves none of the
 *    public branch's isPublic/status conditions, so it is denied with
 *    PERMISSION_DENIED no matter how clean the data is. Fixing the index
 *    alone did not fix the bug; this was underneath it.
 *
 * So usePortalEvents runs one query per rule branch and merges. Each branch
 * needs its own index, asserted below.
 *
 * Direction is not forgiving either, verified against the live project: the
 * (isPublic, status, date ASC) index serves orderBy('date','asc') and is
 * REJECTED for orderBy('date','desc'). Firestore does not reverse a
 * composite index to serve the opposite sort.
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
  describe('usePortalEvents — one query per rule branch, each provable', () => {
    it('serves branch 1: public events', () => {
      // where isPublic==true, status=='published', audience=='public'
      //   .orderBy('date','desc')
      // All three equality filters are load-bearing. Drop `audience` and the
      // query no longer proves the document is not a members-only one; drop
      // isPublic or status and it does not prove the rule's public branch.
      expect(
        hasIndex('events', [
          { fieldPath: 'isPublic', order: ASC },
          { fieldPath: 'status', order: ASC },
          { fieldPath: 'audience', order: ASC },
          { fieldPath: 'date', order: DESC },
        ]),
      ).toBe(true);
    });

    it('serves branches 2 and 3: members-only and board-only events', () => {
      // where audience=='members' / =='board', .orderBy('date','desc').
      // A single equality on `audience` proves those branches outright, so
      // both share one index.
      expect(
        hasIndex('events', [
          { fieldPath: 'audience', order: ASC },
          { fieldPath: 'date', order: DESC },
        ]),
      ).toBe(true);
    });

    it('asks for the branches this viewer may actually read', () => {
      expect(visibleAudiences({ signedIn: false })).toEqual(['public']);
      expect(visibleAudiences({ signedIn: true })).toEqual(['public', 'members']);
      expect(visibleAudiences({ signedIn: true, role: 'board' })).toEqual([
        'public',
        'members',
        'board',
      ]);
    });
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
