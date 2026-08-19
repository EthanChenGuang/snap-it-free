'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SourceCard, SourceCardSkeleton } from '@/components/admin/SourceCard';
import { adminShellMessages, sourcesMessages } from '@/components/admin/admin-messages';
import type { GlobalAdminStatus, SourceWithLastRun } from '@/lib/admin/types';
import { cn } from '@/lib/utils';

type SourcesListClientProps = {
  initialSources: SourceWithLastRun[];
  initialGlobalStatus: GlobalAdminStatus;
};

function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="sources-refresh-btn"
      aria-label={sourcesMessages.refreshList}
    >
      <span
        className={cn(
          'material-symbols-outlined text-[18px]',
          loading && 'animate-spin',
        )}
        aria-hidden
      >
        refresh
      </span>
      <span>{sourcesMessages.refreshList}</span>
    </button>
  );
}

export function SourcesListClient({
  initialSources,
  initialGlobalStatus,
}: SourcesListClientProps) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingToggleSlug, setPendingToggleSlug] = useState<string | null>(null);
  const globalPause = initialGlobalStatus.globalPause;

  const refreshSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/sources');
      if (!response.ok) {
        throw new Error('load failed');
      }
      const payload = (await response.json()) as { sources: SourceWithLastRun[] };
      setSources(payload.sources);
      router.refresh();
    } catch {
      setError(adminShellMessages.loadError);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleRunComplete = useCallback(() => {
    router.refresh();
    void refreshSources();
  }, [router, refreshSources]);

  const handleToggle = async (slug: string, enabled: boolean) => {
    const previous = sources.find((source) => source.slug === slug)?.enabled;
    if (previous === enabled) {
      return;
    }

    setPendingToggleSlug(slug);
    setSources((prev) =>
      prev.map((source) => (source.slug === slug ? { ...source, enabled } : source)),
    );

    try {
      const response = await fetch(`/api/admin/sources/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error('toggle failed');
      }
    } catch {
      setSources((prev) =>
        prev.map((source) =>
          source.slug === slug && previous != null ? { ...source, enabled: previous } : source,
        ),
      );
      setError(adminShellMessages.loadError);
    } finally {
      setPendingToggleSlug(null);
    }
  };

  const orderedSources = [...sources].sort((a, b) => {
    if (a.slug === 'subito') return -1;
    if (b.slug === 'subito') return 1;
    return a.slug.localeCompare(b.slug);
  });

  return (
    <div className="sources-grid-page -mx-6 -mt-2 font-[system-ui,-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',sans-serif]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.08] bg-[#f5f5f7]/80 px-6 py-4 backdrop-blur-sm">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            {sourcesMessages.pageTitle}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#86868b]">
            {globalPause ? sourcesMessages.globalPauseHint : sourcesMessages.sectionHeading}
          </p>
        </div>
        <RefreshButton loading={loading} onClick={() => void refreshSources()} />
      </header>

      <div className="space-y-4 px-6 py-4">
        {error ? (
          <p className="rounded-lg border border-red-200/60 bg-red-50/60 p-3.5 text-[14px] text-red-800">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <SourceCardSkeleton key={index} />)
            : orderedSources.map((source) => (
                <SourceCard
                  key={source.slug}
                  source={source}
                  globalPause={globalPause}
                  toggleBusy={pendingToggleSlug === source.slug}
                  onToggleEnabled={handleToggle}
                  onRunComplete={handleRunComplete}
                />
              ))}
        </div>
      </div>
    </div>
  );
}
