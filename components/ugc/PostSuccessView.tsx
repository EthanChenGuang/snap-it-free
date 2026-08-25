'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toaster';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { shareListing } from '@/lib/listings/share';
import type { ListingRow, OwnerListingRow } from '@/lib/listings/types';
import { parseUgcDescriptionMeta } from '@/lib/ugc/description-meta';
import { useMessages } from '@/lib/i18n/useMessages';

type PostSuccessViewProps = {
  listing: (ListingRow | OwnerListingRow) & { description?: string | null };
};

export function PostSuccessView({ listing }: PostSuccessViewProps) {
  const router = useRouter();
  const { language, messages } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const { categoryLabel, conditionLabel } = parseUgcDescriptionMeta(
    listing.description,
    messages,
  );

  const goToList = () => {
    router.replace('/');
  };

  const goToDetail = () => {
    router.replace(`/listing/${listing.id}`);
  };

  const handleShare = async () => {
    const result = await shareListing(listing);
    if (result === 'copied') {
      toast(messages.detail.shareCopied);
    } else if (result === 'shared') {
      toast(messages.detail.shareShared);
    } else if (result === 'failed') {
      toast(messages.detail.shareFailed);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#F8F9FA]">
      <header className="flex shrink-0 items-center justify-between px-gutter py-space-md">
        <button
          type="button"
          onClick={goToList}
          className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-on-surface transition-opacity active:opacity-70"
          aria-label={messages.post.success.close}
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-on-surface transition-opacity active:opacity-70"
          aria-label={messages.detail.share}
        >
          <span className="material-symbols-outlined text-[24px]">share</span>
        </button>
      </header>

      <div className="flex flex-1 flex-col px-gutter pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <section className="pb-space-lg pt-space-sm text-center">
          <div
            className="mx-auto mb-space-md flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF3]"
            aria-hidden
          >
            <span className="material-symbols-outlined text-[32px] text-[#16A34A]">
              check_circle
            </span>
          </div>
          <h1 className="text-h3 font-semibold tracking-tight text-on-surface">
            {messages.post.success.title}
          </h1>
          <p className="mt-space-xs text-body-md text-on-surface-variant">
            {messages.post.success.subtitle}
          </p>
        </section>

        <article className="flex gap-space-md rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-space-md shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-container-low">
            {listing.photo_url ? (
              <Image
                src={listing.photo_url}
                alt={displayTitle}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[28px]">image</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-label-md font-semibold text-on-surface">
              {displayTitle}
            </h2>
            <div className="mt-space-sm flex flex-wrap gap-space-xs">
              {categoryLabel ? (
                <span className="rounded-full bg-[#f1f1f0] px-space-sm py-0.5 text-label-sm text-on-surface-variant">
                  {categoryLabel}
                </span>
              ) : null}
              {conditionLabel ? (
                <span className="rounded-full bg-[#f1f1f0] px-space-sm py-0.5 text-label-sm text-on-surface-variant">
                  {conditionLabel}
                </span>
              ) : null}
              <span className="rounded-full bg-[#ECFDF3] px-space-sm py-0.5 text-label-sm font-medium text-[#16A34A]">
                {messages.detail.costFreeLabel.replace('.', '')}
              </span>
            </div>
          </div>
        </article>

        <div className="mt-auto flex flex-col gap-space-sm pt-space-xl">
          <button
            type="button"
            onClick={goToList}
            className="min-h-12 w-full rounded-lg bg-primary px-space-md py-space-sm text-label-md font-semibold text-on-primary transition-opacity active:opacity-90"
          >
            {messages.post.success.backToList}
          </button>
          <button
            type="button"
            onClick={goToDetail}
            className="min-h-12 w-full rounded-lg px-space-md py-space-sm text-label-md font-medium text-on-surface-variant transition-opacity active:opacity-70"
          >
            {messages.post.success.viewListing}
          </button>
        </div>
      </div>
    </div>
  );
}
