import { Suspense } from 'react';
import { RunsListClient } from '@/components/admin/RunsListClient';
import { parseRunsListFilter } from '@/lib/admin/dashboard-links';
import { reconcileOrphanScrapeRuns } from '@/lib/admin/orphan-runs';
import { getScrapeRuns } from '@/lib/admin/queries';
import { createServiceClient } from '@/lib/supabase/service';

type PageProps = {
  searchParams: Promise<{ id?: string; days?: string; filter?: string }>;
};

function parseSinceDays(value: string | undefined): number {
  const parsed = Number(value);
  if (parsed === 14 || parsed === 30) {
    return parsed;
  }
  return 7;
}

async function RunsPageContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const sinceDays = parseSinceDays(params.days);
  const initialQuickFilter = parseRunsListFilter(params.filter);

  try {
    await reconcileOrphanScrapeRuns(createServiceClient());
  } catch (err) {
    console.error('[admin/runs] orphan reconcile failed:', err);
  }

  const runs = await getScrapeRuns({ limit: 100, sinceDays });

  return (
    <RunsListClient
      initialRuns={runs}
      initialSelectedId={params.id ?? null}
      initialSinceDays={sinceDays}
      initialQuickFilter={initialQuickFilter}
    />
  );
}

export default function AdminRunsPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[480px] items-center justify-center text-[14px] text-[#86868b]">
          加载运行记录…
        </div>
      }
    >
      <RunsPageContent {...props} />
    </Suspense>
  );
}
