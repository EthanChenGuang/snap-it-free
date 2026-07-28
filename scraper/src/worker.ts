import type { SupabaseClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
import {
  CRON_ENABLED,
  SCRAPE_MIN_COUNT_RATIO,
  SCRAPE_MIN_SELECTOR_RATE,
  TRAILING_RUN_WINDOW,
  supabaseAdmin,
} from './config.js';
import { notifyOperator } from './alert/notify.js';
import { persistBatch } from './shared/persist.js';
import { validateBatch } from './shared/validate-run.js';
import { runSubitoCrawler } from './subito/crawler.js';
import { SUBITO_CATEGORY_URLS } from './subito/categories.js';

type ScrapeRunRecord = {
  id: string;
  startedAt: Date;
};

type FinishScrapeRunParams = {
  status: 'success' | 'failed';
  listingsFound: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  rejected?: number;
  failureReason?: string;
  selectorHitRate: number;
};

export async function getTrailingMedians(supabase: SupabaseClient): Promise<number[]> {
  const { data, error } = await supabase
    .from('scrape_runs')
    .select('listings_found')
    .eq('status', 'success')
    .order('started_at', { ascending: false })
    .limit(TRAILING_RUN_WINDOW);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.listings_found as number);
}

export async function startScrapeRun(supabase: SupabaseClient): Promise<ScrapeRunRecord> {
  const startedAt = new Date();
  const { data, error } = await supabase
    .from('scrape_runs')
    .insert({ started_at: startedAt.toISOString(), status: 'partial' })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create scrape run');
  }

  return { id: data.id as string, startedAt };
}

export async function finishScrapeRun(
  supabase: SupabaseClient,
  runId: string,
  params: FinishScrapeRunParams,
): Promise<void> {
  const { error } = await supabase
    .from('scrape_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: params.status,
      listings_found: params.listingsFound,
      listings_inserted: params.inserted ?? 0,
      listings_updated: params.updated ?? 0,
      listings_skipped: params.skipped ?? 0,
      listings_rejected: params.rejected ?? 0,
      failure_reason: params.failureReason ?? null,
      selector_hit_rate: params.selectorHitRate,
    })
    .eq('id', runId);

  if (error) {
    throw error;
  }
}

function parseValidationFailure(reason: string): { failureCode: string; failureDetail: string } {
  if (reason.includes('selector hit rate')) {
    return { failureCode: 'LOW_SELECTOR_RATE', failureDetail: reason };
  }
  if (reason.includes('count')) {
    return { failureCode: 'LOW_COUNT', failureDetail: reason };
  }
  return { failureCode: 'VALIDATION_FAILED', failureDetail: reason };
}

function computeMinCount(trailingMedians: number[]): number {
  const median = trailingMedians.length
    ? trailingMedians.reduce((a, b) => a + b, 0) / trailingMedians.length
    : 50;
  return Math.floor(median * SCRAPE_MIN_COUNT_RATIO);
}

export async function runScrape(supabase: SupabaseClient = supabaseAdmin): Promise<void> {
  const run = await startScrapeRun(supabase);
  console.log(`Scrape run ${run.id} started at ${run.startedAt.toISOString()}`);

  try {
    const trailingMedians = await getTrailingMedians(supabase);
    const minCount = computeMinCount(trailingMedians);
    const medianCount = trailingMedians.length
      ? Math.round(trailingMedians.reduce((a, b) => a + b, 0) / trailingMedians.length)
      : 50;

    console.log(`Crawling ${SUBITO_CATEGORY_URLS.length} category URL(s)`);
    const { rawListings, selectorHitRate } = await runSubitoCrawler([...SUBITO_CATEGORY_URLS]);
    console.log(
      `Extracted ${rawListings.length} listing(s); selector hit rate: ${selectorHitRate.toFixed(2)}`,
    );

    const validation = validateBatch(
      rawListings,
      trailingMedians,
      selectorHitRate,
      SCRAPE_MIN_COUNT_RATIO,
      SCRAPE_MIN_SELECTOR_RATE,
    );

    if (!validation.ok) {
      const { failureCode, failureDetail } = parseValidationFailure(validation.reason);
      await finishScrapeRun(supabase, run.id, {
        status: 'failed',
        listingsFound: rawListings.length,
        failureReason: validation.reason,
        selectorHitRate,
      });

      await notifyOperator({
        runId: run.id,
        startedAt: run.startedAt,
        parsedCount: rawListings.length,
        minCount,
        medianCount,
        selectorPct: Math.round(selectorHitRate * 100),
        failureCode,
        failureDetail,
      });

      console.error(`Validation failed: ${validation.reason}`);
      return;
    }

    const stats = await persistBatch(supabase, rawListings, run.id);
    await finishScrapeRun(supabase, run.id, {
      status: 'success',
      listingsFound: rawListings.length,
      inserted: stats.inserted,
      updated: stats.updated,
      skipped: stats.skipped,
      rejected: stats.rejected,
      selectorHitRate,
    });

    console.log(
      `Run ${run.id} complete: inserted=${stats.inserted} updated=${stats.updated} skipped=${stats.skipped} rejected=${stats.rejected}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishScrapeRun(supabase, run.id, {
      status: 'failed',
      listingsFound: 0,
      failureReason: message,
      selectorHitRate: 0,
    }).catch((finishErr) => {
      console.error('Failed to finish scrape run after error:', finishErr);
    });

    await notifyOperator({
      runId: run.id,
      startedAt: run.startedAt,
      parsedCount: 0,
      minCount: computeMinCount(await getTrailingMedians(supabase).catch(() => [])),
      medianCount: 50,
      selectorPct: 0,
      failureCode: 'WORKER_ERROR',
      failureDetail: message,
    }).catch((notifyErr) => {
      console.error('Failed to send operator alert:', notifyErr);
    });

    throw err;
  }
}

let scrapeInProgress = false;

async function main(): Promise<void> {
  if (CRON_ENABLED) {
    const intervalMs = 90 * 60 * 1000;
    console.log(`Cron enabled — scheduling scrape every ${intervalMs / 60_000} minutes`);

    const tick = async () => {
      if (scrapeInProgress) {
        console.log('Previous scrape still in progress — skipping this tick');
        return;
      }
      scrapeInProgress = true;
      try {
        await runScrape();
      } catch (err) {
        console.error(err);
      } finally {
        scrapeInProgress = false;
      }
    };

    await tick();
    setInterval(tick, intervalMs);
    return;
  }

  await runScrape();
}

const isMain =
  process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
