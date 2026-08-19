'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  estimateFreeTierSafetyPercent,
  estimateMonthlyCloudSpend,
  formatHours,
  formatPlatformTokens,
  formatPlatformUsd,
  formatTraffic,
  type PlatformUsageSnapshot,
} from '@/lib/admin/platform-usage';
import { formatQuotaBytes } from '@/lib/admin/quota-usage';
import { formatUtcTimestamp } from '@/lib/admin/format';
import { formatTokenCount, formatUsd } from '@/lib/admin/translation-cost';
import { cn } from '@/lib/utils';

const ANCHORS = [
  { id: 'billing-supabase', label: 'Supabase' },
  { id: 'billing-vercel', label: 'Vercel' },
  { id: 'billing-flyio', label: 'Fly.io' },
  { id: 'billing-llm', label: 'LLM 翻译' },
  { id: 'billing-proxy', label: '代理与消息' },
] as const;

type BillingClientProps = {
  initialSnapshot: PlatformUsageSnapshot | null;
  initialError: string | null;
};

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="billing-metric-row">
      <span className="billing-metric-label">{label}</span>
      <span className="billing-metric-value">{value}</span>
    </div>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const tone =
    percent >= 80 ? 'bg-[#ff3b30]' : percent >= 50 ? 'bg-[#ff9500]' : 'bg-[#34c759]';

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-black/[0.06]"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

function BillingPanel({
  id,
  title,
  subtitle,
  icon,
  iconTint,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconTint: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="billing-panel scroll-mt-24">
      <header className="billing-panel-head">
        <div>
          <h2 className="billing-panel-title">{title}</h2>
          <p className="billing-panel-subtitle">{subtitle}</p>
        </div>
        <span className="billing-panel-icon-wrap" style={{ background: iconTint }} aria-hidden>
          <span className="material-symbols-outlined text-[22px] text-[#1d1d1f]">{icon}</span>
        </span>
      </header>
      <div className="billing-panel-body">{children}</div>
    </section>
  );
}

function HealthPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] tabular-nums',
        ok ? 'bg-[#34c759]/10 text-[#248a3d]' : 'bg-black/[0.04] text-[#86868b]',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-[#34c759]' : 'bg-[#aeaeb2]')} aria-hidden />
      {label}
    </span>
  );
}

