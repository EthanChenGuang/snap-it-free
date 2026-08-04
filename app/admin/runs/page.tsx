import { RunsListClient } from '@/components/admin/RunsListClient';
import { getScrapeRuns } from '@/lib/admin/queries';

export default async function AdminRunsPage() {
  const runs = await getScrapeRuns({ limit: 100 });
  return <RunsListClient initialRuns={runs} />;
}
