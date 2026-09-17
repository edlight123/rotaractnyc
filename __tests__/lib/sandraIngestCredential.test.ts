/**
 * Which credential the Drive ingest uses.
 *
 * The ingest needs two things: read access to the shared Drive, and write
 * access to Firestore. It already required FIREBASE_SERVICE_ACCOUNT for the
 * second, so once that identity is granted Viewer on the source folders it
 * can do both — and Vercel stops needing a second Drive key at all.
 *
 * That matters beyond tidiness: the key it replaces belongs to a different
 * GCP project and has EDIT rights on the club's shared Drive. A leak of the
 * production environment could have rewritten those documents. The Firebase
 * identity is a reader there, so the same leak can only read them.
 *
 * GOOGLE_SA_JSON still wins when present, so nothing breaks the moment this
 * ships and the variable can be removed on its own schedule.
 */
import { resolveDriveCredential } from '@/lib/services/sandraIngest';

describe('resolveDriveCredential', () => {
  it('prefers GOOGLE_SA_JSON when it is set', () => {
    const r = resolveDriveCredential({ GOOGLE_SA_JSON: '{"a":1}', FIREBASE_SERVICE_ACCOUNT: '{"b":2}' });
    expect(r).toEqual({ source: 'GOOGLE_SA_JSON', raw: '{"a":1}' });
  });

  it('falls back to the Firebase account when GOOGLE_SA_JSON is absent', () => {
    const r = resolveDriveCredential({ FIREBASE_SERVICE_ACCOUNT: '{"b":2}' });
    expect(r).toEqual({ source: 'FIREBASE_SERVICE_ACCOUNT', raw: '{"b":2}' });
  });

  it('treats a blank GOOGLE_SA_JSON as absent', () => {
    // An emptied Vercel variable is the likely shape of "removed", and an
    // empty string is not a credential.
    expect(resolveDriveCredential({ GOOGLE_SA_JSON: '   ', FIREBASE_SERVICE_ACCOUNT: '{"b":2}' }).source)
      .toBe('FIREBASE_SERVICE_ACCOUNT');
  });

  it('says plainly what is missing when neither is set', () => {
    expect(() => resolveDriveCredential({})).toThrow(/GOOGLE_SA_JSON|FIREBASE_SERVICE_ACCOUNT/);
  });
});
