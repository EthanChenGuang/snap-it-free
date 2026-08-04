'use client';

import { messages } from '@/messages/it';

type DetailArticleProps = {
  description?: string | null;
  isUgc?: boolean;
};

export function DetailArticle({ description, isUgc }: DetailArticleProps) {
  const body =
    description?.trim() ||
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
