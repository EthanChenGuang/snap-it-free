import { createServiceClient } from '@/lib/supabase/service';
import type {
  AdminAlert,
  GlobalAdminStatus,
  ScrapeRunStatus,
  SourceWithLastRun,
} from '@/lib/admin/types';

// Tracer uses service role for reads — Plan 03 switches to operator RLS session client.

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
  const supabase = createServiceClient();

  const { data: sources, error: sourcesError } = await supabase
    .from('scraper_sources')
    .select(
      'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset',
    )
    .order('slug');

  if (sourcesError) {
    throw sourcesError;
  }

  const { data: runs, error: runsError } = await supabase
    .from('scrape_runs')
    .select('id, source, status, started_at, finished_at, listings_found, failure_reason')
    .order('started_at', { ascending: false })
    .limit(200);

  if (runsError) {
    throw runsError;
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
}

export async function getRecentAlerts(limit = 5): Promise<AdminAlert[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('scrape_runs')
    .select('id, source, status, started_at, failure_reason')
    .in('status', ['failed', 'partial'])
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    source: row.source as string,
    message: (row.failure_reason as string | null) ?? '运行未完成',
    timestamp: row.started_at as string,
    status: row.status as 'failed' | 'partial',
  }));
}

export async function getGlobalAdminStatus(): Promise<GlobalAdminStatus> {
  const supabase = createServiceClient();

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

  if (globalError) {
    throw globalError;
  }
  if (runError) {
    throw runError;
  }

  const lastSyncAt =
    (latestRun?.finished_at as string | null) ??
    (latestRun?.started_at as string | null) ??
    null;

  return {
    globalPause: Boolean(globalConfig?.global_pause),
    lastSyncAt,
  };
}
