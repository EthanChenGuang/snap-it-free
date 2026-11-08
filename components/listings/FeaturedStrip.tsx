'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import type { FeaturedPick } from '@/lib/featured/types';

/** Delay between card reveals (A′ spec: 70 ms stagger). */
export const FEATURED_STAGGER_S = 0.07;

function FeaturedImage({ src, alt, eager }: { src: string; alt: string; eager: boolean }) {
  // The frame's surface colour is the loading placeholder; no load-state gating, so an image that
  // finishes before hydration can never stay hidden.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- self-hosted 400x500 WebP, no optimizer cost
    <img
      src={src}
      alt={alt}
      width={400}
      height={500}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className="block h-full w-full object-cover"
    />
  );
}

/**
 * 今日精选 strip (variant A′): owner-approved studio photos above the feed grid.
 * Text never sits on the image; renders nothing when there are no picks.
 */
export function FeaturedStrip({ picks }: { picks: readonly FeaturedPick[] }) {
  const { messages, language } = useMessages();
  const reduceMotion = useReducedMotion();
  if (picks.length === 0) return null;
  const cityLabels = consumerCityLabelsFromMessages(messages) as Record<string, string>;

  return (
    <section aria-labelledby="featured-strip-title" className="featured-strip -mx-gutter mb-space-lg">
      <header className="flex items-baseline gap-2 px-gutter pb-2.5">
        <h2 id="featured-strip-title" className="flex items-center text-[17px] font-semibold tracking-[-0.01em] text-on-surface">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-orange" aria-hidden />
          {messages.featured.title}
        </h2>
        <span className="text-label-sm text-on-surface-variant">{messages.featured.subtitle(picks.length)}</span>
      </header>
      <ul
        className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-gutter pb-1.5 [scroll-padding-inline:var(--spacing-gutter)]"
      >
        {picks.map((pick, index) => {
          const title = resolveListingTitle(pick, language);
          return (
            <motion.li
              key={pick.id}
              className="min-w-0 shrink-0 grow-0 basis-[40%] snap-start sm:basis-[28%] lg:basis-[20%]"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: Math.min(index, 8) * FEATURED_STAGGER_S }
              }
            >
              <Link href={`/listing/${pick.listing_id}`} prefetch={false} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-surface-container-high shadow-[0_1px_0_rgba(26,28,28,0.04),0_8px_20px_-14px_rgba(26,28,28,0.35)]">
                  <FeaturedImage src={pick.imageUrl} alt={title} eager={index < 2} />
                </div>
                <div className="px-0.5 pt-2">
                  <p className="truncate text-[14px] font-medium text-on-surface">{title}</p>
                  <p className="truncate text-label-sm text-on-surface-variant">
                    {cityLabels[pick.consumer_city] ?? pick.city ?? ''}
                  </p>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
