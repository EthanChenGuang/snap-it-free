import { describe, expect, it } from 'vitest';
import type { ListingRow } from '@/lib/listings/types';
import { activeCityCount, buildCityMap, dailyCountsLast7, newestPostedMs } from './onboarding-stats';

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
