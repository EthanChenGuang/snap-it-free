'use client';

import { useCallback, useState } from 'react';
import {
  SUPABASE_FREE_LIMITS,
  formatQuotaBytes,
  quotaPercent,
  type QuotaLevel,
  type QuotaUsageSnapshot,
} from '@/lib/admin/quota-usage';
import { formatUtcTimestamp } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

const levelLabels: Record<QuotaLevel, string> = {
  green: '正常',
  yellow: '关注',
  red: '接近上限',
};

const barColors: Record<QuotaLevel, string> = {
  green: 'bg-[#34c759]',
  yellow: 'bg-[#ff9500]',
  red: 'bg-[#ff3b30]',
};

export type QuotaUsageState = {
  snapshot: QuotaUsageSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useQuotaUsage(): QuotaUsageState {
  const [snapshot, setSnapshot] = useState<QuotaUsageSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/quota-usage');
      const payload = (await response.json()) as {
        snapshot?: QuotaUsageSnapshot;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? '加载失败');
        return;
      }
      setSnapshot(payload.snapshot ?? null);
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  return { snapshot, loading, error, refresh };
}

function MiniProgressBar({
  pct,
  level,
  label,
}: {
  pct: number;
  level: QuotaLevel;
  label: string;
}) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full transition-all', barColors[level])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function QuotaUsageMetric({ snapshot, loading, error, refresh }: QuotaUsageState) {
  const dbPct = snapshot
    ? quotaPercent(snapshot.databaseBytes, SUPABASE_FREE_LIMITS.databaseBytes)
    : 0;
  const dbLevel = snapshot?.databaseLevel ?? 'green';

  return (
    <div className="dashboard-metric-card">
      <div className="dashboard-metric-card-head">
        <span className="dashboard-metric-card-label">Supabase 用量</span>
        <span className="material-symbols-outlined dashboard-metric-card-icon" aria-hidden>
          storage
        </span>
      </div>

      {snapshot ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] text-[#86868b]">数据库</span>
            <span className="font-mono text-[11px] tabular-nums text-[#636366]">
              {formatQuotaBytes(snapshot.databaseBytes)} / {formatQuotaBytes(SUPABASE_FREE_LIMITS.databaseBytes)}
            </span>
          </div>
          <MiniProgressBar pct={dbPct} level={dbLevel} label={`数据库 ${dbPct}%`} />
          <p className="font-mono text-[11px] tabular-nums text-[#86868b]">{levelLabels[dbLevel]}</p>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-[#86868b]">点击加载当前用量快照</p>
      )}

      {error ? (
        <p className="mt-2 font-mono text-[11px] text-[#ff3b30]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="dashboard-metric-action mt-3"
      >
        {loading ? '加载中…' : snapshot ? '刷新用量' : '加载用量'}
      </button>
    </div>
  );
}

function UsageMeter({
  label,
  usedBytes,
  limitBytes,
  level,
  detail,
}: {
  label: string;
  usedBytes: number;
  limitBytes: number;
  level: QuotaLevel;
  detail?: string;
}) {
  const pct = quotaPercent(usedBytes, limitBytes);

  return (
    <div className="rounded-lg border border-black/[0.05] bg-[#fafafa] p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-[#1d1d1f]">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-[#636366]">
          {formatQuotaBytes(usedBytes)} / {formatQuotaBytes(limitBytes)} ({pct}%)
        </span>
      </div>
      <MiniProgressBar pct={pct} level={level} label={`${label} ${pct}%`} />
      <p className="mt-2 font-mono text-[11px] tabular-nums text-[#86868b]">
        {levelLabels[level]}
        {detail ? ` · ${detail}` : null}
      </p>
    </div>
  );
}

export function QuotaUsagePanel({ snapshot, loading, error, refresh }: QuotaUsageState) {
  const topTables = snapshot?.tables.slice(0, 6) ?? [];

  return (
    <section className="dashboard-service-card">
      <div className="dashboard-service-card-head">
        <div>
          <h2 className="dashboard-service-card-title">Supabase 用量</h2>
          <p className="dashboard-service-card-subtitle">
            Free 档位监控（数据库 500 MB · Storage 1 GB）
          </p>
        </div>
        <span className="dashboard-service-card-icon-wrap" aria-hidden>
          <span className="material-symbols-outlined text-[20px] text-[#007aff]">cloud</span>
        </span>
      </div>

      {snapshot ? (
        <div className="mt-4 space-y-3">
          <UsageMeter
            label="数据库"
            usedBytes={snapshot.databaseBytes}
            limitBytes={SUPABASE_FREE_LIMITS.databaseBytes}
            level={snapshot.databaseLevel}
          />
          <UsageMeter
            label={`Storage (${snapshot.storage.bucket})`}
            usedBytes={snapshot.storage.bytes}
            limitBytes={SUPABASE_FREE_LIMITS.storageBytes}
            level={snapshot.storage.level}
            detail={`${snapshot.storage.objectCount} 个对象`}
          />
          <p className="text-[12px] text-[#86868b]">{snapshot.egressNote}</p>
          {topTables.length > 0 ? (
            <ul className="space-y-1 border-t border-black/[0.05] pt-3 font-mono text-[11px] tabular-nums text-[#636366]">
              {topTables.map((row) => (
                <li key={row.table} className="flex justify-between gap-4">
                  <span>{row.table}</span>
                  <span>
                    {formatQuotaBytes(row.bytes)} · ~{row.estimatedRows.toLocaleString()} rows
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="font-mono text-[11px] tabular-nums text-[#86868b]">
            快照：{formatUtcTimestamp(snapshot.capturedAt)}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-[13px] text-[#ff3b30]" role="alert">
          {error}
          {error.includes('get_quota_usage_snapshot') ? (
            <>
              {' '}
              请先应用 migration <code className="font-mono text-[11px]">026_quota_usage_snapshot.sql</code>。
            </>
          ) : null}
        </p>
      ) : null}

      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="dashboard-metric-action mt-4"
      >
        {loading ? '刷新中…' : snapshot ? '刷新用量' : '加载用量'}
      </button>
    </section>
  );
}

/** @deprecated Use useQuotaUsage + QuotaUsageMetric/QuotaUsagePanel */
export function QuotaUsageCard() {
  const quota = useQuotaUsage();
  return <QuotaUsagePanel {...quota} />;
}
