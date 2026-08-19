import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORPHAN_RUN_TIMEOUT_MINUTES,
  estimateOrphanTimeoutMs,
  getOrphanRunTimeoutMs,
  isStaleRunningRun,
  orphanRunCutoffIso,
  ORPHAN_RUN_MAX_TIMEOUT_MINUTES,
  ORPHAN_RUN_SECONDS_PER_URL,
} from './orphan-runs';

describe('orphan-runs', () => {
  it('computes minimum timeout from minutes', () => {
    expect(getOrphanRunTimeoutMs(DEFAULT_ORPHAN_RUN_TIMEOUT_MINUTES)).toBe(15 * 60_000);
    expect(getOrphanRunTimeoutMs(0)).toBe(0);
  });

  it('scales timeout with category URL count', () => {
    expect(estimateOrphanTimeoutMs(34)).toBe(34 * ORPHAN_RUN_SECONDS_PER_URL * 1000);
    expect(estimateOrphanTimeoutMs(153)).toBe(153 * ORPHAN_RUN_SECONDS_PER_URL * 1000);
    expect(estimateOrphanTimeoutMs(0)).toBe(DEFAULT_ORPHAN_RUN_TIMEOUT_MINUTES * 60_000);
  });

  it('caps scaled timeout at three hours', () => {
    expect(estimateOrphanTimeoutMs(500)).toBe(ORPHAN_RUN_MAX_TIMEOUT_MINUTES * 60_000);
  });

  it('builds cutoff iso from now and timeout', () => {
    const now = new Date('2026-08-15T10:00:00Z');
    expect(orphanRunCutoffIso(now, 15 * 60_000)).toBe('2026-08-15T09:45:00.000Z');
  });

  it('detects stale running runs using scaled timeout', () => {
    const now = new Date('2026-08-15T10:00:00Z');
    const urlCount = 153;
    const timeoutMs = estimateOrphanTimeoutMs(urlCount);

    expect(
      isStaleRunningRun(
        { finishedAt: null, startedAt: '2026-08-15T07:00:00Z' },
        now,
        timeoutMs,
      ),
    ).toBe(true);

    expect(
      isStaleRunningRun(
        { finishedAt: null, startedAt: '2026-08-15T09:30:00Z' },
        now,
        timeoutMs,
      ),
    ).toBe(false);
  });
});
