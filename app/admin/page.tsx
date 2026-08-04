import { Suspense } from 'react';
import {
  DashboardClient,
  DashboardLoadError,
  DashboardSkeleton,
} from '@/components/admin/DashboardClient';
import {
  getGlobalAdminStatus,
  getPendingTranslationCount,
  getRecentAlerts,
  getSourcesWithLastRun,
} from '@/lib/admin/queries';

async function DashboardContent() {
  const [sources, alerts, globalStatus, pendingTranslationCount] = await Promise.all([
    getSourcesWithLastRun(),
    getRecentAlerts(),
    getGlobalAdminStatus(),
    getPendingTranslationCount(),
  ]);

  if (globalStatus === null) {
    return <DashboardLoadError />;
  }

  return (
    <DashboardClient
      initialSources={sources}
      initialGlobalStatus={globalStatus}
      initialAlerts={alerts}
      pendingTranslationCount={pendingTranslationCount}
    />
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
