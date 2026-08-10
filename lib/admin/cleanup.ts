import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_AUDIT_RETENTION_DAYS = 30;

export type CleanupPreview = {
  expiredListings: number;
  hiddenScraperListings: number;
  oldScrapeRejects: number;
  oldScrapeRuns: number;
  auditRetentionDays: number;
  total: number;
};

export type CleanupResult = {
  deletedExpiredListings: number;
  deletedHiddenScraperListings: number;
  deletedScrapeRuns: number;
  deletedScrapeRejects: number;
  auditRetentionDays: number;
};

function retentionCutoffIso(days: number): string {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff.toISOString();
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  applyFilter: (query: any) => any,
): Promise<number> {
  const { count, error } = await applyFilter(
    supabase.from(table).select('*', { count: 'exact', head: true }),
  );
  if (error) {
    throw new Error(`${table} count failed: ${error.message}`);
  }
  return count ?? 0;
}

export async function getCleanupPreview(
  supabase: SupabaseClient,
  auditRetentionDays: number = DEFAULT_AUDIT_RETENTION_DAYS,
): Promise<CleanupPreview> {
  const cutoff = retentionCutoffIso(auditRetentionDays);

  const [expiredListings, hiddenScraperListings, oldScrapeRejects, oldScrapeRuns] =
    await Promise.all([
      countRows(supabase, 'listings', (q) => q.eq('status', 'expired')),
      countRows(supabase, 'listings', (q) =>
        q.eq('status', 'hidden').neq('source', 'ugc').lt('scraped_at', cutoff),
      ),
      countRows(supabase, 'scrape_rejects', (q) => q.lt('created_at', cutoff)),
      countRows(supabase, 'scrape_runs', (q) => q.lt('started_at', cutoff)),
    ]);

  return {
    expiredListings,
    hiddenScraperListings,
    oldScrapeRejects,
    oldScrapeRuns,
    auditRetentionDays,
    total: expiredListings + hiddenScraperListings + oldScrapeRejects + oldScrapeRuns,
  };
}

async function deleteRows(
  supabase: SupabaseClient,
  table: string,
  applyFilter: (query: any) => any,
): Promise<number> {
  const { count, error } = await applyFilter(supabase.from(table).delete({ count: 'exact' }));
  if (error) {
    throw new Error(`${table} delete failed: ${error.message}`);
  }
  return count ?? 0;
}

export async function executeCleanup(
  supabase: SupabaseClient,
  auditRetentionDays: number = DEFAULT_AUDIT_RETENTION_DAYS,
): Promise<CleanupResult> {
  const cutoff = retentionCutoffIso(auditRetentionDays);

  const deletedScrapeRejects = await deleteRows(supabase, 'scrape_rejects', (q) =>
    q.lt('created_at', cutoff),
  );
  const deletedScrapeRuns = await deleteRows(supabase, 'scrape_runs', (q) =>
    q.lt('started_at', cutoff),
  );
  const deletedExpiredListings = await deleteRows(supabase, 'listings', (q) =>
    q.eq('status', 'expired'),
  );
  const deletedHiddenScraperListings = await deleteRows(supabase, 'listings', (q) =>
    q.eq('status', 'hidden').neq('source', 'ugc').lt('scraped_at', cutoff),
  );

  return {
    deletedExpiredListings,
    deletedHiddenScraperListings,
    deletedScrapeRejects,
    deletedScrapeRuns,
    auditRetentionDays,
  };
}
