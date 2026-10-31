import { describe, expect, it } from 'vitest';
import type { ListingRow } from '@/lib/listings/types';
import { activeCityCount, buildMapTeaser, dailyCountsLast7, newestPostedMs } from './onboarding-stats';

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

describe('buildMapTeaser', () => {
  it('returns null without located rows', () => {
    expect(buildMapTeaser([row({ zone: 'centro_storico' })])).toBeNull();
  });

  it('picks the city with most located rows, newest first, positions inside the padded box with north up', () => {
    const rows = [
      row({ id: 'a', zone: 'centro_storico', lat: 45.44, lng: 12.32, posted_at: new Date(NOW - 1000).toISOString() }),
      row({ id: 'b', zone: 'centro_storico', lat: 45.43, lng: 12.34, posted_at: new Date(NOW - 2000).toISOString() }),
      row({ id: 'c', zone: 'centro_storico', lat: 45.45, lng: 12.33, posted_at: new Date(NOW - 3000).toISOString(), photo_url: '' }),
    ];
    const teaser = buildMapTeaser(rows, 12, 10);
    expect(teaser?.city).toBe('venice');
    expect(teaser?.total).toBe(3);
    expect(teaser?.pins.map((p) => p.id)).toEqual(['a', 'b']);
    for (const pin of teaser!.pins) {
      expect(pin.x).toBeGreaterThanOrEqual(10);
      expect(pin.x).toBeLessThanOrEqual(90);
      expect(pin.y).toBeGreaterThanOrEqual(10);
      expect(pin.y).toBeLessThanOrEqual(90);
    }
    const [a, b] = teaser!.pins;
    expect(a.y).toBeLessThan(b.y); // a is further north
    expect(a.x).toBeLessThan(b.x); // a is further west
  });

  it('respects the pin limit', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      row({ zone: 'centro_storico', lat: 45.43 + i * 0.001, lng: 12.33, posted_at: new Date(NOW - i * 1000).toISOString() }),
    );
    expect(buildMapTeaser(rows, 5)?.pins).toHaveLength(5);
    expect(buildMapTeaser(rows, 5)?.total).toBe(20);
  });
});
