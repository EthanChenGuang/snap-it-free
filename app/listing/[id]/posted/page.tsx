import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PostSuccessView } from '@/components/ugc/PostSuccessView';
import { getListingForDetail } from '@/lib/listings/queries';

const listingIdSchema = z.string().uuid();

type PostedPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostedPage({ params }: PostedPageProps) {
  const { id } = await params;
  const parsed = listingIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const result = await getListingForDetail(parsed.data);
  if (!result || !result.isOwnerView || result.listing.source !== 'ugc') {
    notFound();
  }

  return <PostSuccessView listing={result.listing} />;
}
