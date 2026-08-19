import { SourcesListClient } from '@/components/admin/SourcesListClient';
import { adminShellMessages } from '@/components/admin/admin-messages';
import { getGlobalAdminStatus, getSourcesWithLastRun } from '@/lib/admin/queries';

export default async function AdminSourcesPage() {
  const [sources, globalStatus] = await Promise.all([
    getSourcesWithLastRun(),
    getGlobalAdminStatus(),
  ]);
  const loadFailed = sources.length === 0;

  if (loadFailed) {
    return (
      <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-error">
        {adminShellMessages.loadError}
      </p>
    );
  }

  return (
    <SourcesListClient
      initialSources={sources}
      initialGlobalStatus={
        globalStatus ?? { globalPause: false, lastSyncAt: null, showDegradedBanner: false }
      }
    />
  );
}
