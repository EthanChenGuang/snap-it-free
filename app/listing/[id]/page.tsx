import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ListingDetailSkeleton } from '@/components/detail/ListingDetailSkeleton';
import { z } from 'zod';
import { ScrapedListingShell } from '@/components/detail/ScrapedListingShell';
import { UgcListingShell } from '@/components/detail/UgcListingShell';
import { LockedPanel } from '@/components/onboarding/LockedViews';
import { getListingForDetail, getSimilarListings } from '@/lib/listings/queries';
import { getListingAccess } from '@/lib/paywall/server-access';

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

export default async function ListingPage({ params, searchParams }: ListingPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const searchParamsString = serializeSearchParams(resolvedSearchParams);
  const openDm = resolvedSearchParams.openDm === '1';
  const parsed = listingIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const result = await getListingForDetail(parsed.data);
  if (!result) {
    notFound();
  }

  const { listing, isOwnerView } = result;
  if (!isOwnerView && (await getListingAccess(resolvedSearchParams)) === 'locked') {
    return <LockedPanel variant="detail" />;
  }
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
