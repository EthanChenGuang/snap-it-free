import { notFound } from 'next/navigation';
import { SourceDetailClient } from '@/components/admin/SourceDetailClient';
import { getSourceBySlug } from '@/lib/admin/queries';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminSourceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const source = await getSourceBySlug(slug);

  if (!source) {
    notFound();
  }

  return <SourceDetailClient initialSource={source} />;
}
