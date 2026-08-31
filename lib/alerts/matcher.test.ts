import { describe, expect, it } from 'vitest';
import { alertMatchesListing } from './matcher';

describe('alertMatchesListing', () => {
  const listing = {
    title: 'Free Sofa in Mestre',
    zone: 'mestre_marghera' as const,
    city: null,
    lat: 45.48,
    lng: 12.24,
  };

  it('matches keyword substring case-insensitively', () => {
    expect(
      alertMatchesListing({ keyword: 'SOFA', zone: null, city: null }, listing),
    ).toBe(true);
    expect(
      alertMatchesListing({ keyword: 'sofa', zone: null, city: null }, listing),
    ).toBe(true);
    expect(
      alertMatchesListing({ keyword: 'chair', zone: null, city: null }, listing),
    ).toBe(false);
  });

  it('matches legacy zone exactly', () => {
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'mestre_marghera', city: null },
        listing,
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'centro_storico', city: null },
        listing,
      ),
    ).toBe(false);
  });

  it('matches consumer city for Venice zone listings', () => {
    expect(
      alertMatchesListing(
        { keyword: null, zone: null, city: 'venice' },
        listing,
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: null, zone: null, city: 'padova' },
        listing,
      ),
    ).toBe(false);
  });

  it('matches consumer city from listing city field', () => {
    expect(
      alertMatchesListing(
        { keyword: null, zone: null, city: 'padova' },
        {
          title: 'Free desk',
          zone: null,
          city: 'padova',
          lat: 45.41,
          lng: 11.88,
        },
      ),
    ).toBe(true);
  });

  it('requires both keyword and location when both are set (AND logic)', () => {
    expect(
      alertMatchesListing(
        { keyword: 'sofa', zone: 'mestre_marghera', city: null },
        listing,
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: 'sofa', zone: null, city: 'venice' },
        listing,
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: 'sofa', zone: 'centro_storico', city: null },
        listing,
      ),
    ).toBe(false);
    expect(
      alertMatchesListing(
        { keyword: 'chair', zone: 'mestre_marghera', city: null },
        listing,
      ),
    ).toBe(false);
  });

  it('matches encoded legacy city payloads in keyword column', () => {
    expect(
      alertMatchesListing(
        { keyword: '@city:venice@sofa', zone: null, city: null },
        listing,
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: '@city:venice@chair', zone: null, city: null },
        listing,
      ),
    ).toBe(false);
  });

  it('keyword-only passes any location', () => {
    expect(
      alertMatchesListing({ keyword: 'sofa', zone: null, city: null }, {
        title: 'Sofa',
        zone: 'lido_murano',
        city: null,
        lat: 45.35,
        lng: 12.33,
      }),
    ).toBe(true);
  });

  it('zone-only ignores title', () => {
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'mestre_marghera', city: null },
        { title: 'Unrelated item', zone: 'mestre_marghera', city: null, lat: null, lng: null },
      ),
    ).toBe(true);
    expect(
      alertMatchesListing(
        { keyword: null, zone: 'mestre_marghera', city: null },
        { title: 'Sofa', zone: 'centro_storico', city: null, lat: null, lng: null },
      ),
    ).toBe(false);
  });
});
