import type { SupabaseClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
import {
  CRON_ENABLED,
  isHttpCrawlerEnabled,
  SCRAPE_MIN_COUNT_RATIO,
  SCRAPE_MIN_GEO_RESOLUTION_RATE,
  SCRAPE_MIN_SELECTOR_RATE,
  TRAILING_RUN_WINDOW,
  supabaseAdmin,
} from './config.js';
import { notifyOperator } from './alert/notify.js';
import {
  loadJobCrawlMode,
  loadSourceConfig,
  recordDegradedRun,
  updateLastFullRefreshAt,
  updateNextRunAt,
} from './config-loader.js';
import { persistBatch } from './shared/persist.js';
import { validateBatch, validateBatchHttp } from './shared/validate-run.js';
import { loadZonePolygons, tagZone } from './shared/zone-tag.js';
import { runSchedulerTick, TICK_INTERVAL_MS } from './scheduler.js';
import { runSubitoCrawler, type CategoryUrlStats } from './subito/crawler.js';
import { loadKnownListingSet } from './subito/known-set.js';
import { resolveSourceRun } from './worker-placeholder.js';
import {
  decideCrawlMode,
  evaluateProxyGate,
  isProductionSoftProxyContext,
  type CrawlMode,
} from './worker-proxy-gate.js';
import { runSubitoCrawlWithProxyFallback } from './worker-proxy-fallback.js';

const COMING_SOON_MESSAGE = '该数据源尚未接入';

type ScrapeRunOptions = {
  trigger?: 'cron' | 'manual';
  jobId?: string;
};

type ScrapeRunRecord = {
  id: string;
  startedAt: Date;
};

type StartScrapeRunParams = {
  triggerType?: 'cron' | 'manual';
  jobId?: string;
  targetUrlsSnapshot?: string[];
};

type FinishScrapeRunParams = {
  status: 'success' | 'failed' | 'partial';
  listingsFound: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  rejected?: number;
  failureReason?: string;
  selectorHitRate: number;
  listingsSkippedAtCrawl?: number;
  httpRequests?: number;
  wallTimeSeconds?: number;
  crawlMode?: CrawlMode;
  degraded?: boolean;
  jsonFieldCompleteness?: number;
  blockedUrlCount?: number;
  urlBreakdown?: CategoryUrlStats[];
};

export function categoryUrlLabel(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const regaloIdx = parts.indexOf('regalo');
    if (regaloIdx >= 0 && parts[regaloIdx + 1]) {
      return parts[regaloIdx + 1].replace(/-/g, ' ');
    }
    return parts[parts.length - 3] ?? parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}

function serializeUrlBreakdown(breakdown: CategoryUrlStats[] | undefined) {
  if (!breakdown?.length) {
    return null;
  }
  return breakdown.map((entry) => ({
    url: entry.url,
    label: categoryUrlLabel(entry.url),
    listingsFound: entry.listingsFound,
    listingsSkippedAtCrawl: entry.listingsSkippedAtCrawl,
    blocked: entry.blocked,
    earlyStopTriggered: entry.earlyStopTriggered,
  }));
}

async function updateScrapeJob(
  supabase: SupabaseClient,
  jobId: string,
  status: 'running' | 'completed' | 'failed' | 'skipped',
  message?: string,
): Promise<void> {
  const patch: Record<string, string | null> = { status, message: message ?? null };
  if (status === 'running') {
    patch.started_at = new Date().toISOString();
  } else {
    patch.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from('scrape_jobs').update(patch).eq('id', jobId);
  if (error) {
    throw error;
  }
}

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

export async function startScrapeRun(
  supabase: SupabaseClient,
  source: string,
  params?: StartScrapeRunParams,
): Promise<ScrapeRunRecord> {
  const startedAt = new Date();
  const { data, error } = await supabase
    .from('scrape_runs')
    .insert({
      started_at: startedAt.toISOString(),
      status: 'partial',
      source,
      trigger_type: params?.triggerType ?? null,
      job_id: params?.jobId ?? null,
      target_urls_snapshot: params?.targetUrlsSnapshot ?? null,
    })
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
      listings_skipped_at_crawl: params.listingsSkippedAtCrawl ?? 0,
      http_requests: params.httpRequests ?? null,
      wall_time_seconds:
        params.wallTimeSeconds != null ? Number(params.wallTimeSeconds.toFixed(2)) : null,
      crawl_mode: params.crawlMode ?? null,
      degraded: params.degraded ?? false,
      json_field_completeness: params.jsonFieldCompleteness ?? null,
      blocked_url_count: params.blockedUrlCount ?? 0,
      url_breakdown: serializeUrlBreakdown(params.urlBreakdown),
    })
    .eq('id', runId);

  if (error) {
    throw error;
  }
}

