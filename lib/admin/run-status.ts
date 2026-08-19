import {
  estimateOrphanTimeoutMs,
  isStaleRunningRun,
  ORPHAN_RUN_FAILURE_REASON,
} from '@/lib/admin/orphan-runs';
import type { ScrapeRunStatus } from '@/lib/admin/types';

type RunStatusInput = {
  status: ScrapeRunStatus;
  finishedAt: string | null;
  startedAt?: string;
  targetUrlCount?: number | null;
  targetUrlsSnapshot?: string[] | null;
  failureReason?: string | null;
  httpRequests?: number | null;
  listingsFound?: number;
};

const FAILURE_REASON_LABELS: Record<string, string> = {
  'source disabled': '数据源已关闭',
  'global pause active': '全局暂停',
  'coming soon — crawler not implemented': '数据源尚未接入',
  '该数据源尚未接入': '数据源尚未接入',
  [ORPHAN_RUN_FAILURE_REASON.toLowerCase()]: 'Worker 异常退出（未完成抓取）',
};

const OUTCOME_EXPLANATIONS: Record<string, string> = {
  'source disabled':
    '管理员在设置中关闭了该数据源，程序启动后立即结束，未发起任何 HTTP 请求。这不是「没有新数据」导致的自动跳过。',
  'global pause active':
    '系统处于全局暂停，本次定时任务未执行抓取。手动「立即运行」仍可单独触发。',
  'coming soon — crawler not implemented':
    '该数据源尚未接入爬虫程序，无法执行抓取。',
  '该数据源尚未接入': '该数据源尚未接入爬虫程序，无法执行抓取。',
  [ORPHAN_RUN_FAILURE_REASON.toLowerCase()]:
    '抓取进程在结束前异常退出（崩溃、被终止或网络挂起），未写入完成状态。系统会在超时后自动标记为失败。',
};

function normalizeReason(reason: string): string {
  return reason.trim().toLowerCase();
}

export function localizeFailureReason(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim();
  if (!trimmed) {
    return null;
  }

  const localized = FAILURE_REASON_LABELS[normalizeReason(trimmed)];
  return localized ?? trimmed;
}

function matchesSkipReason(normalizedReason: string): boolean {
  return (
    normalizedReason.includes('source disabled') ||
    normalizedReason.includes('global pause') ||
    normalizedReason.includes('coming soon') ||
    normalizedReason.includes('尚未接入')
  );
}

export function isPreCrawlSkip(run: RunStatusInput): boolean {
  if (run.status !== 'partial') {
    return false;
  }

  const reason = normalizeReason(run.failureReason ?? '');
  if (matchesSkipReason(reason)) {
    return true;
  }

  return (run.httpRequests ?? 0) === 0 && (run.listingsFound ?? 0) === 0;
}

/** Short label for list rows — prefer concrete reason over generic「已跳过」. */
export function resolvePartialListLabel(failureReason: string | null | undefined): string {
  return localizeFailureReason(failureReason) ?? '未完成';
}

function resolveTargetUrlCount(run: RunStatusInput): number {
  if (run.targetUrlCount != null && run.targetUrlCount > 0) {
    return run.targetUrlCount;
  }
  if (Array.isArray(run.targetUrlsSnapshot) && run.targetUrlsSnapshot.length > 0) {
    return run.targetUrlsSnapshot.length;
  }
  return 0;
}

function resolveInProgressStatusLabel(run: RunStatusInput): string {
  if (run.startedAt) {
    const timeoutMs = estimateOrphanTimeoutMs(resolveTargetUrlCount(run));
    if (isStaleRunningRun({ finishedAt: run.finishedAt ?? null, startedAt: run.startedAt }, new Date(), timeoutMs)) {
      return '可能已异常退出';
    }
  }
  return '运行中';
}

/** Detail page chip — always show the concrete reason when available. */
export function resolveRunDetailStatusLabel(run: RunStatusInput): string {
  if (!run.finishedAt) {
    return resolveInProgressStatusLabel(run);
  }
  if (run.status === 'success') {
    return '成功';
  }
  if (run.status === 'partial') {
    return resolvePartialListLabel(run.failureReason);
  }
  return localizeFailureReason(run.failureReason) ?? '失败';
}

export function resolveRunOutcomeExplanation(run: RunStatusInput): string | null {
  if (!run.finishedAt || run.status === 'success') {
    return null;
  }

  const normalized = normalizeReason(run.failureReason ?? '');
  const explanation = OUTCOME_EXPLANATIONS[normalized];
  if (explanation) {
    return explanation;
  }

  if (run.status === 'partial') {
    if (isPreCrawlSkip(run)) {
      return '任务启动后未完成正常抓取流程，未产生 listing 数据。';
    }
    return '任务未完成全部抓取步骤，请查看下方指标与日志。';
  }

  if (run.status === 'failed') {
    const localized = localizeFailureReason(run.failureReason);
    return localized ? `运行失败：${localized}` : '运行失败，请查看下方日志。';
  }

  return null;
}

export function resolveRunStatusLabel(run: RunStatusInput): string {
  if (!run.finishedAt) {
    return resolveInProgressStatusLabel(run);
  }
  if (run.status === 'success') {
    return '成功';
  }
  if (run.status === 'partial') {
    return resolvePartialListLabel(run.failureReason);
  }
  return '失败';
}

export function formatFailureReasonSummary(
  reason: string | null | undefined,
  maxLength = 56,
): string | null {
  const localized = localizeFailureReason(reason);
  if (!localized) {
    return null;
  }
  if (localized.length <= maxLength) {
    return localized;
  }
  return `${localized.slice(0, maxLength - 1)}…`;
}

export function shouldShowFailureReason(run: RunStatusInput): boolean {
  if (!run.finishedAt) {
    return false;
  }
  return run.status === 'partial' || run.status === 'failed';
}
