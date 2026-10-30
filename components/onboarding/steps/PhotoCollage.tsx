'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { pop } from '@/components/onboarding/pop-theme';
import type { TeaserPhoto } from '@/components/onboarding/useOnboardingData';
import { cn } from '@/lib/utils';

/** Sticker slots (percent of the stage): position, size, tilt and shape. */
const SLOTS = [
  { left: 4, top: 6, size: 30, rotate: -6, round: true },
  { left: 36, top: 0, size: 28, rotate: 4, round: false },
  { left: 68, top: 8, size: 27, rotate: 7, round: true },
  { left: 2, top: 46, size: 31, rotate: 3, round: false },
  { left: 35, top: 40, size: 34, rotate: -3, round: false },
  { left: 71, top: 52, size: 26, rotate: -8, round: true },
] as const;

/**
 * Hook visual: up to 6 real recent listing photos floating like stickers in a sticker book, with a
 * "FREE" starburst and a "€0" tag. Photos are real; the stickers are decoration. aria-hidden.
 */
export function PhotoCollage({ photos, freeLabel }: { photos: TeaserPhoto[]; freeLabel: string }) {
  const reduceMotion = useReducedMotion();
  const tiles = photos.slice(0, SLOTS.length);

  return (
    <div className="relative mx-auto aspect-[1/0.82] w-full max-w-[380px]" aria-hidden data-testid="hook-collage">
      {tiles.length === 0
        ? SLOTS.map((slot, index) => (
            <span
              key={index}
              className={cn('absolute bg-white/70', pop.sticker, slot.round ? 'rounded-full' : 'rounded-3xl')}
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.size}%`,
                aspectRatio: '1',
                rotate: `${slot.rotate}deg`,
              }}
            />
          ))
        : tiles.map((photo, index) => {
            const slot = SLOTS[index];
            return (
              <motion.div
                key={photo.key}
                className={cn(
                  'absolute overflow-hidden bg-white',
                  pop.sticker,
                  slot.round ? 'rounded-full' : 'rounded-3xl',
                )}
                style={{ left: `${slot.left}%`, top: `${slot.top}%`, width: `${slot.size}%`, aspectRatio: '1' }}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.6, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: slot.rotate }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 18,
                  delay: reduceMotion ? 0 : 0.08 + index * 0.07,
                }}
              >
                <ListingPhoto src={photo.url} alt="" variant="thumbnail" sizes="140px" priority />
              </motion.div>
            );
          })}

      <motion.span
        className={cn(
          'absolute left-[26%] top-[30%] z-10 flex items-center gap-1 rounded-full bg-[#FFC83D] px-3 py-1.5 text-[15px] font-black uppercase text-[#1A1A2E]',
          pop.outline,
          pop.shadowSm,
        )}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.4, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: -10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14, delay: reduceMotion ? 0 : 0.55 }}
      >
        ★ {freeLabel}
      </motion.span>
      <motion.span
        className={cn(
          'absolute bottom-[4%] right-[30%] z-10 rounded-full bg-[#00A6A6] px-3 py-1 text-[16px] font-black text-white',
          pop.outline,
          pop.shadowSm,
        )}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1, rotate: 8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14, delay: reduceMotion ? 0 : 0.7 }}
      >
        €0
      </motion.span>
      <Sparkle className="left-[60%] top-[34%] h-6 w-6 text-[#00A6A6]" />
      <Sparkle className="left-[90%] top-[42%] h-4 w-4 text-[#F2512D]" />
      <Sparkle className="left-[2%] top-[88%] h-5 w-5 text-[#FFC83D]" />
    </div>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('pointer-events-none absolute', className)} aria-hidden>
      <path fill="currentColor" d="M12 0c.8 6.4 3.6 9.2 12 12-8.4 2.8-11.2 5.6-12 12-.8-6.4-3.6-9.2-12-12 8.4-2.8 11.2-5.6 12-12Z" />
    </svg>
  );
}
