'use client';

import type { TranslationCostSummary } from '@/lib/admin/types';
import {
  formatTokenCount,
  formatUsd,
  formatUsdCompact,
} from '@/lib/admin/translation-cost';
import { cn } from '@/lib/utils';

type TranslationCostKpiGridProps = {
  summary: TranslationCostSummary;
  loading?: boolean;
};

function ProviderProgressBar({
  label,
  costUsd,
  percent,
  color,
}: {
  label: string;
  costUsd: number;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-mono tabular-nums text-gray-800">
          {formatUsdCompact(costUsd)} ({percent}%)
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} 费用占比 ${percent}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function TranslationCostKpiGrid({ summary, loading }: TranslationCostKpiGridProps) {
  const trend = summary.monthOverMonthDeltaPercent;
  const trendDown = trend != null && trend < 0;
  const trendUp = trend != null && trend > 0;

  return (
    <section
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
      aria-label="翻译费用统计"
      aria-busy={loading}
    >
      <article className="translation-cost-kpi-card">
        <p className="translation-cost-kpi-label">本月总消费</p>
        <p className="font-mono text-2xl font-bold tabular-nums text-gray-900">
          {formatUsd(summary.monthTotalUsd)}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          消耗 Token:{' '}
          <span className="font-mono tabular-nums">{formatTokenCount(summary.totalTokens)}</span>
          {' · '}
          均价:{' '}
          <span className="font-mono tabular-nums">
            {formatUsdCompact(summary.avgCostPerListingUsd)}/条
          </span>
        </p>
      </article>

      <article className="translation-cost-kpi-card">
        <div className="flex items-start justify-between gap-2">
          <p className="translation-cost-kpi-label">周期对比</p>
          {trend != null ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
                trendDown && 'bg-emerald-50 text-emerald-600',
                trendUp && 'bg-red-50 text-red-600',
                !trendDown && !trendUp && 'bg-gray-100 text-gray-600',
              )}
            >
              {trendDown ? '↓' : trendUp ? '↑' : '—'} {Math.abs(trend)}% vs 上月
            </span>
          ) : null}
        </div>
        <div className="mt-1 space-y-1">
          <p className="text-sm text-gray-600">
            今日消费{' '}
            <span className="font-mono text-base font-semibold tabular-nums text-gray-900">
              {formatUsdCompact(summary.todayUsd)}
            </span>
          </p>
          <p className="text-sm text-gray-600">
            本月累计{' '}
            <span className="font-mono text-base font-semibold tabular-nums text-gray-900">
              {formatUsd(summary.monthTotalUsd)}
            </span>
          </p>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          今日 {summary.translationsToday} 条 · 本月 {summary.translatedThisMonth} 条
        </p>
      </article>

      <article className="translation-cost-kpi-card">
        <p className="translation-cost-kpi-label">Provider 拆分</p>
        <div className="mt-2 space-y-3">
          {summary.providers.map((provider) => (
            <ProviderProgressBar
              key={provider.provider}
              label={provider.label}
              costUsd={provider.costUsd}
              percent={provider.percent}
              color={provider.color}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          主模型{' '}
          <span className="font-medium text-gray-700">{summary.primaryModelLabel}</span>
        </p>
      </article>
    </section>
  );
}
