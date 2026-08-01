import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ScrapedListingShell } from '@/components/detail/ScrapedListingShell';
import { UgcListingShell } from '@/components/detail/UgcListingShell';
import { getListingForDetail } from '@/lib/listings/queries';

const listingIdSchema = z.string().uuid();

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const parsed = listingIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const result = await getListingForDetail(parsed.data);
  if (!result) {
    notFound();
  }

  const { listing, isOwnerView } = result;

  if (listing.source === 'ugc') {
    return <UgcListingShell listing={listing} isOwnerView={isOwnerView} />;
  }

  if (listing.source === 'subito') {
    return <ScrapedListingShell listing={listing} />;
  }

  notFound();
}
