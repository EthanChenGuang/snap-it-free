import { describe, expect, it } from 'vitest';
import { mergeFavoriteIds } from './merge';

const A = '550e8400-e29b-41d4-a716-446655440000';
const B = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const C = '6ba7b811-9dad-11d1-80b4-00c04fd430c9';

describe('mergeFavoriteIds', () => {
  it('unions local and remote and dedupes', () => {
    expect(mergeFavoriteIds([A, B], [B, C])).toEqual([A, B, C]);
  });

  it('returns remote when local is empty', () => {
    expect(mergeFavoriteIds([], [A, B])).toEqual([A, B]);
  });

  it('returns local when remote is empty', () => {
    expect(mergeFavoriteIds([A, B], [])).toEqual([A, B]);
  });
});
