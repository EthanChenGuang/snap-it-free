'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SourceCard } from '@/components/admin/SourceCard';
import { CoreHealthSection } from '@/components/admin/CoreHealthSection';
import { DashboardSectionHeader } from '@/components/admin/DashboardSectionHeader';
import { useMaintenance } from '@/components/admin/MaintenanceCard';
import { InfrastructureSummaryBar } from '@/components/admin/InfrastructureSummaryBar';
import { usePlatformUsage } from '@/components/admin/PlatformUsageGrid';
import { DegradedBanner } from '@/components/admin/DegradedBanner';
import { ThresholdAlertBanner } from '@/components/admin/ThresholdAlertBanner';
import { adminRoutes } from '@/lib/admin/dashboard-links';
import { adminShellMessages } from '@/components/admin/admin-messages';
import type { AdminAlert, GlobalAdminStatus, SourceWithLastRun } from '@/lib/admin/types';

type DashboardClientProps = {
  initialSources: SourceWithLastRun[];
  initialGlobalStatus: GlobalAdminStatus;
  initialAlerts: AdminAlert[];
};

export function DashboardClient({
  initialSources,
  initialGlobalStatus,
  initialAlerts,
}: DashboardClientProps) {
  const router = useRouter();
  const [globalPause, setGlobalPause] = useState(initialGlobalStatus.globalPause);
  const lastSyncAt = initialGlobalStatus.lastSyncAt;
  const showDegradedBanner = initialGlobalStatus.showDegradedBanner;
  const [sources, setSources] = useState(initialSources);
  const [pauseSaving, setPauseSaving] = useState(false);
  const maintenance = useMaintenance(null);
  const platformUsage = usePlatformUsage();
  const [thresholdBannerDismissed, setThresholdBannerDismissed] = useState(false);

  const orderedSources = [...sources].sort((a, b) => {
    if (a.slug === 'subito') return -1;
    if (b.slug === 'subito') return 1;
    return a.slug.localeCompare(b.slug);
  });

  const handleGlobalPauseToggle = useCallback(async () => {
    setPauseSaving(true);
    const next = !globalPause;
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_pause: next }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        config: { global_pause: boolean };
      };
      setGlobalPause(payload.config.global_pause);
      router.refresh();
    } finally {
      setPauseSaving(false);
    }
  }, [globalPause, router]);

  const handleToggleEnabled = useCallback(
    async (slug: string, enabled: boolean) => {
      const response = await fetch(`/api/admin/sources/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        return;
      }

      setSources((current) =>
        current.map((source) => (source.slug === slug ? { ...source, enabled } : source)),
      );
      router.refresh();
    },
    [router],
  );

  const handleRunComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="dashboard-console">
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title">抓取管理</h1>
        <p className="dashboard-page-subtitle">Scraper Worker · Admin Console</p>
      </header>

      {showDegradedBanner ? (
        <div className="mb-6" data-testid="degraded-banner">
          <DegradedBanner showSettingsLink />
        </div>
      ) : null}

      <ThresholdAlertBanner
        alerts={platformUsage.alerts}
        dismissed={thresholdBannerDismissed}
        onDismiss={() => setThresholdBannerDismissed(true)}
      />

      <CoreHealthSection
        globalPause={globalPause}
        pauseSaving={pauseSaving}
        lastSyncAt={lastSyncAt}
        alerts={initialAlerts}
        maintenance={maintenance}
        onGlobalToggle={handleGlobalPauseToggle}
      />

      <InfrastructureSummaryBar {...platformUsage} />

      <section className="dashboard-sources-section" aria-label="数据源">
        <DashboardSectionHeader
          title="数据源"
          subtitle="监控各平台抓取 Worker 运行状态"
          titleHref={adminRoutes.sources}
        />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedSources.map((source) => (
            <SourceCard
              key={source.slug}
              source={source}
              globalPause={globalPause}
              variant="compact"
              onToggleEnabled={handleToggleEnabled}
              onRunComplete={handleRunComplete}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-console">
      <div className="mb-6 h-14 animate-pulse rounded-xl bg-black/[0.04]" />
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-3 lg:col-span-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="dashboard-compact-tile h-[88px] animate-pulse bg-black/[0.04]" />
          ))}
        </div>
        <div className="h-[300px] animate-pulse rounded-xl bg-black/[0.04] lg:col-span-7" />
      </div>
      <div className="mb-8 h-[52px] animate-pulse rounded-xl bg-black/[0.04]" />
      <div className="border-t border-black/[0.05] pt-8">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-black/[0.04]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-black/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardLoadError() {
  return (
    <p className="rounded-xl border border-black/[0.05] bg-white p-4 text-[15px] text-[#ff3b30]">
      {adminShellMessages.loadError}
    </p>
  );
}
