/**
 * Partner-event handling for the weekly digest.
 *
 * Kept separate from weeklyEventDigest.ts, which imports the PDF renderer and
 * so cannot be loaded in a plain unit test.
 */

/** How many non-Rotaract events the digest lists before linking to the rest. */
export const DIGEST_PARTNER_LIMIT = 3;

/**
 * Split digest rows into ours and partners', capping the latter.
 *
 * Uncapped, a District conference season turns the digest into a listings
 * dump. `partnerTotal` is the uncapped count so the email can say
 * "See all 9 …" — and omit the link entirely when nothing is hidden.
 *
 * Rows with no `host` are ours: every event predating this feature is a
 * Rotaract event.
 */
export function splitDigestRows<T extends { host?: string }>(
  rows: T[],
  limit: number = DIGEST_PARTNER_LIMIT,
): { ours: T[]; partners: T[]; partnerTotal: number } {
  const ours = rows.filter((r) => (r.host ?? 'rotaract') === 'rotaract');
  const allPartners = rows.filter((r) => (r.host ?? 'rotaract') !== 'rotaract');
  return {
    ours,
    partners: allPartners.slice(0, limit),
    partnerTotal: allPartners.length,
  };
}
