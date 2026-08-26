import { describe, expect, it } from 'vitest';
import {
  dequeuePendingJobs,
  filterPendingJobsForEnabledSources,
  mergeRunQueue,
  pickDueSources,
  staggerDelayMs,
  STAGGER_MINUTES,
} from './scheduler.js';

describe('scheduler', () => {
  const now = new Date('2026-08-04T12:00:00Z');

  it('picks sources where next_run_at <= now (D-13)', () => {
    const sources = [
      { slug: 'subito', enabled: true, next_run_at: '2026-08-04T11:00:00Z' },
      { slug: 'facebook', enabled: true, next_run_at: '2026-08-04T13:00:00Z' },
      { slug: 'vinted', enabled: false, next_run_at: '2026-08-04T10:00:00Z' },
    ];
    expect(pickDueSources(sources, now, false)).toEqual([sources[0]]);
  });

  it('picks sources with null next_run_at as immediately due (D-13)', () => {
    const sources = [
      { slug: 'subito', enabled: true, next_run_at: null },
      { slug: 'facebook', enabled: true, next_run_at: '2026-08-04T13:00:00Z' },
    ];
    expect(pickDueSources(sources, now, false)).toEqual([sources[0]]);
  });

  it('returns empty when global pause is active (D-17)', () => {
    const sources = [
      { slug: 'subito', enabled: true, next_run_at: '2026-08-04T11:00:00Z' },
    ];
    expect(pickDueSources(sources, now, true)).toEqual([]);
  });

  it('dequeues pending scrape_jobs (D-33)', () => {
    const jobs = [
      { id: '1', source_slug: 'subito', status: 'pending' },
      { id: '2', source_slug: 'facebook', status: 'running' },
      { id: '3', source_slug: 'ebay', status: 'pending' },
    ];
    expect(dequeuePendingJobs(jobs)).toEqual([jobs[0], jobs[2]]);
  });

  it('applies stagger index × stagger minutes (D-15)', () => {
    expect(staggerDelayMs(0)).toBe(0);
    expect(staggerDelayMs(1)).toBe(STAGGER_MINUTES * 60_000);
    expect(staggerDelayMs(2)).toBe(2 * STAGGER_MINUTES * 60_000);
  });

  it('filters pending jobs for disabled sources', () => {
    const jobs = [
      { id: '1', source_slug: 'subito', status: 'pending' },
      { id: '2', source_slug: 'vinted', status: 'pending' },
      { id: '3', source_slug: 'ebay', status: 'running' },
    ];
    const enabledSlugs = new Set(['subito']);
    expect(filterPendingJobsForEnabledSources(jobs, enabledSlugs)).toEqual([jobs[0]]);
  });

  it('merges pending jobs and due sources deduping by source_slug (D-33)', () => {
    const dueSources = [
      { slug: 'subito', enabled: true, next_run_at: '2026-08-04T11:00:00Z' },
      { slug: 'ebay', enabled: true, next_run_at: '2026-08-04T11:30:00Z' },
    ];
    const pendingJobs = [
      { id: 'job-1', source_slug: 'subito', status: 'pending' },
      { id: 'job-2', source_slug: 'facebook', status: 'pending' },
    ];
    expect(mergeRunQueue(dueSources, pendingJobs)).toEqual([
      { sourceSlug: 'subito', trigger: 'manual', jobId: 'job-1' },
      { sourceSlug: 'facebook', trigger: 'manual', jobId: 'job-2' },
      { sourceSlug: 'ebay', trigger: 'cron' },
    ]);
  });
});
