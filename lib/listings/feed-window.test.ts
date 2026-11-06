import { describe, expect, it, vi } from 'vitest';
import { FEED_LOOKBACK_DAYS, FEED_PAGE_SIZE, fetchPagedRows, feedLookbackSinceIso, fetchPagedRowsParallel } from './feed-window';

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

describe('fetchPagedRowsParallel', () => {
  const rows = (start: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${start + i}` }));
  const table = (total: number) => rows(0, total);

  function source(total: number) {
    const data = table(total);
    const calls: Array<[number, number]> = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchPage = async (from: number, to: number) => {
      calls.push([from, to]);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return { data: data.slice(from, to + 1), error: null };
    };
    return { fetchPage, calls, data, max: () => maxInFlight };
  }

  it('returns everything in order, fetching later pages concurrently', async () => {
    const src = source(FEED_PAGE_SIZE * 4 + 17);
    const result = await fetchPagedRowsParallel(src.fetchPage, async () => src.data.length);
    expect(result.error).toBeNull();
    expect(result.data.map((row) => row.id)).toEqual(src.data.map((row) => row.id));
    expect(src.calls).toHaveLength(5);
    expect(src.max()).toBeGreaterThan(1);
  });

  it('stops after one request when the first page is short', async () => {
    const src = source(12);
    const result = await fetchPagedRowsParallel(src.fetchPage, async () => 12);
    expect(result.data).toHaveLength(12);
    expect(src.calls).toHaveLength(1);
  });

  it('still reads rows beyond a stale count and without a count', async () => {
    const src = source(FEED_PAGE_SIZE * 3);
    const stale = await fetchPagedRowsParallel(src.fetchPage, async () => FEED_PAGE_SIZE * 2);
    expect(stale.data).toHaveLength(FEED_PAGE_SIZE * 3);
    const noCount = await fetchPagedRowsParallel(src.fetchPage, async () => null);
    expect(noCount.data).toHaveLength(FEED_PAGE_SIZE * 3);
  });

  it('drops duplicates when rows shift between page reads', async () => {
    const fetchPage = async (from: number, to: number) => ({
      data: from === 0 ? rows(0, FEED_PAGE_SIZE) : rows(from - 1, to - from + 1).slice(0, 3),
      error: null,
    });
    const result = await fetchPagedRowsParallel(fetchPage, async () => FEED_PAGE_SIZE + 2);
    expect(new Set(result.data.map((row) => row.id)).size).toBe(result.data.length);
  });
});
