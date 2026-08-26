import { describe, expect, it } from 'vitest';
import { loadFixtureSearch, parseWallapopSearchResponse } from './http-extract.js';
import { normalizeWallapopRawListing } from './normalize.js';

const SEED =
  'https://it.wallapop.com/app/search?keywords=gratis&latitude=45.4408&longitude=12.3155';

describe('normalizeWallapopRawListing', () => {
  it('accepts €0 listing with Venice coords', () => {
    const { listings } = parseWallapopSearchResponse(loadFixtureSearch(), SEED);
    const raw = listings[0]!;
    const result = normalizeWallapopRawListing(raw);
    expect('reject' in result).toBe(false);
    if ('reject' in result) return;
    expect(result.source).toBe('wallapop');
    expect(result.lat).not.toBeNull();
  });

  it('rejects non-free listing', () => {
    const { listings } = parseWallapopSearchResponse(loadFixtureSearch(), SEED);
    const paid = listings.find((l) => l.external_id === '9840000003')!;
    expect(normalizeWallapopRawListing(paid)).toEqual({ reject: 'not_free' });
  });
});
