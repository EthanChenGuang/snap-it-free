import { describe, expect, it } from 'vitest';
import { validateBatch } from './validate-run.js';

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
});
