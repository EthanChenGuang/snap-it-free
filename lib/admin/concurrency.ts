/** Shared worker-pool helper — same pattern as scraper translate ingest. */
export async function runWithConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let cursor = 0;
  const runnerCount = Math.min(Math.max(1, limit), items.length);

  async function runner(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: runnerCount }, () => runner()));
}

/** Admin manual retry — keep provider load predictable (matches scraper ingest default). */
export const ADMIN_TRANSLATION_RETRY_CONCURRENCY = 4;
