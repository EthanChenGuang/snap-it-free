import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseWorkerArgs } from './worker.js';

describe('parseWorkerArgs', () => {
  it('defaults to source=subito, once=false, schedulerTick=false', () => {
    expect(parseWorkerArgs([])).toEqual({ source: 'subito', once: false, schedulerTick: false });
  });

  it('parses --source override', () => {
    expect(parseWorkerArgs(['--source', 'vinted'])).toEqual({
      source: 'vinted',
      once: false,
      schedulerTick: false,
    });
  });

  it('parses --once', () => {
    expect(parseWorkerArgs(['--once'])).toEqual({
      source: 'subito',
      once: true,
      schedulerTick: false,
    });
  });

  it('parses --scheduler-tick (D-07-66)', () => {
    expect(parseWorkerArgs(['--scheduler-tick'])).toEqual({
      source: 'subito',
      once: false,
      schedulerTick: true,
    });
  });

  it('ignores a bare `--` separator (npm-script argv passthrough)', () => {
    expect(parseWorkerArgs(['--', '--scheduler-tick'])).toEqual({
      source: 'subito',
      once: false,
      schedulerTick: true,
    });
  });
});

describe('main() --scheduler-tick (D-07-66)', () => {
  const originalArgv = process.argv;
  const reconcileOrphanScrapeRuns = vi.fn().mockResolvedValue(0);
  const runSchedulerTick = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    reconcileOrphanScrapeRuns.mockResolvedValue(0);
    runSchedulerTick.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('invokes runSchedulerTick exactly once and does not start the setInterval loop', async () => {
    vi.doMock('./orphan-runs.js', () => ({ reconcileOrphanScrapeRuns }));
    vi.doMock('./scheduler.js', () => ({
      runSchedulerTick,
      TICK_INTERVAL_MS: 60_000,
    }));

    process.argv = ['node', 'worker.ts', '--scheduler-tick'];

    const { main } = await import('./worker.js');
    await main();

    expect(reconcileOrphanScrapeRuns).toHaveBeenCalledTimes(1);
    expect(runSchedulerTick).toHaveBeenCalledTimes(1);
  });
});
