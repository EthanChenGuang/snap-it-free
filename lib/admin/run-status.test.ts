import { describe, expect, it } from 'vitest';
import {
  formatFailureReasonSummary,
  isPreCrawlSkip,
  localizeFailureReason,
  resolvePartialListLabel,
  resolveRunDetailStatusLabel,
  resolveRunOutcomeExplanation,
  resolveRunStatusLabel,
} from './run-status';

describe('run-status', () => {
  it('shows concrete reason instead of generic skipped label', () => {
    expect(resolvePartialListLabel('Source disabled')).toBe('数据源已关闭');
    expect(resolvePartialListLabel(null)).toBe('未完成');

    expect(
      resolveRunDetailStatusLabel({
        status: 'partial',
        finishedAt: '2026-08-12T11:00:00Z',
        failureReason: 'Source disabled',
      }),
    ).toBe('数据源已关闭');
  });

  it('localizes known worker failure reasons', () => {
    expect(localizeFailureReason('Source disabled')).toBe('数据源已关闭');
    expect(localizeFailureReason('Global pause active')).toBe('全局暂停');
  });

  it('explains source disabled is admin config not empty crawl', () => {
    const explanation = resolveRunOutcomeExplanation({
      status: 'partial',
      finishedAt: '2026-08-12T11:00:00Z',
      failureReason: 'Source disabled',
      httpRequests: 0,
      listingsFound: 0,
    });

    expect(explanation).toContain('管理员');
    expect(explanation).toContain('不是');
  });

  it('detects pre-crawl skip runs', () => {
    expect(
      isPreCrawlSkip({
        status: 'partial',
        finishedAt: '2026-08-12T11:00:00Z',
        failureReason: 'Source disabled',
        httpRequests: 0,
        listingsFound: 0,
      }),
    ).toBe(true);
  });

  it('resolves list status labels', () => {
    expect(
      resolveRunStatusLabel({
        status: 'partial',
        finishedAt: '2026-08-12T11:00:00Z',
        failureReason: 'Source disabled',
      }),
    ).toBe('数据源已关闭');

    expect(
      resolveRunStatusLabel({
        status: 'failed',
        finishedAt: '2026-08-12T11:00:00Z',
        failureReason: 'selector hit rate too low',
      }),
    ).toBe('失败');
  });

  it('shows stale in-progress runs as possibly aborted after scaled timeout', () => {
    const startedAt = '2026-08-15T08:00:00Z';
    expect(
      resolveRunStatusLabel({
        status: 'partial',
        finishedAt: null,
        startedAt,
        targetUrlCount: 34,
      }),
    ).toBe('可能已异常退出');
  });

  it('keeps large URL lists running within scaled timeout window', () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60_000).toISOString();
    expect(
      resolveRunStatusLabel({
        status: 'partial',
        finishedAt: null,
        startedAt: thirtyMinutesAgo,
        targetUrlCount: 221,
      }),
    ).toBe('运行中');
  });

  it('localizes orphan worker failure reason', () => {
    expect(
      localizeFailureReason('Worker exited without finishing (orphaned run)'),
    ).toBe('Worker 异常退出（未完成抓取）');
  });
});
