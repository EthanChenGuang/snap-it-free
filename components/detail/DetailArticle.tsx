'use client';

import { resolveListingDescription } from '@/lib/i18n/listing-fields';
import type { ListingFieldRow } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';

type DetailArticleProps = {
  listing?: ListingFieldRow;
  isUgc?: boolean;
};

/** Real listing description only — no fabricated condition or pickup sections. */
export function DetailArticle({ listing, isUgc }: DetailArticleProps) {
  const { language, messages } = useMessages();

  const resolvedDescription = listing ? resolveListingDescription(listing, language) : null;
  const body =
    resolvedDescription?.trim() ||
    (isUgc ? messages.detail.descriptionFallbackUgc : null);

  if (!body) return null;

  return (
    <article className="rounded-lg border border-outline-variant bg-surface-container-lowest px-space-md py-space-md text-center">
      <p className="whitespace-pre-line text-body-md leading-relaxed text-on-surface-variant">
        {body}
      </p>
    </article>
  );
}
