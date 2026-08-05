import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIT_RETENTION_DAYS, getCleanupPreview } from '@/lib/admin/cleanup';

type FilterCall = { table: string; op: string; column: string; value: unknown };

function createMockSupabase(counts: Record<string, number>) {
  function buildQuery(table: string) {
    const filters: FilterCall[] = [];
    const chain = {
      select: () => chain,
      delete: () => chain,
      eq: (column: string, value: unknown) => {
        filters.push({ table, op: 'eq', column, value });
        return chain;
      },
      neq: (column: string, value: unknown) => {
        filters.push({ table, op: 'neq', column, value });
        return chain;
      },
      lt: (column: string, value: unknown) => {
        filters.push({ table, op: 'lt', column, value });
        return chain;
      },
      then(onFulfilled: (value: { count: number; error: null }) => unknown) {
        const key = `${table}:${filters.map((f) => `${f.op}:${f.column}`).join('|')}`;
        const count = counts[key] ?? 0;
        return Promise.resolve({ count, error: null }).then(onFulfilled);
      },
    };
    return chain;
  }

  return {
    from(table: string) {
      return buildQuery(table);
    },
  };
}

describe('getCleanupPreview', () => {
  it('sums preview counts across categories', async () => {
    const supabase = createMockSupabase({
      'listings:eq:status': 10,
      'listings:eq:status|neq:source|lt:scraped_at': 2,
      'scrape_rejects:lt:created_at': 50,
      'scrape_runs:lt:started_at': 5,
    });

    const preview = await getCleanupPreview(supabase as never, DEFAULT_AUDIT_RETENTION_DAYS);

    expect(preview.expiredListings).toBe(10);
    expect(preview.hiddenScraperListings).toBe(2);
    expect(preview.oldScrapeRejects).toBe(50);
    expect(preview.oldScrapeRuns).toBe(5);
    expect(preview.total).toBe(67);
    expect(preview.auditRetentionDays).toBe(DEFAULT_AUDIT_RETENTION_DAYS);
  });
});

describe('DEFAULT_AUDIT_RETENTION_DAYS', () => {
  it('is 30 days', () => {
    expect(DEFAULT_AUDIT_RETENTION_DAYS).toBe(30);
  });
});
