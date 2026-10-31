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

type PageFetcher<T> = (
  from: number,
  to: number,
) => Promise<{ data: T[] | null; error: { message: string } | null }>;

/**
 * Same result as `fetchPagedRows`, but after the first page (fetched alongside the row count) the remaining
 * pages are requested concurrently instead of one after another — ~2 round trips instead of ~14 for the
 * full feed. Rows keep page order and are de-duplicated by id (inserts between page reads can shift rows).
 * If more rows exist than the count promised, it falls back to sequential paging for the tail.
 */
export async function fetchPagedRowsParallel<T extends { id: string }>(
  fetchPage: PageFetcher<T>,
  countRows: () => Promise<number | null>,
  concurrency = 6,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const [first, count] = await Promise.all([fetchPage(0, FEED_PAGE_SIZE - 1), countRows().catch(() => null)]);
  if (first.error) return { data: [], error: first.error };
  const firstRows = first.data ?? [];
  if (firstRows.length < FEED_PAGE_SIZE) return { data: firstRows, error: null };
  if (count === null) {
    const rest = await fetchPagedRows<T>((from, to) => fetchPage(from + FEED_PAGE_SIZE, to + FEED_PAGE_SIZE));
    return { data: dedupeById([...firstRows, ...rest.data]), error: rest.error };
  }

  const pageCount = Math.ceil(count / FEED_PAGE_SIZE);
  const pages: T[][] = [firstRows];
  let next = 1;
  let error: { message: string } | null = null;
  const worker = async () => {
    while (next < pageCount && !error) {
      const page = next++;
      const result = await fetchPage(page * FEED_PAGE_SIZE, (page + 1) * FEED_PAGE_SIZE - 1);
      if (result.error) error = result.error;
      else pages[page] = result.data ?? [];
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(0, pageCount - 1)) }, worker));
  if (error) return { data: dedupeById(pages.flat()), error };

  let rows = pages.flat();
  const last = pages[pageCount - 1] ?? [];
  if (pageCount > 1 && last.length === FEED_PAGE_SIZE) {
    const tail = await fetchPagedRows<T>((from, to) =>
      fetchPage(from + pageCount * FEED_PAGE_SIZE, to + pageCount * FEED_PAGE_SIZE),
    );
    rows = rows.concat(tail.data);
    if (tail.error) return { data: dedupeById(rows), error: tail.error };
  }
  return { data: dedupeById(rows), error: null };
}

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)));
}