function parseValidationFailure(reason: string): { failureCode: string; failureDetail: string } {
  if (reason.includes('geo resolution rate')) {
    return { failureCode: 'LOW_GEO_RESOLUTION', failureDetail: reason };
  }
  if (reason.includes('json field completeness')) {
    return { failureCode: 'LOW_JSON_COMPLETENESS', failureDetail: reason };
  }
  if (reason.includes('selector hit rate')) {
    return { failureCode: 'LOW_SELECTOR_RATE', failureDetail: reason };
  }
  if (reason.includes('count')) {
    return { failureCode: 'LOW_COUNT', failureDetail: reason };
  }
  return { failureCode: 'VALIDATION_FAILED', failureDetail: reason };
}

function computeMinCount(trailingMedians: number[], ratio = SCRAPE_MIN_COUNT_RATIO): number {
  const median = trailingMedians.length
    ? trailingMedians.reduce((a, b) => a + b, 0) / trailingMedians.length
    : 50;
  return Math.floor(median * ratio);
}

function logPersistBreakdown(stats: {
  inserted: number;
  updated: number;
  skipped: number;
  rejected: number;
}): void {
  console.log(
    JSON.stringify({
      event: 'persist_breakdown',
      persist_skipped: stats.skipped,
      inserted: stats.inserted,
      updated: stats.updated,
      rejected: stats.rejected,
    }),
  );
}

