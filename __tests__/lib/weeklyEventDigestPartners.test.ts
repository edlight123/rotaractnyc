import { splitDigestRows, DIGEST_PARTNER_LIMIT } from '@/lib/services/digestPartners';

const row = (id: string, host?: string) => ({ id, host, title: id, slug: id });

describe('splitDigestRows', () => {
  it('keeps all Rotaract events and caps partners at the limit', () => {
    const rows = [
      row('ours-1', 'rotaract'), row('ours-2', 'rotaract'), row('ours-3'),
      row('p1', 'community'), row('p2', 'rotary'), row('p3', 'community'), row('p4', 'rotary'),
    ];
    const { ours, partners, partnerTotal } = splitDigestRows(rows, 3);
    expect(ours.map((r) => r.id)).toEqual(['ours-1', 'ours-2', 'ours-3']);
    expect(partners.map((r) => r.id)).toEqual(['p1', 'p2', 'p3']);
    expect(partnerTotal).toBe(4);
  });

  it('treats a row with no host as ours', () => {
    const { ours, partnerTotal } = splitDigestRows([row('legacy')], 3);
    expect(ours).toHaveLength(1);
    expect(partnerTotal).toBe(0);
  });

  it('reports a partnerTotal at or below the limit so the link can be omitted', () => {
    const { partners, partnerTotal } = splitDigestRows([row('p1', 'rotary')], 3);
    expect(partners).toHaveLength(1);
    expect(partnerTotal).toBe(1);
  });
});

describe('DIGEST_PARTNER_LIMIT', () => {
  it('is three', () => {
    expect(DIGEST_PARTNER_LIMIT).toBe(3);
  });
  it('is the default when no limit is passed', () => {
    const rows = ['p1', 'p2', 'p3', 'p4'].map((id) => row(id, 'community'));
    expect(splitDigestRows(rows).partners).toHaveLength(3);
  });
});
