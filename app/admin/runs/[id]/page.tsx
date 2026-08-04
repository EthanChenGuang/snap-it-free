import { notFound } from 'next/navigation';
import { RunDetailClient } from '@/components/admin/RunDetailClient';
import { getScrapeRunById } from '@/lib/admin/queries';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const run = await getScrapeRunById(id);

  if (!run) {
    notFound();
  }

  return <RunDetailClient run={run} />;
}
