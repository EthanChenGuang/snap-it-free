export const STAGGER_MINUTES = 7;

export type ScraperSourceRow = {
  slug: string;
  enabled: boolean;
  next_run_at: string | null;
};

export type ScrapeJobRow = {
  id: string;
  source_slug: string;
  status: string;
};

export function pickDueSources(
  sources: ScraperSourceRow[],
  now: Date,
  globalPause: boolean,
): ScraperSourceRow[] {
  if (globalPause) {
    return [];
  }

  const nowMs = now.getTime();
  return sources.filter(
    (source) =>
      source.enabled &&
      source.next_run_at != null &&
      new Date(source.next_run_at).getTime() <= nowMs,
  );
}

export function dequeuePendingJobs(jobs: ScrapeJobRow[]): ScrapeJobRow[] {
  return jobs.filter((job) => job.status === 'pending');
}

/** Stagger delay in ms for concurrent due sources (D-13, D-15, D-33) */
export function staggerDelayMs(index: number, staggerMinutes = STAGGER_MINUTES): number {
  return index * staggerMinutes * 60_000;
}
