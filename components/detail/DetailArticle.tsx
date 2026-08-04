'use client';

import { resolveListingDescription } from '@/lib/i18n/listing-fields';
import type { ListingFieldRow } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';

type DetailArticleProps = {
  listing?: ListingFieldRow;
  isUgc?: boolean;
};

export function DetailArticle({ listing, isUgc }: DetailArticleProps) {
  const { language, messages } = useMessages();

  const resolvedDescription = listing ? resolveListingDescription(listing, language) : null;
  const body =
    resolvedDescription?.trim() ||
    (isUgc ? messages.detail.descriptionFallbackUgc : messages.detail.descriptionFallbackScraped);

  return (
    <article className="flex max-w-none flex-col gap-space-md">
      <section>
        <h2 className="mb-space-sm text-h3 font-semibold text-on-surface">
          {messages.detail.descriptionLabel}
        </h2>
        <p className="text-body-md leading-relaxed text-on-surface-variant">{body}</p>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-low p-space-lg">
        <h3 className="mb-space-md text-label-md font-bold uppercase tracking-widest text-secondary">
          {messages.detail.conditionTitle}
        </h3>
        <ul className="space-y-space-sm">
          {messages.detail.conditionBullets.map((line, index) => (
            <li
              key={line}
              className="flex items-start gap-space-sm text-body-md text-on-surface-variant"
            >
              <span
                className="material-symbols-outlined text-primary"
                style={{
                  fontVariationSettings: index === 2 ? "'FILL' 0" : "'FILL' 1",
                }}
              >
                {index === 2 ? 'info' : 'check_circle'}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-space-md">
        <h2 className="mb-space-sm text-h3 font-semibold text-on-surface">
          {messages.detail.pickupTitle}
        </h2>
        <p className="text-body-md leading-relaxed text-on-surface-variant">
          {messages.detail.pickupBody}
        </p>
      </section>
    </article>
  );
}
