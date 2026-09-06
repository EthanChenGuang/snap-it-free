import { SCRAPED_LISTING_TTL_DAYS } from './scraped-listing-ttl';

/** Feed shows listings posted within this window (matches scraped TTL). */
export const FEED_LOOKBACK_DAYS = SCRAPED_LISTING_TTL_DAYS;

/** PostgREST default max-rows — page through so the 6-month feed is complete. */
export const FEED_PAGE_SIZE = 1000;

export function feedLookbackSinceIso(now = new Date()): string {
  return new Date(now.getTime() - FEED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export async function fetchPagedRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + FEED_PAGE_SIZE - 1);
    if (error) {
      return { data: all, error };
    }

    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < FEED_PAGE_SIZE) {
      return { data: all, error: null };
    }
    from += FEED_PAGE_SIZE;
  }
}
