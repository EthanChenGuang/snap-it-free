import { describe, expect, it } from 'vitest';
import type { ListingRow } from '@/lib/listings/types';
import { buildOnboardingSummary, cityTeaserFromSummary } from './onboarding-summary';

const NOW = new Date(2026, 10, 8, 12).getTime();
let n = 0;
function row(over: Partial<ListingRow>): ListingRow {
  n += 1;
  return {
    id: `r${n}`,
    source: 'subito',
    title: 't',
    photo_url: `https://img/${n}.jpg`,
    external_url: '',
    lat: null,
    lng: null,
    zone: null,
    posted_at: new Date(NOW - n * 60_000).toISOString(),
    expires_at: new Date(NOW + 1e9).toISOString(),
    status: 'active',
    ...over,
  };
}

const rows = [
  row({ city: 'padova', category: 'libri-riviste' }),
  row({ city: 'padova', category: 'animali' }),
  row({ zone: 'centro_storico', category: 'libri-riviste' }),
  row({ city: 'milano', category: 'libri-riviste' }),
  row({ city: 'milano', category: 'animali', posted_at: new Date(NOW - 9 * 86_400_000).toISOString() }),
  row({ city: 'nowhere', category: 'animali' }),
];

describe('buildOnboardingSummary', () => {
  const s = buildOnboardingSummary(rows, NOW);

  it('keeps the Veneto figures the onboarding showed before', () => {
    expect(s.venetoCount).toBe(3);
    expect(s.venetoRecentMs).toHaveLength(3);
    expect(s.cityCount).toBe(2);
    expect(s.map?.total).toBe(5);
    expect(s.collage).toHaveLength(3);
  });

  it('counts per city and category, ignoring rows outside covered cities', () => {
    expect(s.buckets.padova['libri-riviste'].count).toBe(1);
    expect(s.buckets.milano.animali.count).toBe(1);
    expect(Object.keys(s.buckets)).not.toContain('nowhere');
  });
});

describe('cityTeaserFromSummary', () => {
  const s = buildOnboardingSummary(rows, NOW);

  it('narrows a city to the picked categories, or counts all of it', () => {
    expect(cityTeaserFromSummary(s, 'padova', ['libri-riviste']).count).toBe(1);
    expect(cityTeaserFromSummary(s, 'padova', []).count).toBe(2);
    expect(cityTeaserFromSummary(s, 'verona', []).count).toBe(0);
  });

  it("'all' sums every covered city, still narrowed by interests, with photos", () => {
    const books = cityTeaserFromSummary(s, 'all', ['libri-riviste']);
    expect(books.count).toBe(3);
    expect(books.photos).toHaveLength(3);
    expect(cityTeaserFromSummary(s, 'all', []).count).toBe(5);
  });
});
