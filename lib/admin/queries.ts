import { createClient } from '@/lib/supabase/server';
import type {
  AdminAlert,
  FooterStats,
  GlobalAdminStatus,
  ScrapeRejectItem,
  ScrapeRunDetail,
  ScrapeRunListItem,
  ScrapeRunStatus,
  SourceDetail,
  SourceWithLastRun,
} from '@/lib/admin/types';

type ScrapeRunRow = {
  id: string;
  source: string;
  status: ScrapeRunStatus;
  started_at: string;
  finished_at: string | null;
  listings_found: number;
  failure_reason: string | null;
};

function mapLastRun(row: ScrapeRunRow) {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    listingsFound: row.listings_found,
    failureReason: row.failure_reason,
  };
}

export async function getSourcesWithLastRun(): Promise<SourceWithLastRun[]> {
  try {
    const supabase = await createClient();

    const { data: sources, error: sourcesError } = await supabase
      .from('scraper_sources')
      .select(
        'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset',
      )
      .order('slug');

    if (sourcesError) {
      return [];
    }

    const { data: runs, error: runsError } = await supabase
      .from('scrape_runs')
      .select('id, source, status, started_at, finished_at, listings_found, failure_reason')
      .order('started_at', { ascending: false })
      .limit(200);

    if (runsError) {
      return [];
    }

    const latestBySource = new Map<string, ScrapeRunRow>();
    for (const run of (runs ?? []) as ScrapeRunRow[]) {
      if (!latestBySource.has(run.source)) {
        latestBySource.set(run.source, run);
      }
    }

    return (sources ?? []).map((source) => ({
      slug: source.slug as string,
      displayName: source.display_name as string,
      implementationStatus: source.implementation_status as 'live' | 'coming_soon',
      enabled: Boolean(source.enabled),
      intervalMinutes: source.interval_minutes as number,
      antiBlockPreset: source.anti_block_preset as string,
      lastRun: latestBySource.has(source.slug)
        ? mapLastRun(latestBySource.get(source.slug)!)
        : null,
    }));
  } catch {
    return [];
  }
}

export async function getSourceBySlug(slug: string): Promise<SourceDetail | null> {
  try {
    const supabase = await createClient();

    const { data: source, error: sourceError } = await supabase
      .from('scraper_sources')
      .select(
        'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset, target_urls',
      )
      .eq('slug', slug)
      .maybeSingle();

    if (sourceError || !source) {
      return null;
    }

    const { data: runs, error: runsError } = await supabase
      .from('scrape_runs')
      .select('id, source, status, started_at, finished_at, listings_found, failure_reason')
      .eq('source', slug)
      .order('started_at', { ascending: false })
      .limit(1);

    if (runsError) {
      return null;
    }

    const lastRunRow = (runs?.[0] ?? null) as ScrapeRunRow | null;

    return {
      slug: source.slug as string,
      displayName: source.display_name as string,
      implementationStatus: source.implementation_status as 'live' | 'coming_soon',
      enabled: Boolean(source.enabled),
      intervalMinutes: source.interval_minutes as number,
      antiBlockPreset: source.anti_block_preset as string,
      targetUrls: (source.target_urls as string[] | null) ?? [],
      lastRun: lastRunRow ? mapLastRun(lastRunRow) : null,
    };
  } catch {
    return null;
  }
}

export async function getRecentAlerts(limit = 5): Promise<AdminAlert[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('scrape_runs')
      .select('id, source, status, started_at, failure_reason')
      .in('status', ['failed', 'partial'])
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      source: row.source as string,
      message: (row.failure_reason as string | null) ?? '运行未完成',
      timestamp: row.started_at as string,
      status: row.status as 'failed' | 'partial',
    }));
  } catch {
    return [];
  }
}

