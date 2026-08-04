import type { SupabaseClient } from '@supabase/supabase-js';

export const STAGGER_MINUTES = 7;
export const TICK_INTERVAL_MS = 60_000;

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

export type RunQueueItem = {
  sourceSlug: string;
  trigger: 'cron' | 'manual';
  jobId?: string;
};

export type RunSourceScrapeFn = (
  supabase: SupabaseClient,
  sourceSlug: string,
  options: { trigger: 'cron' | 'manual'; jobId?: string },
) => Promise<void>;

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
      (source.next_run_at == null ||
        new Date(source.next_run_at).getTime() <= nowMs),
  );
}

export function dequeuePendingJobs(jobs: ScrapeJobRow[]): ScrapeJobRow[] {
  return jobs.filter((job) => job.status === 'pending');
}

/** Merge manual jobs (FIFO) with due cron sources; dedupe by source_slug (D-33). */
export function mergeRunQueue(
  dueSources: ScraperSourceRow[],
  pendingJobs: ScrapeJobRow[],
): RunQueueItem[] {
  const seen = new Set<string>();
  const queue: RunQueueItem[] = [];

  for (const job of pendingJobs) {
    if (!seen.has(job.source_slug)) {
      seen.add(job.source_slug);
      queue.push({
        sourceSlug: job.source_slug,
        trigger: 'manual',
        jobId: job.id,
      });
    }
  }

  for (const source of dueSources) {
    if (!seen.has(source.slug)) {
      seen.add(source.slug);
      queue.push({ sourceSlug: source.slug, trigger: 'cron' });
    }
  }

  return queue;
}

/** Stagger delay in ms for concurrent due sources (D-13, D-15, D-33) */
export function staggerDelayMs(index: number, staggerMinutes = STAGGER_MINUTES): number {
  return index * staggerMinutes * 60_000;
}

export async function runSchedulerTick(
  supabase: SupabaseClient,
  runSourceScrape: RunSourceScrapeFn,
): Promise<void> {
  const { data: globalConfig, error: globalError } = await supabase
    .from('scraper_global_config')
    .select('global_pause')
    .eq('id', 1)
    .maybeSingle();

  if (globalError) {
    throw globalError;
  }

  if (globalConfig?.global_pause) {
    console.log('[scheduler] Global pause active — skipping tick');
    return;
  }

  const now = new Date();

  const [sourcesResult, jobsResult] = await Promise.all([
    supabase.from('scraper_sources').select('slug, enabled, next_run_at').eq('enabled', true),
    supabase
      .from('scrape_jobs')
      .select('id, source_slug, status')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true }),
  ]);

  if (sourcesResult.error) {
    throw sourcesResult.error;
  }
  if (jobsResult.error) {
    throw jobsResult.error;
  }

  const dueSources = pickDueSources(sourcesResult.data ?? [], now, false);
  const pendingJobs = dequeuePendingJobs(jobsResult.data ?? []);
  const queue = mergeRunQueue(dueSources, pendingJobs);

  if (queue.length === 0) {
    return;
  }

  console.log(
    `[scheduler] Enqueuing ${queue.length} scrape(s): ${queue.map((q) => q.sourceSlug).join(', ')}`,
  );

  for (const [index, item] of queue.entries()) {
    const delayMs = staggerDelayMs(index);
    setTimeout(() => {
      void runSourceScrape(supabase, item.sourceSlug, {
        trigger: item.trigger,
        jobId: item.jobId,
      }).catch((err) => {
        console.error(`[scheduler] Scrape failed for ${item.sourceSlug}:`, err);
      });
    }, delayMs);
  }
}
