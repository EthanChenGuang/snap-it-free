import type { SupabaseClient } from '@supabase/supabase-js';

export const ORPHAN_RUN_FAILURE_REASON =
  'Worker exited without finishing (orphaned run)';

/** Minimum orphan threshold — small runs (e.g. 2 cities) still get at least this long. */
export const DEFAULT_ORPHAN_RUN_TIMEOUT_MINUTES = 15;

/** Per category URL budget when estimating max crawl duration (Playwright fallback is serial). */
export const ORPHAN_RUN_SECONDS_PER_URL = 45;

/** Hard cap so reconciliation never waits unbounded on misconfigured URL lists. */
export const ORPHAN_RUN_MAX_TIMEOUT_MINUTES = 180;

export function getOrphanRunTimeoutMinutes(): number {
  const parsed = Number.parseInt(process.env.ORPHAN_RUN_TIMEOUT_MINUTES ?? '', 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_ORPHAN_RUN_TIMEOUT_MINUTES;
}

export function getOrphanRunTimeoutMs(
  timeoutMinutes: number = getOrphanRunTimeoutMinutes(),
): number {
  return timeoutMinutes * 60_000;
}

/** Scale orphan timeout with configured category URL count (9 cities × 17 cats ≈ 153 URLs). */
export function estimateOrphanTimeoutMs(
  urlCount: number,
  floorMinutes: number = getOrphanRunTimeoutMinutes(),
): number {
  const floorMs = floorMinutes * 60_000;
  const scaledMs = Math.max(0, urlCount) * ORPHAN_RUN_SECONDS_PER_URL * 1000;
  const maxMs = ORPHAN_RUN_MAX_TIMEOUT_MINUTES * 60_000;
  return Math.min(Math.max(floorMs, scaledMs), maxMs);
}

export function orphanRunCutoffIso(now: Date, timeoutMs: number): string {
  return new Date(now.getTime() - timeoutMs).toISOString();
}

type RunningRunInput = {
  finishedAt: string | null;
  startedAt: string;
};

export function isStaleRunningRun(
  run: RunningRunInput,
  now: Date = new Date(),
  timeoutMs: number = getOrphanRunTimeoutMs(),
): boolean {
  if (run.finishedAt) {
    return false;
  }
  return new Date(run.startedAt).getTime() <= now.getTime() - timeoutMs;
}

function targetUrlCount(snapshot: unknown): number {
  return Array.isArray(snapshot) ? snapshot.length : 0;
}

export async function reconcileOrphanScrapeRuns(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<number> {
  const finishedAt = now.toISOString();

  const { data: inProgress, error: selectError } = await supabase
    .from('scrape_runs')
    .select('id, job_id, started_at, target_urls_snapshot')
    .is('finished_at', null);

  if (selectError) {
    throw new Error(`orphan scrape_runs select failed: ${selectError.message}`);
  }

  const orphans =
    inProgress?.filter((run) =>
      isStaleRunningRun(
        { finishedAt: null, startedAt: run.started_at as string },
        now,
        estimateOrphanTimeoutMs(targetUrlCount(run.target_urls_snapshot)),
      ),
    ) ?? [];

  if (!orphans.length) {
    return 0;
  }

  for (const orphan of orphans) {
    const startedMs = new Date(orphan.started_at as string).getTime();
    const wallTimeSeconds = Number(((now.getTime() - startedMs) / 1000).toFixed(2));

    const { error: runError } = await supabase
      .from('scrape_runs')
      .update({
        finished_at: finishedAt,
        status: 'failed',
        failure_reason: ORPHAN_RUN_FAILURE_REASON,
        wall_time_seconds: wallTimeSeconds,
        http_requests: 0,
      })
      .eq('id', orphan.id)
      .is('finished_at', null);

    if (runError) {
      throw new Error(`orphan scrape_runs update failed: ${runError.message}`);
    }

    if (orphan.job_id) {
      await supabase
        .from('scrape_jobs')
        .update({
          status: 'failed',
          message: ORPHAN_RUN_FAILURE_REASON,
          completed_at: finishedAt,
        })
        .eq('id', orphan.job_id)
        .eq('status', 'running');
    }
  }

  const longestCutoff = orphanRunCutoffIso(
    now,
    estimateOrphanTimeoutMs(
      Math.max(...orphans.map((run) => targetUrlCount(run.target_urls_snapshot)), 0),
    ),
  );

  await supabase
    .from('scrape_jobs')
    .update({
      status: 'failed',
      message: ORPHAN_RUN_FAILURE_REASON,
      completed_at: finishedAt,
    })
    .eq('status', 'running')
    .lt('started_at', longestCutoff);

  return orphans.length;
}
