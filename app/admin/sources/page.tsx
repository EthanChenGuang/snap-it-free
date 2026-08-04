import { SourcesListClient } from '@/components/admin/SourcesListClient';
import { adminShellMessages } from '@/components/admin/admin-messages';
import { getSourcesWithLastRun } from '@/lib/admin/queries';

export default async function AdminSourcesPage() {
  const sources = await getSourcesWithLastRun();
  const loadFailed = sources.length === 0;

  if (loadFailed) {
    return (
      <p className="rounded border border-outline-variant bg-surface-container-low p-4 text-[15px] text-error">
        {adminShellMessages.loadError}
      </p>
    );
  }

  return <SourcesListClient initialSources={sources} />;
}
