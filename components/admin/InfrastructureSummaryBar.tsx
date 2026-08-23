'use client';

import Link from 'next/link';
import {
  estimateMonthlyCloudSpend,
  formatHours,
  formatPlatformUsd,
} from '@/lib/admin/platform-usage';
import { formatQuotaBytes } from '@/lib/admin/quota-usage';
import { adminRoutes } from '@/lib/admin/dashboard-links';
import { cn } from '@/lib/utils';
import type { PlatformUsageState } from '@/components/admin/PlatformUsageGrid';

function MiniProgressBar({ percent }: { percent: number }) {
  const tone =
    percent >= 80 ? 'bg-[#ff3b30]' : percent >= 50 ? 'bg-[#ff9500]' : 'bg-[#34c759]';

  return (
    <div
      className="dashboard-infra-mini-bar"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('dashboard-infra-mini-bar-fill', tone)}
        style={{ transform: `scaleX(${Math.min(100, percent) / 100})`, width: '100%' }}
      />
    </div>
  );
}

function MetricCapsule({ children }: { children: React.ReactNode }) {
  return (
    <span className="dashboard-infra-capsule">{children}</span>
  );
}

export function InfrastructureSummaryBar({ snapshot, loading, error }: PlatformUsageState) {
  if (loading && !snapshot) {
    return (
      <section className="dashboard-infra-summary mb-8" aria-busy="true" aria-label="云服务用量摘要">
        <div className="h-[52px] animate-pulse rounded-xl bg-black/[0.04]" />
      </section>
    );
  }

  if (error && !snapshot) {
    return (
      <section className="dashboard-infra-summary mb-8" aria-label="云服务用量摘要">
        <div className="dashboard-infra-summary-inner">
          <p className="font-mono text-[12px] text-[#ff3b30]">{error}</p>
          <Link href={adminRoutes.billing} className="dashboard-infra-summary-link">
            查看详细账单与用量 →
          </Link>
        </div>
      </section>
    );
  }

  if (!snapshot) {
    return null;
  }

  const monthSpend = estimateMonthlyCloudSpend(snapshot);
  const notificationsOk =
    snapshot.notifications.telegramConfigured &&
    snapshot.notifications.resendConfigured &&
    snapshot.notifications.quotaHealthy;

  return (
    <section className="dashboard-infra-summary mb-8" aria-label="云服务用量摘要">
      <div className="dashboard-infra-summary-inner">
        <div className="dashboard-infra-summary-metrics">
          <MetricCapsule>
            <span className="dashboard-infra-capsule-label">本月预估</span>
            <span className="dashboard-infra-capsule-value">{formatPlatformUsd(monthSpend)}</span>
          </MetricCapsule>

          <MetricCapsule>
            <span className="dashboard-infra-capsule-label">Supabase DB</span>
            <span className="dashboard-infra-capsule-mono">
              {formatQuotaBytes(snapshot.supabase.databaseBytes)} /{' '}
              {formatQuotaBytes(snapshot.supabase.databaseLimitBytes)}
            </span>
            <MiniProgressBar percent={snapshot.supabase.databasePercent} />
          </MetricCapsule>

          <MetricCapsule>
            <span className="dashboard-infra-capsule-label">Fly.io</span>
            <span className="dashboard-infra-capsule-mono">{formatHours(snapshot.flyio.instanceHours)}</span>
          </MetricCapsule>

          <MetricCapsule>
            <span className="dashboard-infra-capsule-label">通知</span>
            <span
              className={cn(
                'dashboard-infra-capsule-mono',
                notificationsOk ? 'text-[#248a3d]' : 'text-[#86868b]',
              )}
            >
              {notificationsOk ? '服务正常' : '需检查配置'}
            </span>
          </MetricCapsule>
        </div>

        <Link href={adminRoutes.billing} className="dashboard-infra-summary-link shrink-0">
          查看详细账单与用量 →
        </Link>
      </div>
    </section>
  );
}
