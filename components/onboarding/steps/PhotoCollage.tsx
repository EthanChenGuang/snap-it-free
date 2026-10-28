'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import type { TeaserPhoto } from '@/components/onboarding/useOnboardingData';

/**
 * Hook visual: up to 6 real recent listing photos as rounded tiles with a gentle float-in.
 * Monochrome shell, DESIGN.md radius (rounded-2xl), no shadows. Decorative, so aria-hidden.
 */
export function PhotoCollage({ photos }: { photos: TeaserPhoto[] }) {
  const reduceMotion = useReducedMotion();
  const tiles = photos.slice(0, 6);
  if (tiles.length === 0) {
    return <div className="h-40 rounded-2xl border border-outline-variant bg-surface-container-low" aria-hidden />;
  }

  return (
    <ul className="grid grid-cols-3 gap-space-sm" aria-hidden>
      {tiles.map((photo, index) => (
        <motion.li
          key={photo.key}
          className="relative aspect-square overflow-hidden rounded-2xl bg-surface-container-high"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: reduceMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <ListingPhoto src={photo.url} alt="" variant="thumbnail" sizes="120px" priority />
        </motion.li>
      ))}
    </ul>
  );
}
