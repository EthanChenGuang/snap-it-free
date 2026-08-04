import { RejectsClient } from '@/components/admin/RejectsClient';
import { getScrapeRejects } from '@/lib/admin/queries';

type PageProps = {
  searchParams: Promise<{ run_id?: string }>;
};

export default async function AdminRejectsPage({ searchParams }: PageProps) {
  const { run_id: runId } = await searchParams;
  const rejects = await getScrapeRejects({
    runId: runId,
    limit: 200,
  });

  return <RejectsClient initialRejects={rejects} initialRunId={runId} />;
}