/** DB-driven scrape for one source slug (D-18, D-32). */
export async function runSourceScrape(
  supabase: SupabaseClient,
  sourceSlug: string,
  options: ScrapeRunOptions = {},
): Promise<void> {
  const { trigger = 'cron', jobId } = options;

  if (jobId) {
    await updateScrapeJob(supabase, jobId, 'running');
  }

  const config = await loadSourceConfig(supabase, sourceSlug);
  if (!config) {
    throw new Error(`Unknown source: ${sourceSlug}`);
  }

  const decision = resolveSourceRun(
    {
      implementation_status: config.implementationStatus,
      enabled: config.enabled,
    },
    { manual: trigger === 'manual' },
  );

  if (decision.action === 'skipped') {
    const message =
      config.implementationStatus === 'coming_soon' ? COMING_SOON_MESSAGE : decision.message;
    console.log(`Skipping ${sourceSlug}: ${message}`);

    const run = await startScrapeRun(supabase, sourceSlug, {
      triggerType: trigger,
      jobId,
      targetUrlsSnapshot: config.urls,
    });
    await finishScrapeRun(supabase, run.id, {
      status: 'partial',
      listingsFound: 0,
      failureReason: message,
      selectorHitRate: 0,
    });

    if (jobId) {
      await updateScrapeJob(supabase, jobId, 'skipped', message);
    }
    return;
  }

  if (config.globalPause && trigger !== 'manual') {
    console.log(`Global pause active — skipping scheduled ${sourceSlug}`);
    if (jobId) {
      await updateScrapeJob(supabase, jobId, 'skipped', 'Global pause active');
    }
    return;
  }

  if (config.globalPause && trigger === 'manual') {
    console.log(`Global pause active — running manual override for ${sourceSlug}`);
  }

  if (!config.enabled && trigger === 'manual') {
    console.log(`Source ${sourceSlug} disabled — running manual override`);
  }

  const jobCrawlMode = jobId ? await loadJobCrawlMode(supabase, jobId) : null;
  const crawlMode = decideCrawlMode({
    lastFullRefreshAt: config.lastFullRefreshAt,
    fullRefreshHours: config.fullRefreshHours,
    jobCrawlMode,
  });
  const isFullRefresh = crawlMode === 'full';

  const proxyGate = evaluateProxyGate({
    isProduction: isProductionSoftProxyContext(),
    proxyUrl: config.proxyUrl,
  });
  if (proxyGate.warning) {
    console.warn(proxyGate.warning);
  }
  const runDegraded = proxyGate.degraded;

  const run = await startScrapeRun(supabase, sourceSlug, {
    triggerType: trigger,
    jobId,
    targetUrlsSnapshot: config.urls,
  });
  console.log(
    `Scrape run ${run.id} (${sourceSlug}) started at ${run.startedAt.toISOString()} mode=${crawlMode} degraded=${runDegraded}`,
  );

  try {
    const trailingMedians = await getTrailingMedians(supabase);
    const minCount = computeMinCount(trailingMedians);
    const medianCount = trailingMedians.length
      ? Math.round(trailingMedians.reduce((a, b) => a + b, 0) / trailingMedians.length)
      : 50;

    const knownMap =
      sourceSlug === 'subito' ? await loadKnownListingSet(supabase, sourceSlug) : new Map();

    console.log(`Crawling ${config.urls.length} URL(s) for ${sourceSlug} (mode=${crawlMode})`);
    const crawlStartedAt = Date.now();
    let crawlResult;
    let fallbackDegraded = false;

    if (sourceSlug === 'subito') {
      const fallbackResult = await runSubitoCrawlWithProxyFallback(
        runSubitoCrawler,
        config.urls,
        config.preset,
        config.proxyUrl,
        {
          knownMap,
          earlyStopK: config.earlyStopK,
          isFullRefresh,
          mode: crawlMode,
        },
      );
      crawlResult = fallbackResult.crawlResult;
      fallbackDegraded = fallbackResult.fallbackDegraded;
    } else {
      throw new Error(`No crawler implementation for source: ${sourceSlug}`);
    }

    const wallTimeSeconds = (Date.now() - crawlStartedAt) / 1000;
    const {
      rawListings,
      selectorHitRate,
      httpRequests,
      listingsSkippedAtCrawl,
      jsonFieldCompleteness,
      blockedUrlCount,
      urlBreakdown,
    } = crawlResult;

    console.log(
      JSON.stringify({
        event: 'crawl_complete',
        crawl_mode: crawlMode,
        listings_found: rawListings.length,
        crawl_skipped: listingsSkippedAtCrawl,
        http_requests: httpRequests,
        json_field_completeness: jsonFieldCompleteness,
        blocked_url_count: blockedUrlCount,
        wall_time_seconds: Number(wallTimeSeconds.toFixed(2)),
      }),
    );

    const totalUrls = config.urls.length;
    const blockedRatio = totalUrls > 0 ? blockedUrlCount / totalUrls : 0;
    if (blockedRatio > 0.5) {
      const blockReason = `${blockedUrlCount}/${totalUrls} category URLs blocked`;
      await recordDegradedRun(supabase, blockReason).catch((err) => {
        console.error('Failed to record degraded run:', err);
      });

      await notifyOperator(
        supabase,
        {
          runId: run.id,
          startedAt: run.startedAt,
          parsedCount: rawListings.length,
          minCount,
          medianCount,
          selectorPct: Math.round(jsonFieldCompleteness * 100),
          failureCode: 'HIGH_BLOCK_RATE',
          failureDetail: blockReason,
        },
        { emailOnly: true },
      ).catch((notifyErr) => {
        console.error('Failed to send blocked-ratio alert:', notifyErr);
      });
    }

    const zones = loadZonePolygons();
    const withCoords = rawListings.filter((l) => l.lat != null && l.lng != null);
    const withZone = withCoords.filter(
      (l) => l.lat != null && l.lng != null && tagZone(l.lat, l.lng, zones) != null,
    );
    const geoResolutionRate = rawListings.length === 0 ? 0 : withCoords.length / rawListings.length;
    const zoneRate = rawListings.length === 0 ? 0 : withZone.length / rawListings.length;

    console.log(
      `Extracted ${rawListings.length} listing(s); selector hit rate: ${selectorHitRate.toFixed(2)}; ` +
        `geo resolution rate: ${geoResolutionRate.toFixed(2)}; zone rate: ${zoneRate.toFixed(2)}`,
    );

    const useHttpValidation = isHttpCrawlerEnabled();
    const validation = useHttpValidation
      ? validateBatchHttp({
          listings: rawListings,
          trailingMedians,
          jsonFieldCompleteness,
          crawlMode,
          listingsSkippedAtCrawl,
        })
      : validateBatch(
          rawListings,
          trailingMedians,
          selectorHitRate,
          SCRAPE_MIN_COUNT_RATIO,
          SCRAPE_MIN_SELECTOR_RATE,
          geoResolutionRate,
          SCRAPE_MIN_GEO_RESOLUTION_RATE,
        );

    const finishBase = {
      listingsFound: rawListings.length,
      selectorHitRate,
      listingsSkippedAtCrawl,
      httpRequests,
      wallTimeSeconds,
      crawlMode,
      degraded: runDegraded || fallbackDegraded || blockedRatio > 0.5,
      jsonFieldCompleteness,
      blockedUrlCount,
      urlBreakdown,
    };

    if (!validation.ok) {
      const { failureCode, failureDetail } = parseValidationFailure(validation.reason);
      await finishScrapeRun(supabase, run.id, {
        ...finishBase,
        status: 'failed',
        failureReason: validation.reason,
      });

      await notifyOperator(supabase, {
        runId: run.id,
        startedAt: run.startedAt,
        parsedCount: rawListings.length,
        minCount,
        medianCount,
        selectorPct: useHttpValidation
          ? Math.round(jsonFieldCompleteness * 100)
          : Math.round(selectorHitRate * 100),
        failureCode,
        failureDetail,
      });

      console.error(`Validation failed: ${validation.reason}`);
      if (jobId) {
        await updateScrapeJob(supabase, jobId, 'failed', validation.reason);
      }
      return;
    }

    const stats = await persistBatch(supabase, rawListings, run.id);
    logPersistBreakdown(stats);

    await finishScrapeRun(supabase, run.id, {
      ...finishBase,
      status: 'success',
      inserted: stats.inserted,
      updated: stats.updated,
      skipped: stats.skipped,
      rejected: stats.rejected,
    });

    if (isFullRefresh) {
      await updateLastFullRefreshAt(supabase);
    }

    if (runDegraded) {
      await recordDegradedRun(supabase, 'Production run without proxy').catch((err) => {
        console.error('Failed to record proxy degraded run:', err);
      });
    }

    if (jobId) {
      await updateScrapeJob(supabase, jobId, 'completed');
    }

    if (trigger === 'cron') {
      await updateNextRunAt(supabase, sourceSlug, config.intervalMinutes);
    }

    console.log(
      `Run ${run.id} complete: inserted=${stats.inserted} updated=${stats.updated} skipped=${stats.skipped} rejected=${stats.rejected} crawl_skipped=${listingsSkippedAtCrawl}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishScrapeRun(supabase, run.id, {
      status: 'failed',
      listingsFound: 0,
      failureReason: message,
      selectorHitRate: 0,
      crawlMode,
      degraded: runDegraded,
    }).catch((finishErr) => {
      console.error('Failed to finish scrape run after error:', finishErr);
    });

    await notifyOperator(supabase, {
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

    if (jobId) {
      await updateScrapeJob(supabase, jobId, 'failed', message).catch((jobErr) => {
        console.error('Failed to update scrape job after error:', jobErr);
      });
    }

    throw err;
  }
}

/** @deprecated Use runSourceScrape(supabase, 'subito') — kept for backward compatibility. */
export async function runScrape(supabase: SupabaseClient = supabaseAdmin): Promise<void> {
  return runSourceScrape(supabase, 'subito');
}

const scrapeInProgressBySource = new Set<string>();

async function guardedRunSourceScrape(
  supabase: SupabaseClient,
  sourceSlug: string,
  options: { trigger: 'cron' | 'manual'; jobId?: string },
): Promise<void> {
  if (scrapeInProgressBySource.has(sourceSlug)) {
    console.log(`Previous scrape still in progress for ${sourceSlug} — skipping`);
    return;
  }

  scrapeInProgressBySource.add(sourceSlug);
  try {
    await runSourceScrape(supabase, sourceSlug, options);
  } finally {
    scrapeInProgressBySource.delete(sourceSlug);
  }
}

type WorkerCliArgs = {
  source: string;
  once: boolean;
};

function parseWorkerArgs(argv: string[]): WorkerCliArgs {
  let source = 'subito';
  let once = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source' && argv[i + 1]) {
      source = argv[++i]!;
      continue;
    }
    if (arg === '--once') {
      once = true;
    }
  }

  return { source, once };
}

async function main(): Promise<void> {
  const { source, once } = parseWorkerArgs(process.argv.slice(2));

  if (once || !CRON_ENABLED) {
    await runSourceScrape(supabaseAdmin, source);
    return;
  }

  console.log(
    `Scheduler enabled — ticking every ${TICK_INTERVAL_MS / 1000}s (D-13, D-33)`,
  );

  const tick = () => runSchedulerTick(supabaseAdmin, guardedRunSourceScrape);

  await tick();
  setInterval(tick, TICK_INTERVAL_MS);
}

const isMain =
  process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