export async function getGlobalAdminStatus(): Promise<GlobalAdminStatus | null> {
  try {
    const supabase = await createClient();

    const [{ data: globalConfig, error: globalError }, { data: latestRun, error: runError }] =
      await Promise.all([
        supabase.from('scraper_global_config').select('global_pause').eq('id', 1).maybeSingle(),
        supabase
          .from('scrape_runs')
          .select('finished_at, started_at')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (globalError || runError) {
      return null;
    }

    const lastSyncAt =
      (latestRun?.finished_at as string | null) ??
      (latestRun?.started_at as string | null) ??
      null;

    return {
      globalPause: Boolean(globalConfig?.global_pause),
      lastSyncAt,
    };
  } catch {
    return null;
  }
}

export async function getPendingTranslationCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('translation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getFooterStats(): Promise<FooterStats> {
  const empty = { inserted24h: 0, failedRuns7d: 0, avgSelectorRate: null };

  try {
    const supabase = await createClient();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: inserted24h, error: listingsError },
      { count: failedRuns7d, error: failedError },
      { data: rateRows, error: rateError },
    ] = await Promise.all([
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since24h),
      supabase
        .from('scrape_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('started_at', since7d),
      supabase
        .from('scrape_runs')
        .select('selector_hit_rate')
        .gte('started_at', since7d)
        .not('selector_hit_rate', 'is', null),
    ]);

    if (listingsError || failedError || rateError) {
      return empty;
    }

    const rates = (rateRows ?? [])
      .map((row) => Number(row.selector_hit_rate))
      .filter((value) => Number.isFinite(value));

    const avgSelectorRate =
      rates.length > 0 ? rates.reduce((sum, value) => sum + value, 0) / rates.length : null;

    return {
      inserted24h: inserted24h ?? 0,
      failedRuns7d: failedRuns7d ?? 0,
      avgSelectorRate,
    };
  } catch {
    return empty;
  }
}

type ScrapeRunListRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  source: string;
  status: ScrapeRunStatus;
  listings_found: number;
  listings_inserted: number;
  listings_rejected: number;
  selector_hit_rate: number | null;
};

function mapScrapeRunListItem(row: ScrapeRunListRow): ScrapeRunListItem {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    source: row.source,
    status: row.status,
    listingsFound: row.listings_found,
    listingsInserted: row.listings_inserted,
    listingsRejected: row.listings_rejected,
    selectorHitRate:
      row.selector_hit_rate != null ? Number(row.selector_hit_rate) : null,
  };
}

export async function getScrapeRuns(options?: {
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<ScrapeRunListItem[]> {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  try {
    const supabase = await createClient();
    let query = supabase
      .from('scrape_runs')
      .select(
        'id, started_at, finished_at, source, status, listings_found, listings_inserted, listings_rejected, selector_hit_rate',
      )
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.source) {
      query = query.eq('source', options.source);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return ((data ?? []) as ScrapeRunListRow[]).map(mapScrapeRunListItem);
  } catch {
    return [];
  }
}

export async function getScrapeRunById(id: string): Promise<ScrapeRunDetail | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('scrape_runs')
      .select(
        'id, started_at, finished_at, source, status, listings_found, listings_inserted, listings_updated, listings_skipped, listings_rejected, selector_hit_rate, failure_reason',
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as ScrapeRunListRow & {
      listings_updated: number;
      listings_skipped: number;
      failure_reason: string | null;
    };

    return {
      ...mapScrapeRunListItem(row),
      listingsUpdated: row.listings_updated,
      listingsSkipped: row.listings_skipped,
      failureReason: row.failure_reason,
    };
  } catch {
    return null;
  }
}

type ScrapeRejectRow = {
  id: string;
  scrape_run_id: string | null;
  external_id: string | null;
  reject_reason: string;
  raw_snippet: Record<string, unknown>;
  created_at: string;
  scrape_runs: { source: string } | { source: string }[] | null;
};

function resolveRejectSource(row: ScrapeRejectRow): string | null {
  const run = row.scrape_runs;
  if (!run) {
    return null;
  }
  if (Array.isArray(run)) {
    return run[0]?.source ?? null;
  }
  return run.source ?? null;
}

export async function getScrapeRejects(options?: {
  source?: string;
  reason?: string;
  runId?: string;
  limit?: number;
}): Promise<ScrapeRejectItem[]> {
  const limit = options?.limit ?? 200;

  try {
    const supabase = await createClient();
    let query = supabase
      .from('scrape_rejects')
      .select(
        'id, scrape_run_id, external_id, reject_reason, raw_snippet, created_at, scrape_runs(source)',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.runId) {
      query = query.eq('scrape_run_id', options.runId);
    }

    if (options?.reason) {
      query = query.ilike('reject_reason', `%${options.reason}%`);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    const mapped = ((data ?? []) as ScrapeRejectRow[]).map((row) => ({
      id: row.id,
      scrapeRunId: row.scrape_run_id,
      externalId: row.external_id,
      rejectReason: row.reject_reason,
      rawSnippet: row.raw_snippet ?? {},
      createdAt: row.created_at,
      source: resolveRejectSource(row),
    }));

    if (options?.source) {
      return mapped.filter((item) => item.source === options.source);
    }

    return mapped;
  } catch {
    return [];
  }
}
