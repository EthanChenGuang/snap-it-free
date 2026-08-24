'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DashboardSectionHeader } from '@/components/admin/DashboardSectionHeader';
import {
  adminBillingHref,
  adminRoutes,
  BILLING_SECTION_IDS,
} from '@/lib/admin/dashboard-links';
import type { ThresholdAlert } from '@/lib/admin/threshold-alerts';
import type { PlatformUsageSnapshot } from '@/lib/admin/platform-usage';
import {
  formatHours,
  formatPlatformTokens,
  formatPlatformUsd,
  formatTraffic,
} from '@/lib/admin/platform-usage';
import { formatQuotaBytes } from '@/lib/admin/quota-usage';
import { formatUtcTimestamp } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type PlatformUsageResponse = {
  snapshot?: PlatformUsageSnapshot;
  alerts?: ThresholdAlert[];
  error?: string;
};

export type PlatformUsageState = {
  snapshot: PlatformUsageSnapshot | null;
  alerts: ThresholdAlert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function usePlatformUsage(): PlatformUsageState {
  const [snapshot, setSnapshot] = useState<PlatformUsageSnapshot | null>(null);
  const [alerts, setAlerts] = useState<ThresholdAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/platform-usage');
      const payload = (await response.json()) as PlatformUsageResponse;
      if (!response.ok) {
        setError(payload.error ?? '加载失败');
        return;
      }
      setSnapshot(payload.snapshot ?? null);
      setAlerts(payload.alerts ?? []);

      void fetch('/api/admin/check-threshold-alerts', { method: 'POST' }).catch(() => {
        /* fire-and-forget alert engine */
      });
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { snapshot, alerts, loading, error, refresh };
}

function UsageProgressBar({ percent, label }: { percent: number; label: string }) {
  const level = percent >= 80 ? 'bg-[#ff3b30]' : percent >= 50 ? 'bg-[#ff9500]' : 'bg-[#34c759]';

  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-all', level)}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function PlatformCard({
  title,
  subtitle,
  icon,
  iconTint,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  iconTint: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="dashboard-platform-card dashboard-platform-card-link">
      <div className="dashboard-platform-card-head">
        <div className="min-w-0">
          <h3 className="dashboard-platform-card-title">{title}</h3>
          <p className="dashboard-platform-card-subtitle">{subtitle}</p>
        </div>
        <span
          className="dashboard-platform-card-icon-wrap"
          style={{ background: iconTint }}
          aria-hidden
        >
          <span className="material-symbols-outlined text-[18px] text-[#1d1d1f]">{icon}</span>
        </span>
      </div>
      <div className="dashboard-platform-card-body">{children}</div>
    </Link>
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
      <span
        className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-[#34c759]' : 'bg-[#aeaeb2]')}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function PlatformUsageGrid({ snapshot, loading, error, refresh }: PlatformUsageState) {
  return (
    <section className="mb-8" aria-label="服务平台用量与费用">
      <DashboardSectionHeader
        title="服务平台用量与费用"
        subtitle="Supabase · 计算托管 · LLM · 代理 · 通知健康度"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={adminRoutes.billing} className="dashboard-metric-action">
              详细账单
            </Link>
            <button type="button" onClick={refresh} disabled={loading} className="dashboard-metric-action">
              {loading ? '刷新中…' : '刷新看板'}
            </button>
          </div>
        }
      />

      <div className="dashboard-infra-shell">
        {error ? (
          <p
            className="mb-4 rounded-xl border border-[#ff3b30]/20 bg-[#ff3b30]/5 p-3 font-mono text-[12px] text-[#ff3b30]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {loading && !snapshot ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="dashboard-platform-card h-[168px] animate-pulse bg-black/[0.03]" />
            ))}
          </div>
        ) : null}

        {snapshot ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <PlatformCard
                title="Supabase 资源"
                subtitle="数据库 · Storage · Egress"
                icon="database"
                iconTint="rgba(62, 207, 142, 0.12)"
                href={adminBillingHref(BILLING_SECTION_IDS.supabase)}
              >
                <div className="space-y-2.5">
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-[#86868b]">
                      <span>数据库</span>
                      <span className="font-mono tabular-nums text-[#636366]">
                        {formatQuotaBytes(snapshot.supabase.databaseBytes)} /{' '}
                        {formatQuotaBytes(snapshot.supabase.databaseLimitBytes)}
                      </span>
                    </div>
                    <UsageProgressBar
                      percent={snapshot.supabase.databasePercent}
                      label={`数据库 ${snapshot.supabase.databasePercent}%`}
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[11px] text-[#86868b]">
                      <span>Storage</span>
                      <span className="font-mono tabular-nums text-[#636366]">
                        {formatQuotaBytes(snapshot.supabase.storageBytes)} ·{' '}
                        {snapshot.supabase.storageObjectCount} 对象
                      </span>
                    </div>
                    <UsageProgressBar
                      percent={snapshot.supabase.storagePercent}
                      label={`Storage ${snapshot.supabase.storagePercent}%`}
                    />
                  </div>
                  <p className="text-[11px] text-[#86868b]">
                    Egress{' '}
                    <span className="font-mono tabular-nums text-[#636366]">
                      {formatTraffic(snapshot.supabase.estimatedEgressBytes)}
                    </span>
                  </p>
                </div>
              </PlatformCard>

              <PlatformCard
                title="Vercel"
                subtitle="Cron · Edge · Bandwidth"
                icon="cloud"
                iconTint="rgba(0, 0, 0, 0.06)"
                href={adminBillingHref(BILLING_SECTION_IDS.vercel)}
              >
                <p className="font-mono text-[12px] tabular-nums text-[#636366]">
                  Egress{' '}
                  <span className="font-semibold text-[#1d1d1f]">
                    {formatTraffic(snapshot.vercel.bandwidthBytes)}
                  </span>
                </p>
                <p className="font-mono text-[12px] tabular-nums text-[#636366]">
                  Edge{' '}
                  <span className="font-semibold text-[#1d1d1f]">
                    {snapshot.vercel.edgeRequests.toLocaleString()}
                  </span>
                </p>
                <p className="font-mono text-[11px] tabular-nums text-[#86868b]">
                  {formatPlatformUsd(snapshot.vercel.estimatedCostUsd)} {snapshot.vercel.planLabel}
                </p>
              </PlatformCard>

              <PlatformCard
                title="Fly.io"
                subtitle="Worker · Instance Hours"
                icon="flight_takeoff"
                iconTint="rgba(136, 89, 225, 0.1)"
                href={adminBillingHref(BILLING_SECTION_IDS.flyio)}
              >
                <p className="font-mono text-2xl font-bold tabular-nums text-[#1d1d1f]">
                  {formatHours(snapshot.flyio.instanceHours)}
                </p>
                <p className="font-mono text-[12px] tabular-nums text-[#636366]">
                  CPU {snapshot.flyio.cpuUsagePercent}% · RAM {snapshot.flyio.ramUsagePercent}%
                </p>
                <p className="font-mono text-[11px] tabular-nums text-[#86868b]">
                  估算 {formatPlatformUsd(snapshot.flyio.estimatedCostUsd)}
                </p>
              </PlatformCard>

              <PlatformCard
                title="翻译 LLM"
                subtitle="Gemini / OpenRouter"
                icon="psychology"
                iconTint="rgba(88, 86, 214, 0.1)"
                href={adminBillingHref(BILLING_SECTION_IDS.llm)}
              >
                <p className="font-mono text-2xl font-bold tabular-nums text-[#1d1d1f]">
                  {formatPlatformUsd(snapshot.translation.monthTotalUsd)}
                </p>
                <p className="text-[12px] text-[#86868b]">
                  Token{' '}
                  <span className="font-mono tabular-nums text-[#636366]">
                    {formatPlatformTokens(snapshot.translation.totalTokens)}
                  </span>
                </p>
              </PlatformCard>

              <PlatformCard
                title="抓取代理"
                subtitle={
                  snapshot.proxy.activeProviderLabel
                    ? `${snapshot.proxy.activeProviderLabel} · 请求与流量`
                    : 'Proxies · 请求与流量'
                }
                icon="swap_horiz"
                iconTint="rgba(255, 149, 0, 0.1)"
                href={adminBillingHref(BILLING_SECTION_IDS.proxy)}
              >
                <p className="font-mono text-2xl font-bold tabular-nums text-[#1d1d1f]">
                  {snapshot.proxy.requestCount.toLocaleString()}
                </p>
                <p className="text-[12px] text-[#86868b]">
                  流量{' '}
                  <span className="font-mono tabular-nums text-[#636366]">
                    {formatTraffic(snapshot.proxy.trafficBytes)}
                  </span>
                  {' · '}
                  费用{' '}
                  <span className="font-mono tabular-nums text-[#636366]">
                    {formatPlatformUsd(snapshot.proxy.costUsd)}
                  </span>
                </p>
                <p className="font-mono text-[11px] tabular-nums text-[#636366]">
                  Block {snapshot.proxy.blockRatePercent}% · 7d {snapshot.proxy.blockedRunCount}/
                  {snapshot.proxy.totalRunCount}
                </p>
              </PlatformCard>

              <PlatformCard
                title="消息通知"
                subtitle="Telegram · Resend · Supabase"
                icon="notifications"
                iconTint="rgba(52, 199, 89, 0.1)"
                href={adminBillingHref(BILLING_SECTION_IDS.messages)}
              >
                <div className="flex flex-wrap gap-1.5">
                  <HealthPill
                    ok={snapshot.notifications.telegramConfigured}
                    label={snapshot.notifications.telegramConfigured ? 'TG 就绪' : 'TG 未配置'}
                  />
                  <HealthPill
                    ok={snapshot.notifications.resendConfigured}
                    label={snapshot.notifications.resendConfigured ? 'Mail 就绪' : 'Mail 未配置'}
                  />
                  <HealthPill ok={snapshot.notifications.quotaHealthy} label="配额正常" />
                </div>
              </PlatformCard>
            </div>

            <p className="mt-4 font-mono text-[11px] tabular-nums text-[#86868b]">
              快照 {formatUtcTimestamp(snapshot.capturedAt)}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
