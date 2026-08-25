import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ScrapedListingShell } from '@/components/detail/ScrapedListingShell';
import { UgcListingShell } from '@/components/detail/UgcListingShell';
import { getListingForDetail, getSimilarListings } from '@/lib/listings/queries';

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
  const similarListings =
    listing.status === 'active'
      ? await getSimilarListings(listing)
      : [];

  if (listing.source === 'ugc') {
    return (
      <UgcListingShell
        listing={listing}
        isOwnerView={isOwnerView}
        similarListings={similarListings}
      />
    );
  }

  if (
    listing.source === 'subito' ||
    listing.source === 'vinted' ||
    listing.source === 'facebook'
  ) {
    return <ScrapedListingShell listing={listing} similarListings={similarListings} />;
  }

  notFound();
}
