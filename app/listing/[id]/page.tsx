import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ScrapedListingShell } from '@/components/detail/ScrapedListingShell';
import { UgcListingShell } from '@/components/detail/UgcListingShell';
import { getActiveListings, getListingForDetail } from '@/lib/listings/queries';
import type { ListingRow } from '@/lib/listings/types';

const listingIdSchema = z.string().uuid();

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

function pickSimilarListings(all: ListingRow[], current: ListingRow, limit = 3): ListingRow[] {
  const others = all.filter((item) => item.id !== current.id && item.status === 'active');
  const sameZone = current.zone
    ? others.filter((item) => item.zone === current.zone)
    : others;
  const pool = sameZone.length >= limit ? sameZone : others;
  return pool.slice(0, limit);
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const parsed = listingIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const [result, allListings] = await Promise.all([
    getListingForDetail(parsed.data),
    getActiveListings(),
  ]);

  if (!result) {
    notFound();
  }

  const { listing, isOwnerView } = result;
  const similarListings = pickSimilarListings(allListings, listing);

  if (listing.source === 'ugc') {
    return (
      <UgcListingShell
        listing={listing}
        isOwnerView={isOwnerView}
        similarListings={similarListings}
      />
    );
  }

  if (listing.source === 'subito') {
    return <ScrapedListingShell listing={listing} similarListings={similarListings} />;
  }

  notFound();
}
