import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ScrapedListingShell } from '@/components/detail/ScrapedListingShell';
import { getListingById } from '@/lib/listings/queries';

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

  const listing = await getListingById(parsed.data);
  if (!listing || listing.source !== 'subito') {
    notFound();
  }

  return <ScrapedListingShell listing={listing} />;
}
