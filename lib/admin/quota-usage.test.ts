import { describe, expect, it } from 'vitest';
import {
  SUPABASE_FREE_LIMITS,
  classifyQuotaUsage,
  formatQuotaBytes,
  quotaPercent,
} from './quota-usage';

describe('classifyQuotaUsage', () => {
  const limit = SUPABASE_FREE_LIMITS.databaseBytes;

  it('green below 50%', () => {
    expect(classifyQuotaUsage(limit * 0.49, limit)).toBe('green');
  });

  it('yellow between 50% and 80%', () => {
    expect(classifyQuotaUsage(limit * 0.5, limit)).toBe('yellow');
    expect(classifyQuotaUsage(limit * 0.79, limit)).toBe('yellow');
  });

  it('red at 80%+', () => {
    expect(classifyQuotaUsage(limit * 0.8, limit)).toBe('red');
  });
});

describe('formatQuotaBytes', () => {
  it('formats MB and GB', () => {
    expect(formatQuotaBytes(512 * 1024)).toMatch(/KB|MB/);
    expect(formatQuotaBytes(40 * 1024 * 1024)).toBe('40.0 MB');
  });
});

describe('quotaPercent', () => {
  it('caps at 100', () => {
    expect(quotaPercent(SUPABASE_FREE_LIMITS.storageBytes * 2, SUPABASE_FREE_LIMITS.storageBytes)).toBe(
      100,
    );
  });
});

describe('featured-photos storage (今日精选)', () => {
  it('parses the RPC payload', async () => {
    const { parseFeaturedStorage } = await import('./quota-usage');
    expect(parseFeaturedStorage({ bucket: 'featured-photos', object_count: 3, bytes: 36000 })).toEqual({
      bucket: 'featured-photos',
      objectCount: 3,
      bytes: 36000,
    });
    expect(parseFeaturedStorage(null)).toBeNull();
  });

  it('omits the featured bucket when its function is missing', async () => {
    const { collectQuotaUsageSnapshot } = await import('./quota-usage');
    const rpc = async (name: string) =>
      name === 'get_quota_usage_snapshot'
        ? { data: { database_bytes: 1, storage: { bytes: 2, object_count: 1 } }, error: null }
        : { data: null, error: { message: 'function does not exist' } };
    const snap = await collectQuotaUsageSnapshot({ rpc } as never);
    expect(snap.featuredStorage).toBeNull();
    expect(snap.storage.bytes).toBe(2);
  });
});
