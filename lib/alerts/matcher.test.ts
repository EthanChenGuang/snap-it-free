import { describe, expect, it } from 'vitest';
import { alertMatchesListing } from './matcher';

describe('alertMatchesListing', () => {
  const listing = {
    title: 'Free Sofa in Mestre',
    zone: 'mestre_marghera' as const,
  };

  it('matches keyword substring case-insensitively', () => {
    expect(
      alertMatchesListing({ keyword: 'SOFA', zone: null }, listing),
    ).toBe(true);
    expect(
      alertMatchesListing({ keyword: 'sofa', zone: null }, listing),
    ).toBe(true);
    expect(
      alertMatchesListing({ keyword: 'chair', zone: null }, listing),
    ).toBe(false);
  });

  it('matches zone exactly', () => {
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'mestre_marghera' },
        listing,
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'centro_storico' },
        listing,
      ),
    ).toBe(false);
  });

  it('requires both keyword and zone when both are set (AND logic)', () => {
    expect(
      alertMatchesListing(
        { keyword: 'sofa', zone: 'mestre_marghera' },
        listing,
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: 'sofa', zone: 'centro_storico' },
        listing,
      ),
    ).toBe(false);
    expect(
      alertMatchesListing(
        { keyword: 'chair', zone: 'mestre_marghera' },
        listing,
      ),
    ).toBe(false);
  });

  it('keyword-only passes any zone', () => {
    expect(
      alertMatchesListing({ keyword: 'sofa', zone: null }, {
        title: 'Sofa',
        zone: 'lido_murano',
      }),
    ).toBe(true);
  });

  it('zone-only ignores title', () => {
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'mestre_marghera' },
        { title: 'Unrelated item', zone: 'mestre_marghera' },
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'mestre_marghera' },
        { title: 'Sofa', zone: 'centro_storico' },
      ),
    ).toBe(false);
  });
});
