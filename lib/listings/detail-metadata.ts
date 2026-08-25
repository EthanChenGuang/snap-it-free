import { buildCardMetadata } from '@/lib/listings/card-metadata';
import type { ListingRow } from '@/lib/listings/types';
import type { Messages } from '@/messages';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { listingConsumerCityLabel } from '@/lib/listings/feed-search';

type BuildDetailMetadataInput = {
  listing: ListingRow;
  postedLabel: string;
  messages: Messages;
};

/** Secondary line under title: posted · reserved (matches feed cards). */
export function buildDetailMetadataLine(input: BuildDetailMetadataInput): string {
  const { listing, postedLabel, messages } = input;

  return buildCardMetadata({
    postedLabel,
    isClaimed: listing.status === 'claimed',
    reservedLabel: messages.listing.reserved,
  });
}

type SourceLabelInput = {
  source: ListingRow['source'];
  messages: Messages;
};

export function listingSourceLabel({ source, messages }: SourceLabelInput): string | null {
  if (source === 'subito') return messages.listing.sourceSubito;
  if (source === 'vinted') return messages.listing.sourceVinted;
  if (source === 'facebook') return messages.listing.sourceFacebook;
  return null;
}

type DetailCtaLabelInput = {
  source: ListingRow['source'];
  isUgc: boolean;
  messages: Messages;
};

export function detailPrimaryCtaLabel({ source, isUgc, messages }: DetailCtaLabelInput): string {
  if (isUgc) return messages.detail.messageOwner;
  if (source === 'subito') return messages.detail.snagIt;
  if (source === 'vinted') return messages.detail.openOnVinted;
  if (source === 'facebook') return messages.detail.openOnFacebook;
  return messages.detail.snagIt;
}

type PickupHintInput = {
  listing: ListingRow;
  messages: Messages;
};

/** Real pickup hint from city/zone/source — no fabricated schedules. */
export function buildPickupHint({ listing, messages }: PickupHintInput): string | null {
  if (listing.source === 'ugc') {
    return messages.detail.pickupHintUgc;
  }

  const cityLabel = listingConsumerCityLabel(
    listing,
    consumerCityLabelsFromMessages(messages),
  );
  if (cityLabel) {
    return messages.detail.pickupInCity.replace('{city}', cityLabel);
  }

  const source = listingSourceLabel({ source: listing.source, messages });
  if (source) {
    return messages.detail.arrangeOnSource.replace('{source}', source);
  }

  return null;
}
