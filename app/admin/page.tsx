import { Suspense } from 'react';
import {
  DashboardClient,
  DashboardLoadError,
  DashboardSkeleton,
} from '@/components/admin/DashboardClient';
import {
  getGlobalAdminStatus,
  getRecentAlerts,
  getSourcesWithLastRun,
} from '@/lib/admin/queries';

async function DashboardContent() {
  const [sources, alerts, globalStatus] = await Promise.all([
    getSourcesWithLastRun(),
    getRecentAlerts(),
    getGlobalAdminStatus(),
  ]);

  if (globalStatus === null) {
    return <DashboardLoadError />;
  }

  return (
    <DashboardClient
      initialSources={sources}
      initialGlobalStatus={globalStatus}
      initialAlerts={alerts}
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
