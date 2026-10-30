import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ListingDetailSkeleton } from '@/components/detail/ListingDetailSkeleton';
import { z } from 'zod';
import { ScrapedListingShell } from '@/components/detail/ScrapedListingShell';
import { UgcListingShell } from '@/components/detail/UgcListingShell';
import { LockedPanel } from '@/components/onboarding/LockedViews';
import { buildListingMetadata } from '@/lib/listings/listing-metadata';
import {
  getListingById,
  getListingForDetail,
  getOwnerListingById,
  getSimilarListings,
} from '@/lib/listings/queries';
import { getListingAccess } from '@/lib/paywall/server-access';
import { getMessages } from '@/messages';

const listingIdSchema = z.string().uuid();

type ListingPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function serializeSearchParams(
  params: Record<string, string | string[] | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) sp.append(key, item);
    } else {
      sp.set(key, value);
    }
  }
  return sp.toString();
}

/** Public OG/Twitter tags for share previews — anon read only, no auth (D-19 #13). */
export async function generateMetadata({
  params,
}: Pick<ListingPageProps, 'params'>): Promise<Metadata> {
  const { id } = await params;
  const parsed = listingIdSchema.safeParse(id);
  if (!parsed.success) return {};

  const listing = await getListingById(parsed.data);
  if (!listing) return {};

  const { app } = getMessages('zh');
  return buildListingMetadata(listing, { name: app.title, description: app.description });
}

export default async function ListingPage({ params, searchParams }: ListingPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const searchParamsString = serializeSearchParams(resolvedSearchParams);
  const openDm = resolvedSearchParams.openDm === '1';
  const parsed = listingIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  // Locked: only the author's own listing renders. Under the 044 RLS gate a non-subscriber cannot read
  // other rows at all, so asking first shows the lock instead of a 404 and never fetches the listing.
  const locked = (await getListingAccess(resolvedSearchParams)) === 'locked';
  const ownListing = locked ? await getOwnerListingById(parsed.data) : null;
  if (locked && !ownListing) {
    return <LockedPanel variant="detail" />;
  }

  const result = ownListing
    ? { listing: ownListing, isOwnerView: true }
    : await getListingForDetail(parsed.data);
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
      <Suspense fallback={<ListingDetailSkeleton />}>
        <UgcListingShell
          listing={listing}
          isOwnerView={isOwnerView}
          similarListings={similarListings}
          searchParamsString={searchParamsString}
          openDm={openDm}
        />
      </Suspense>
    );
  }

  if (
    listing.source === 'subito' ||
    listing.source === 'vinted' ||
    listing.source === 'wallapop' ||
    listing.source === 'facebook'
  ) {
    return (
      <Suspense fallback={<ListingDetailSkeleton />}>
        <ScrapedListingShell
          listing={listing}
          similarListings={similarListings}
          searchParamsString={searchParamsString}
        />
      </Suspense>
    );
  }

  notFound();
}
