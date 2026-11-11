'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { pop } from '@/components/onboarding/pop-theme';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { cn } from '@/lib/utils';

/**
 * A lock-screen-style stack of example notifications, explicitly labelled "Example" so it is never
 * mistaken for real matches (honesty rule — no fabricated live alerts before the user has any).
 * Thumbnails, when given, are real recent listing photos used only as decoration.
 */
export function AlertsMock({
  label,
  lines,
  appName,
  photos = [],
}: {
  label: string;
  lines: string[];
  appName: string;
  photos?: string[];
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative mt-space-lg pr-2" aria-hidden data-testid="alerts-mock">
      <div
        className={cn(
          'relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#7FD3E8] via-[#BFE7E4] to-[#FFE6A8] px-space-md pb-space-md pt-space-lg',
          pop.outline,
          pop.shadow,
        )}
      >
        <p className="text-center text-[44px] font-[family-name:var(--font-pop)] font-extrabold leading-none text-white [text-shadow:0_2px_0_rgba(26,26,46,0.25)]">
          9:41
        </p>
        <ul className="mt-space-md flex flex-col gap-space-sm">
          {lines.map((line, index) => (
            <motion.li
              key={index}
              className={cn('flex items-center gap-space-sm rounded-2xl bg-white/95 px-space-sm py-space-sm', pop.outline)}
              initial={reduceMotion ? false : { opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.15 + index * 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2512D] text-[13px] font-black text-white">
                0€
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#4A4A5E]">{appName}</span>
                <span className="block truncate text-body-md font-semibold text-[#1A1A2E]">{line}</span>
              </span>
              {photos[index] ? (
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  <ListingPhoto src={photos[index]} alt="" variant="thumbnail" sizes="40px" />
                </span>
              ) : null}
            </motion.li>
          ))}
        </ul>
      </div>
      <span
        className={cn(
          'absolute -right-1 -top-3 rotate-6 rounded-full bg-[#FFC83D] px-3 py-1 text-label-sm font-bold uppercase text-[#1A1A2E]',
          pop.outline,
          pop.shadowSm,
        )}
      >
        {label}
      </span>
      <motion.span
        className={cn(
          'absolute -bottom-5 -left-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#F2512D] text-white',
          pop.outline,
          pop.shadowSm,
        )}
        initial={reduceMotion ? false : { rotate: -18 }}
        animate={reduceMotion ? undefined : { rotate: [-18, 12, -10, 6, -12] }}
        transition={{ duration: 1.2, delay: 0.6, ease: 'easeInOut' }}
      >
        <SymbolIcon name="notifications_active" className="text-[30px]" />
      </motion.span>
    </div>
  );
}
