import { describe, expect, it } from 'vitest';
import { validateBatch, validateBatchHttp } from './validate-run.js';

describe('validateBatch', () => {
  const trailingMedians = [100, 100, 100, 100, 100, 100, 100];

  it('fails when count is below 50% of trailing median', () => {
    const result = validateBatch(Array(40).fill({}), trailingMedians, 0.95);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/count 40 < min 50/);
    }
  });

  it('fails when selector hit rate is below 0.9', () => {
    const result = validateBatch(Array(100).fill({}), trailingMedians, 0.85);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/selector hit rate 0.85 < 0.9/);
    }
  });

  it('passes a healthy batch', () => {
    const result = validateBatch(Array(100).fill({}), trailingMedians, 0.95);
    expect(result).toEqual({ ok: true });
  });

  it('uses bootstrap median 50 when fewer than 7 prior runs', () => {
    const result = validateBatch(Array(20).fill({}), [], 0.95);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/count 20 < min 25 \(50% of median 50\)/);
    }
  });

  it('fails when geo resolution rate is below the minimum', () => {
    const result = validateBatch(Array(100).fill({}), trailingMedians, 0.95, 0.5, 0.9, 0.2, 0.5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/geo resolution rate 0\.20 < 0\.5/);
    }
  });

  it('passes when geo resolution rate meets the minimum', () => {
    const result = validateBatch(Array(100).fill({}), trailingMedians, 0.95, 0.5, 0.9, 0.8, 0.5);
    expect(result).toEqual({ ok: true });
  });
});

describe('validateBatchHttp', () => {
  const trailingMedians = [100, 100, 100, 100, 100, 100, 100];

  it('passes incremental low count when crawlSkipped > 0 and completeness >= 0.9', () => {
    const result = validateBatchHttp({
      listings: Array(10).fill({}),
      trailingMedians,
      jsonFieldCompleteness: 0.95,
      crawlMode: 'incremental',
      listingsSkippedAtCrawl: 40,
    });
    expect(result).toEqual({ ok: true });
  });

  it('fails when json field completeness is below 0.9', () => {
    const result = validateBatchHttp({
      listings: Array(100).fill({}),
      trailingMedians,
      jsonFieldCompleteness: 0.85,
      crawlMode: 'full',
      listingsSkippedAtCrawl: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/json field completeness 0\.850 < 0\.9/);
    }
  });

  it('fails full mode when count below 50% median without escape hatch', () => {
    const result = validateBatchHttp({
      listings: Array(40).fill({}),
      trailingMedians,
      jsonFieldCompleteness: 0.95,
      crawlMode: 'full',
      listingsSkippedAtCrawl: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/count 40 < min 50/);
    }
  });

  it('does not apply incremental escape when crawlSkipped is 0', () => {
    const result = validateBatchHttp({
      listings: Array(10).fill({}),
      trailingMedians,
      jsonFieldCompleteness: 0.95,
      crawlMode: 'incremental',
      listingsSkippedAtCrawl: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/count 10 < min 20/);
    }
  });

  it('passes vinted incremental with zero count floor (SCRP-E08)', () => {
    const result = validateBatchHttp({
      listings: [],
      trailingMedians,
      jsonFieldCompleteness: 0.95,
      crawlMode: 'incremental',
      listingsSkippedAtCrawl: 0,
      minCountRatioIncremental: 0,
    });
    expect(result).toEqual({ ok: true });
  });

  it('reports block rate when every URL is blocked (not completeness)', () => {
    const result = validateBatchHttp({
      listings: [],
      trailingMedians,
      jsonFieldCompleteness: 0,
      crawlMode: 'incremental',
      listingsSkippedAtCrawl: 0,
      blockedUrlCount: 4,
      totalUrlCount: 4,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('4/4 category URLs blocked (no listings extracted)');
    }
  });
});
