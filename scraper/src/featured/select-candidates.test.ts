import { describe, expect, it } from 'vitest';
import { buildSourceUrl, selectCandidates, type CandidateListing } from './select-candidates.js';

const PHOTO = 'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/63/abc?rule=card-desktop-new-small-4x-auto';

function row(id: string, over: Partial<CandidateListing> = {}): CandidateListing {
  return {
    id,
    category: 'arredamento-casalinghi',
    photo_url: PHOTO,
    zone: null,
    city: 'padova',
    lat: null,
    lng: null,
    posted_at: `2026-11-08T${String(10 + Number(id) % 10).padStart(2, '0')}:00:00Z`,
    ...over,
  };
}

describe('buildSourceUrl', () => {
  it('swaps the rule to the full-frame source preset', () => {
    expect(buildSourceUrl(PHOTO)).toBe(
      'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/63/abc?rule=gallery-desktop-2x-auto',
    );
  });

  it.each([
    'https://evil.example.com/x.jpg?rule=a',
    'http://images.sbito.it/x?rule=a',
    'https://images.sbito.it.evil.com/x',
    'https://images.sbito.it:8443/x',
    'not a url',
    null,
  ])('rejects %s', (url) => {
    expect(buildSourceUrl(url as string | null)).toBeNull();
  });
});

describe('selectCandidates', () => {
  it('skips non-sbito hosts, animali, unmapped cities and processed ids', () => {
    const out = selectCandidates(
      [
        row('1'),
        row('2', { photo_url: 'https://evil.example.com/a.jpg' }),
        row('3', { category: 'animali' }),
        row('4', { city: 'atlantis' }),
        row('5'),
      ],
      new Set(['5']),
    );
    expect(out.map((c) => c.listingId)).toEqual(['1']);
    expect(out[0]!.consumerCity).toBe('padova');
  });

  it('caps per city and keeps newest first', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      row(String(i), { posted_at: `2026-11-08T00:00:${String(i).padStart(2, '0')}Z` }),
    );
    const out = selectCandidates(rows, new Set(), 15);
    expect(out).toHaveLength(15);
    expect(out[0]!.listingId).toBe('19');
  });

  it('caps each city independently', () => {
    const rows = [
      ...Array.from({ length: 3 }, (_, i) => row(`p${i}`)),
      ...Array.from({ length: 3 }, (_, i) => row(`m${i}`, { city: 'milano' })),
    ];
    const out = selectCandidates(rows, new Set(), 2);
    expect(out.filter((c) => c.consumerCity === 'padova')).toHaveLength(2);
    expect(out.filter((c) => c.consumerCity === 'milano')).toHaveLength(2);
  });
});
