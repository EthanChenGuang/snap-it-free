import { describe, expect, it, vi } from 'vitest';
import {
  FEED_LOOKBACK_DAYS,
  FEED_PAGE_SIZE,
  fetchPagedRows,
  feedLookbackSinceIso,
} from './feed-window';

describe('feedLookbackSinceIso', () => {
  it('is 180 days before now', () => {
    const now = new Date('2026-09-06T12:00:00.000Z');
    expect(FEED_LOOKBACK_DAYS).toBe(180);
    expect(feedLookbackSinceIso(now)).toBe('2026-03-10T12:00:00.000Z');
  });
});

describe('fetchPagedRows', () => {
  it('stops after a short page', async () => {
    const fetchPage = vi.fn(async () => ({ data: [{ id: 1 }], error: null }));
    const result = await fetchPagedRows(fetchPage);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: 1 }]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, FEED_PAGE_SIZE - 1);
  });

  it('walks past the 1000-row PostgREST cap', async () => {
    const page1 = Array.from({ length: FEED_PAGE_SIZE }, (_, i) => ({ id: i }));
    const page2 = [{ id: FEED_PAGE_SIZE }];
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null });

    const result = await fetchPagedRows(fetchPage);

    expect(result.data).toHaveLength(FEED_PAGE_SIZE + 1);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, FEED_PAGE_SIZE - 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, FEED_PAGE_SIZE, FEED_PAGE_SIZE * 2 - 1);
  });

  it('returns the error and rows collected so far', async () => {
    const fetchPage = vi.fn(async () => ({ data: null, error: { message: 'boom' } }));
    const result = await fetchPagedRows(fetchPage);
    expect(result.error?.message).toBe('boom');
    expect(result.data).toEqual([]);
  });
});
