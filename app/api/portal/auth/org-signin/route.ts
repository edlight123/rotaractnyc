import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { rateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Exchanges a Workspace-account sign-in for a session as the member's own
 * canonical Firebase user.
 *
 * A provisioned member has two addresses: the personal one their member doc is
 * keyed on and the @rotaractnyc.org Workspace address issued to them. Choosing
 * the Workspace account in Google's chooser mints a separate Firebase uid with
 * no member doc, so the portal appears empty to them.
 *
 * Firebase cannot solve this by linking: it permits at most one account per
 * provider per user, and both of these are google.com, so linkWithPopup always
 * throws auth/provider-already-linked. Instead we verify the Workspace sign-in
 * and mint a custom token for the member's EXISTING uid. The client signs in
 * with it and becomes that user — so the member doc, role, and every uid-keyed
 * record (RSVPs keyed `{uid}_{eventId}`, service hours, dues, messages) resolve
 * unchanged. Nothing is migrated, duplicated, or re-keyed.
 *
 * This issues a session for a different uid than the one that authenticated,
 * so the gates below are the security boundary and are deliberately strict.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(getRateLimitKey(request, 'portal-org-signin'), {
    max: 5,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const workspaceDomain = (process.env.GOOGLE_WORKSPACE_DOMAIN || '').trim().toLowerCase();
  if (!workspaceDomain) {
    return NextResponse.json(
      { error: 'Workspace sign-in is not configured. Set GOOGLE_WORKSPACE_DOMAIN.' },
      { status: 503 },
    );
  }

  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
    }

    // checkRevoked: this grants access to another uid, so a revoked or
    // disabled Workspace account must not be able to complete it.
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const email = (decoded.email || '').toLowerCase();

    // Gate 1 — the address must be verified and on the club's own Workspace
    // domain. This is what makes the mapping trustworthy: only addresses the
    // club's Google Workspace issues and controls can reach this path, so a
    // stray `orgEmail` value pointing at an outside address grants nothing.
    if (!decoded.email_verified || !email.endsWith(`@${workspaceDomain}`)) {
      return NextResponse.json(
        { error: 'This is not a Rotaract NYC workspace account.' },
        { status: 403 },
      );
    }

    // Gate 2 — the caller must not already be a member in their own right.
    // Someone with their own membership has no business assuming another.
    const ownMember = await adminDb.collection('members').doc(decoded.uid).get();
    if (ownMember.exists) {
      return NextResponse.json(
        { error: 'This account already has its own membership.' },
        { status: 409 },
      );
    }

    // Gate 3 — exactly one member must claim this address as their
    // board-provisioned orgEmail. Ambiguity is refused, never guessed.
    // `orgEmail` is written only by the provisioning API routes and is
    // protected from member self-edit in firestore.rules.
    const matches = await adminDb
      .collection('members')
      .where('orgEmail', '==', email)
      .limit(2)
      .get();
    const owners = matches.docs.filter((d) => d.id !== decoded.uid);

    if (owners.length === 0) {
      return NextResponse.json(
        { error: 'No membership is registered to this workspace address.' },
        { status: 404 },
      );
    }
    if (owners.length > 1) {
      console.error(`Workspace sign-in ambiguous: ${email} claimed by multiple members`);
      return NextResponse.json(
        { error: 'This address is registered to more than one member. Contact the board.' },
        { status: 409 },
      );
    }

    const owner = owners[0];
    const ownerData = owner.data() || {};
    if (ownerData.status !== 'active') {
      return NextResponse.json({ error: 'That membership is not active.' }, { status: 403 });
    }

    const customToken = await adminAuth.createCustomToken(owner.id);
    console.info(`Workspace sign-in: ${email} -> member ${owner.id}`);

    return NextResponse.json({
      customToken,
      registeredEmail: (ownerData.email as string) || '',
    });
  } catch (err: any) {
    console.error('Workspace sign-in failed:', err?.message || err);
    return NextResponse.json(
      { error: 'Could not complete workspace sign-in. Please sign in again.' },
      { status: 401 },
    );
  }
}
