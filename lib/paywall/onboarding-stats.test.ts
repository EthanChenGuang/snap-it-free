import { describe, expect, it } from 'vitest';
import type { ListingRow } from '@/lib/listings/types';
import { activeCityCount, buildCityMap, dailyCountsLast7, newestPostedMs, pickShowcase } from './onboarding-stats';

function row(over: Partial<ListingRow>): ListingRow {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    source: 'ugc',
    title: 't',
    photo_url: 'https://example.com/p.jpg',
    external_url: '',
    lat: null,
    lng: null,
    zone: null,
    posted_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1e9).toISOString(),
    status: 'active',
    ...over,
  };
}

const NOW = new Date(2026, 9, 31, 15, 0, 0).getTime(); // local time

describe('dailyCountsLast7', () => {
  it('buckets by local day, oldest first, today last; ignores older rows', () => {
    const at = (daysBack: number, hour = 10) => new Date(2026, 9, 31 - daysBack, hour).toISOString();
    const rows = [row({ posted_at: at(0) }), row({ posted_at: at(0, 1) }), row({ posted_at: at(6) }), row({ posted_at: at(7) }), row({ posted_at: 'bad' })];
    const days = dailyCountsLast7(rows, NOW);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.count)).toEqual([1, 0, 0, 0, 0, 0, 2]);
    expect(days[6].dayStart).toBe(new Date(2026, 9, 31).getTime());
    expect(days[0].dayStart).toBe(new Date(2026, 9, 25).getTime());
  });

  it('counts future-stamped rows as today', () => {
    const days = dailyCountsLast7([row({ posted_at: new Date(NOW + 3 * 86_400_000).toISOString() })], NOW);
    expect(days[6].count).toBe(1);
  });
});

describe('newestPostedMs / activeCityCount', () => {
  it('returns the newest stamp clamped to now, or null', () => {
    expect(newestPostedMs([], NOW)).toBeNull();
    expect(newestPostedMs([row({ posted_at: new Date(NOW - 5000).toISOString() }), row({ posted_at: new Date(NOW - 9000).toISOString() })], NOW)).toBe(NOW - 5000);
    expect(newestPostedMs([row({ posted_at: new Date(NOW + 5000).toISOString() })], NOW)).toBe(NOW);
  });

  it('counts distinct consumer cities', () => {
    expect(activeCityCount([row({ zone: 'centro_storico' }), row({ zone: 'lido_murano' }), row({})])).toBe(1);
  });
});

describe('buildCityMap', () => {
  it('returns null when no row has a known city', () => {
    expect(buildCityMap([row({})])).toBeNull();
  });

  it('counts every row per city, busiest first, at the catalog city centre', () => {
    const rows = [
      row({ zone: 'centro_storico' }),
      ...Array.from({ length: 3 }, () => row({ city: 'milano' })),
      row({ city: 'padova' }),
      row({ city: 'padova' }),
      row({}),
    ];
    const map = buildCityMap(rows);
    expect(map?.total).toBe(6);
    expect(map?.cities.map((c) => [c.city, c.count])).toEqual([
      ['milano', 3],
      ['padova', 2],
      ['venice', 1],
    ]);
    const [lng, lat] = map!.cities[0].lngLat;
    expect(lat).toBeCloseTo(45.45, 2);
    expect(lng).toBeCloseTo(9.15, 2);
  });
});

describe('pickShowcase', () => {
  const tech = (id: string, title: string, at: number) => row({ id, title, category: 'informatica', posted_at: new Date(at).toISOString() });
  const pet = (id: string, title: string, at: number) => row({ id, title, category: 'animali', posted_at: new Date(at).toISOString() });

  it('uses the pinned iMac and Ragdoll while they are active', async () => {
    const { SHOWCASE_PINNED } = await import('./onboarding-stats');
    const picked = pickShowcase([
      tech('x', 'MacBook Pro', NOW),
      tech(SHOWCASE_PINNED.electronics, 'iMac', NOW - 9e8),
      pet(SHOWCASE_PINNED.pet, 'Ragdoll', NOW - 9e8),
      pet('y', 'Gattina', NOW),
    ]);
    expect(picked.map((r) => r.id)).toEqual([SHOWCASE_PINNED.electronics, SHOWCASE_PINNED.pet]);
  });

  it('falls back to the newest premium-looking computer item and the newest pet, skipping junk', () => {
    const picked = pickShowcase([
      tech('a', 'Cover iPhone 5', NOW),
      tech('b', 'C.E.R.C.O MSI MEG', NOW),
      tech('c', 'Monitor Samsung 22 pollici', NOW - 1000),
      tech('d', 'Stampante Epson', NOW - 10),
      pet('e', 'Cucciola Doriana', NOW - 5),
      row({ id: 'f', title: 'Divano', category: 'arredamento-casalinghi', posted_at: new Date(NOW).toISOString() }),
    ]);
    expect(picked.map((r) => r.id)).toEqual(['c', 'e']);
  });

  it('never picks an item without a photo', () => {
    expect(pickShowcase([tech('a', 'Laptop Dell', NOW), pet('b', 'Gatto', NOW)].map((r) => ({ ...r, photo_url: '' })))).toEqual([]);
  });
});
