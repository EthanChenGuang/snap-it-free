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