export function BillingClient({ initialSnapshot, initialError }: BillingClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/platform-usage');
      const payload = (await response.json()) as { snapshot?: PlatformUsageSnapshot; error?: string };
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

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!snapshot && !loading && !error) {
    return (
      <div className="billing-console">
        <header className="dashboard-page-header">
          <h1 className="dashboard-page-title">平台费用</h1>
          <p className="dashboard-page-subtitle">Billing · Infrastructure Usage</p>
        </header>
        <button type="button" onClick={refresh} className="dashboard-metric-action">
          加载数据
        </button>
      </div>
    );
  }

  const totalSpend = snapshot ? estimateMonthlyCloudSpend(snapshot) : 0;
  const safetyPercent = snapshot ? estimateFreeTierSafetyPercent(snapshot) : 0;

  return (
    <div className="billing-console">
      <header className="dashboard-page-header">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="dashboard-page-title">平台费用</h1>
            <p className="dashboard-page-subtitle">Billing · Infrastructure Usage</p>
          </div>
          <Link href="/admin" className="dashboard-metric-link text-[13px]">
            ← 返回概览
          </Link>
        </div>
      </header>

      <section className="billing-summary-panel mb-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="billing-summary-label">本月云服务预估总支出</p>
            <p className="font-mono text-3xl font-bold tabular-nums text-[#1d1d1f]">
              {formatUsd(totalSpend)}
            </p>
            {snapshot ? (
              <p className="mt-1 font-mono text-[11px] tabular-nums text-[#86868b]">
                快照 {formatUtcTimestamp(snapshot.capturedAt)}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={refresh} disabled={loading} className="dashboard-metric-action">
            {loading ? '刷新中…' : '刷新数据'}
          </button>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-[#1d1d1f]">免费额度消耗安全度</span>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-[#636366]">
              {safetyPercent}%
            </span>
          </div>
          <ProgressBar percent={100 - safetyPercent} label={`额度消耗 ${100 - safetyPercent}%`} />
        </div>

        {error ? (
          <p className="mt-4 font-mono text-[12px] text-[#ff3b30]" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <nav className="billing-anchor-nav" aria-label="费用分区导航">
        {ANCHORS.map((anchor) => (
          <button
            key={anchor.id}
            type="button"
            onClick={() => scrollTo(anchor.id)}
            className="billing-anchor-btn"
          >
            {anchor.label}
          </button>
        ))}
      </nav>

      {snapshot ? (
        <div className="billing-panels space-y-6">
          <BillingPanel
            id="billing-supabase"
            title="Supabase"
            subtitle="PostgreSQL · Storage · Auth · API"
            icon="database"
            iconTint="rgba(62, 207, 142, 0.12)"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <MetricRow
                  label="数据库容量"
                  value={
                    <span className="font-mono tabular-nums">
                      {formatQuotaBytes(snapshot.supabase.databaseBytes)} /{' '}
                      {formatQuotaBytes(snapshot.supabase.databaseLimitBytes)}
                    </span>
                  }
                />
                <ProgressBar
                  percent={snapshot.supabase.databasePercent}
                  label={`数据库 ${snapshot.supabase.databasePercent}%`}
                />
                <MetricRow
                  label="索引估算"
                  value={
                    <span className="font-mono tabular-nums">
                      {formatQuotaBytes(snapshot.supabase.indexBytesEstimate)}
                    </span>
                  }
                />
              </div>
              <div className="space-y-3">
                <MetricRow
                  label="Storage"
                  value={
                    <span className="font-mono tabular-nums">
                      {formatQuotaBytes(snapshot.supabase.storageBytes)} ·{' '}
                      {snapshot.supabase.storageObjectCount} 对象
                    </span>
                  }
                />
                <ProgressBar
                  percent={snapshot.supabase.storagePercent}
                  label={`Storage ${snapshot.supabase.storagePercent}%`}
                />
                <MetricRow
                  label="Egress 估算"
                  value={
                    <span className="font-mono tabular-nums">
                      {formatTraffic(snapshot.supabase.estimatedEgressBytes)}
                    </span>
                  }
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-t border-black/[0.05] pt-4 md:grid-cols-2">
              <MetricRow
                label="API 请求（本月估算）"
                value={
                  <span className="font-mono tabular-nums">
                    {snapshot.supabase.apiRequestsMonth.toLocaleString()}
                  </span>
                }
              />
              <MetricRow
                label="MAU 估算"
                value={
                  <span className="font-mono tabular-nums">
                    {snapshot.supabase.mauEstimate.toLocaleString()}
                  </span>
                }
              />
            </div>
            <p className="mt-3 text-[12px] text-[#86868b]">{snapshot.supabase.egressNote}</p>
          </BillingPanel>

          <BillingPanel
            id="billing-vercel"
            title="Vercel"
            subtitle="Cron · Edge Network · Builds"
            icon="cloud"
            iconTint="rgba(0, 0, 0, 0.06)"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <MetricRow
                label="Bandwidth (Egress)"
                value={
                  <span className="font-mono tabular-nums">
                    {formatTraffic(snapshot.vercel.bandwidthBytes)}
                  </span>
                }
              />
              <MetricRow
                label="Edge Requests"
                value={
                  <span className="font-mono tabular-nums">
                    {snapshot.vercel.edgeRequests.toLocaleString()}
                  </span>
                }
              />
              <MetricRow
                label="Build 时长（估算）"
                value={
                  <span className="font-mono tabular-nums">{snapshot.vercel.buildMinutes} min</span>
                }
              />
              <MetricRow
                label="CDN 命中率"
                value={
                  <span className="font-mono tabular-nums">
                    {snapshot.vercel.cdnHitRatePercent != null
                      ? `${snapshot.vercel.cdnHitRatePercent}%`
                      : '—'}
                  </span>
                }
              />
            </div>
            <p className="mt-4 font-mono text-[13px] tabular-nums text-[#636366]">
              预估费用 {formatPlatformUsd(snapshot.vercel.estimatedCostUsd)} · Plan{' '}
              {snapshot.vercel.planLabel}
            </p>
          </BillingPanel>

          <BillingPanel
            id="billing-flyio"
            title="Fly.io"
            subtitle="Scraper Worker · Cron Jobs"
            icon="flight_takeoff"
            iconTint="rgba(136, 89, 225, 0.1)"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <MetricRow
                label="Worker Instance Hours"
                value={
                  <span className="font-mono tabular-nums">
                    {formatHours(snapshot.flyio.instanceHours)}
                  </span>
                }
              />
              <MetricRow
                label="Cron Jobs 运行次数"
                value={
                  <span className="font-mono tabular-nums">
                    {snapshot.flyio.cronJobRuns.toLocaleString()}
                  </span>
                }
              />
              <MetricRow
                label="CPU 使用率（估算）"
                value={
                  <span className="font-mono tabular-nums">{snapshot.flyio.cpuUsagePercent}%</span>
                }
              />
              <MetricRow
                label="RAM 使用率（估算）"
                value={
                  <span className="font-mono tabular-nums">{snapshot.flyio.ramUsagePercent}%</span>
                }
              />
            </div>
            <div className="mt-4 space-y-2">
              <MetricRow
                label="OOM 事件"
                value={
                  <span
                    className={cn(
                      'font-mono tabular-nums',
                      snapshot.flyio.oomEvents > 0 ? 'text-[#ff3b30]' : 'text-[#248a3d]',
                    )}
                  >
                    {snapshot.flyio.oomEvents}
                  </span>
                }
              />
              <p className="font-mono text-[13px] tabular-nums text-[#636366]">
                预估费用 {formatPlatformUsd(snapshot.flyio.estimatedCostUsd)}
              </p>
            </div>
          </BillingPanel>

          <BillingPanel
            id="billing-llm"
            title="LLM 翻译"
            subtitle={snapshot.translation.primaryModelLabel}
            icon="psychology"
            iconTint="rgba(88, 86, 214, 0.1)"
          >
            <div className="mb-4 flex flex-wrap items-baseline gap-4">
              <p className="font-mono text-2xl font-bold tabular-nums text-[#1d1d1f]">
                {formatPlatformUsd(snapshot.translation.monthTotalUsd)}
              </p>
              <p className="font-mono text-[13px] tabular-nums text-[#86868b]">
                Token {formatPlatformTokens(snapshot.translation.totalTokens)}
              </p>
            </div>
            {snapshot.translation.providerDetails.length > 0 ? (
              <ul className="space-y-3">
                {snapshot.translation.providerDetails.map((provider) => (
                  <li
                    key={provider.provider}
                    className="rounded-lg border border-black/[0.05] bg-[#fafafa] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[#1d1d1f]">
                        {provider.label}
                      </span>
                      <span className="font-mono text-[12px] tabular-nums text-[#636366]">
                        {formatPlatformUsd(provider.costUsd)} ({provider.percent}%)
                      </span>
                    </div>
                    <div className="grid gap-2 font-mono text-[11px] tabular-nums text-[#86868b] md:grid-cols-3">
                      <span>Input {formatTokenCount(provider.inputTokens)}</span>
                      <span>Output {formatTokenCount(provider.outputTokens)}</span>
                      <span>{provider.callCount.toLocaleString()} calls</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[#86868b]">暂无本月翻译用量记录。</p>
            )}
          </BillingPanel>

          <BillingPanel
            id="billing-proxy"
            title="代理与消息"
            subtitle="Proxies · Telegram · Resend"
            icon="swap_horiz"
            iconTint="rgba(255, 149, 0, 0.1)"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <MetricRow
                label="代理请求数"
                value={
                  <span className="font-mono tabular-nums">
                    {snapshot.proxy.requestCount.toLocaleString()}
                  </span>
                }
              />
              <MetricRow
                label="代理流量"
                value={
                  <span className="font-mono tabular-nums">
                    {formatTraffic(snapshot.proxy.estimatedTrafficBytes)}
                  </span>
                }
              />
              <MetricRow
                label="Block Rate (7d)"
                value={
                  <span className="font-mono tabular-nums">
                    {snapshot.proxy.blockRatePercent}% · {snapshot.proxy.blockedRunCount}/
                    {snapshot.proxy.totalRunCount}
                  </span>
                }
              />
            </div>
            <div className="mt-4 space-y-3 border-t border-black/[0.05] pt-4">
              <p className="text-[13px] font-medium text-[#1d1d1f]">通知配额健康度</p>
              <div className="flex flex-wrap gap-2">
                <HealthPill
                  ok={snapshot.notifications.telegramConfigured}
                  label={
                    snapshot.notifications.telegramConfigured ? 'Telegram 就绪' : 'Telegram 未配置'
                  }
                />
                <HealthPill
                  ok={snapshot.notifications.resendConfigured}
                  label={
                    snapshot.notifications.resendConfigured ? 'Resend 就绪' : 'Resend 未配置'
                  }
                />
                <HealthPill ok={snapshot.notifications.quotaHealthy} label="Supabase 配额" />
              </div>
              <p className="font-mono text-[11px] tabular-nums text-[#86868b]">
                {snapshot.notifications.telegramTarget
                  ? `TG: ${snapshot.notifications.telegramTarget}`
                  : 'TG: —'}
                {' · '}
                {snapshot.notifications.resendTarget
                  ? `Mail: ${snapshot.notifications.resendTarget}`
                  : 'Mail: —'}
              </p>
            </div>
          </BillingPanel>
        </div>
      ) : null}
    </div>
  );
}

export function BillingSkeleton() {
  return (
    <div className="billing-console">
      <div className="mb-6 h-14 animate-pulse rounded-xl bg-black/[0.04]" />
      <div className="mb-6 h-36 animate-pulse rounded-xl bg-black/[0.04]" />
      <div className="mb-6 h-12 animate-pulse rounded-xl bg-black/[0.04]" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="mb-6 h-56 animate-pulse rounded-xl bg-black/[0.04]" />
      ))}
    </div>
  );
}
