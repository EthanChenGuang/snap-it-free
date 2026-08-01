import { beforeEach, describe, expect, it } from 'vitest';
import { addReportedId, readReportedIds, REPORTS_STORAGE_KEY } from './storage';

const SAMPLE_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('readReportedIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage is empty', () => {
    expect(readReportedIds()).toEqual([]);
  });

  it('returns empty array when JSON is corrupt', () => {
    localStorage.setItem(REPORTS_STORAGE_KEY, '{not-json');
    expect(readReportedIds()).toEqual([]);
  });
});

describe('addReportedId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds id and round-trips via readReportedIds', () => {
    const ids = addReportedId(SAMPLE_ID);
    expect(ids).toEqual([SAMPLE_ID]);
    expect(readReportedIds()).toEqual([SAMPLE_ID]);

    const next = addReportedId(OTHER_ID);
    expect(next).toEqual([SAMPLE_ID, OTHER_ID]);
    expect(readReportedIds()).toEqual([SAMPLE_ID, OTHER_ID]);
  });

  it('deduplicates ids', () => {
    addReportedId(SAMPLE_ID);
    const again = addReportedId(SAMPLE_ID);
    expect(again).toEqual([SAMPLE_ID]);
  });
});
