import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/runs?id=${encodeURIComponent(id)}`);
}
