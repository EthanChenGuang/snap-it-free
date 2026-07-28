import { beforeEach, describe, expect, it } from 'vitest';
import {
  FAVORITES_STORAGE_KEY,
  pruneFavoriteIds,
  readFavoriteIds,
  toggleFavoriteId,
} from './storage';

const SAMPLE_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('readFavoriteIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage is empty', () => {
    expect(readFavoriteIds()).toEqual([]);
  });

  it('returns empty array when JSON is corrupt', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{not-json');
    expect(readFavoriteIds()).toEqual([]);
  });

  it('returns empty array when parsed value is not an array', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{"foo":1}');
    expect(readFavoriteIds()).toEqual([]);
  });
});

describe('toggleFavoriteId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds then removes UUID', () => {
    const afterAdd = toggleFavoriteId(SAMPLE_ID);
    expect(afterAdd).toEqual([SAMPLE_ID]);
    expect(readFavoriteIds()).toEqual([SAMPLE_ID]);

    const afterRemove = toggleFavoriteId(SAMPLE_ID);
    expect(afterRemove).toEqual([]);
    expect(readFavoriteIds()).toEqual([]);
  });
});

describe('pruneFavoriteIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes IDs not in fetched set', () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([SAMPLE_ID, OTHER_ID, '00000000-0000-0000-0000-000000000099']),
    );

    const pruned = pruneFavoriteIds([SAMPLE_ID, OTHER_ID]);
    expect(pruned).toEqual([SAMPLE_ID, OTHER_ID]);
    expect(readFavoriteIds()).toEqual([SAMPLE_ID, OTHER_ID]);
  });
});
