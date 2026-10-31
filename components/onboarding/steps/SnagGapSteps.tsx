'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { pop } from '@/components/onboarding/pop-theme';
import { Sparkle } from '@/components/onboarding/steps/PhotoCollage';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import type { ListingRow } from '@/lib/listings/types';
import type { DailyCount, MapTeaser } from '@/lib/paywall/onboarding-stats';
import { cn } from '@/lib/utils';

/**
 * Visuals for the three screens added to match Snag's onboarding shape (quick 261031-ob4):
 * weekly volume, items on a map, saving favourites. Lagoon Pop UI (Stitch project 9058658661756179433),
 * our own copy, and only real figures from the live rows. No source names anywhere.
 */

const BAR_FILLS = ['bg-[#DDF0FF]', 'bg-[#EAE2FF]', 'bg-[#D6F5E6]', 'bg-[#FFF2B8]', 'bg-[#FFE3D3]', 'bg-[#FFE3EC]'] as const;

function localeTag(language: string): string {
  return language === 'it' ? 'it-IT' : language === 'zh' ? 'zh-CN' : 'en-US';
}

export function WeeklyVolume({
  total,
  daily,
  newestIso,
  cityCount,
}: {
  total: number;
  daily: DailyCount[];
  newestIso: string | null;
  cityCount: number;
}) {
  const { messages, language, formatRelativeTime } = useMessages();
  const copy = messages.onboarding.weekly;
  const reduceMotion = useReducedMotion();
  const max = Math.max(1, ...daily.map((day) => day.count));
  const today = daily[daily.length - 1]?.count ?? 0;
  const weekday = new Intl.DateTimeFormat(localeTag(language), { weekday: 'narrow' });

  return (
    <div data-testid="onboarding-weekly">
      <div className={cn('relative mt-space-lg p-space-lg', pop.card)}>
        <span className="absolute -right-2 -top-3 rotate-3 rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2.5 py-0.5 text-[11px] font-black uppercase text-[#1A1A2E]">
          ● Live
        </span>
        <p className={cn(pop.display, 'text-[56px] leading-none text-[#F2512D]')} data-testid="weekly-total">
          {total.toLocaleString(localeTag(language))}
        </p>
        <p className="mt-space-xs text-body-md font-semibold text-[#1A1A2E]">{copy.statCaption(total)}</p>
      </div>

      <div className={cn('mt-space-md p-space-md', pop.card)} aria-hidden>
        <div className="flex items-center justify-between gap-space-sm">
          <p className="text-label-sm font-black uppercase tracking-wide text-[#1A1A2E]">{copy.chartTitle}</p>
          <span className="rounded-full border-2 border-[#1A1A2E] bg-[#F2512D] px-2.5 py-0.5 text-label-sm font-bold text-white">
            {copy.today(today)}
          </span>
        </div>
        <div className="mt-space-md flex h-32 items-end gap-1.5">
          {daily.map((day, index) => {
            const isToday = index === daily.length - 1;
            const height = Math.max(8, Math.round((day.count / max) * 100));
            return (
              <div key={day.dayStart} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className={cn('text-[11px] font-bold', isToday ? 'text-[#F2512D]' : 'text-[#4A4A5E]')}>{day.count}</span>
                <motion.div
                  className={cn(
                    'w-full rounded-t-xl border-2 border-[#1A1A2E]',
                    isToday ? 'bg-[#F2512D]' : BAR_FILLS[index % BAR_FILLS.length],
                  )}
                  style={{ height: `${height}%`, transformOrigin: 'bottom' }}
                  initial={reduceMotion ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
                <span className={cn('text-[11px] font-black', isToday ? 'text-[#F2512D]' : 'text-[#1A1A2E]')}>
                  {weekday.format(new Date(day.dayStart))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-space-md flex flex-wrap gap-space-sm">
        {newestIso && (
          <span className={cn(pop.pill, 'bg-[#D6F5E6]')}>
            <SymbolIcon name="bolt" className="text-[16px] text-[#00A6A6]" />
            {copy.newest(formatRelativeTime(newestIso))}
          </span>
        )}
        {cityCount > 0 && (
          <span className={cn(pop.pill, 'bg-[#FFF2B8]')}>
            <SymbolIcon name="location_on" className="text-[16px] text-[#F2512D]" />
            {copy.cities(cityCount)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Real pins at their real relative positions over a decorative water/land backdrop. */
export function NearbyMap({ teaser, cityLabel }: { teaser: MapTeaser; cityLabel: string }) {
  const { messages, language, formatRelativeTime } = useMessages();
  const reduceMotion = useReducedMotion();
  const [focusId, setFocusId] = useState(teaser.pins[0]?.id ?? null);
  const focus = teaser.pins.find((pin) => pin.id === focusId) ?? teaser.pins[0];

  return (
    <div data-testid="onboarding-map">
      <div className={cn('relative mt-space-lg overflow-hidden', pop.card, 'bg-[#CFEFF5]')}>
        <div className="relative aspect-[4/3] w-full">
          <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d="M-10 70 C 60 30, 140 60, 190 40 S 330 10, 410 50 V-10 H-10Z" fill="#F5EEDC" stroke="#1A1A2E" strokeOpacity="0.15" strokeWidth="2" />
            <path d="M30 150 C 70 110, 150 120, 180 150 S 150 230, 90 225 S 0 190, 30 150Z" fill="#F5EEDC" stroke="#1A1A2E" strokeOpacity="0.15" strokeWidth="2" />
            <path d="M220 120 C 270 90, 360 100, 380 150 S 340 230, 270 225 S 180 160, 220 120Z" fill="#F5EEDC" stroke="#1A1A2E" strokeOpacity="0.15" strokeWidth="2" />
            <path d="M-10 270 C 80 245, 170 290, 260 262 S 380 250, 410 270 V310 H-10Z" fill="#F5EEDC" stroke="#1A1A2E" strokeOpacity="0.15" strokeWidth="2" />
            <path d="M0 105 C 120 95, 250 210, 400 200" stroke="#9DD6E2" strokeWidth="6" strokeDasharray="10 10" fill="none" />
          </svg>

          <span className={cn(pop.pill, 'absolute left-2 top-2 z-10 bg-white text-[11px]')}>
            <span className="h-2 w-2 rounded-full bg-[#F2512D]" aria-hidden />
            {cityLabel}
          </span>

          {teaser.pins.map((pin, index) => {
            const active = pin.id === focus?.id;
            return (
              <motion.button
                key={pin.id}
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => setFocusId(pin.id)}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[#1A1A2E] bg-[#F2512D] p-0.5',
                  active ? 'z-20 h-11 w-11 shadow-[2px_2px_0_#1A1A2E]' : 'z-10 h-8 w-8',
                )}
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.05 * index, type: 'spring', stiffness: 380, damping: 22 }}
              >
                <span className="relative block h-full w-full overflow-hidden rounded-full">
                  <ListingPhoto src={pin.photoUrl} alt="" variant="thumbnail" sizes="44px" />
                </span>
              </motion.button>
            );
          })}
        </div>

        {focus && (
          <div className="flex items-center gap-space-sm border-t-2 border-[#1A1A2E] bg-white p-space-sm" aria-hidden>
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-[#1A1A2E] bg-[#F3E2CF]">
              <ListingPhoto src={focus.photoUrl} alt="" variant="thumbnail" sizes="56px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="inline-block rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2 py-0 text-[10px] font-black uppercase text-[#1A1A2E]">
                {messages.listing.free}
              </span>
              <span className="mt-0.5 block truncate text-label-md font-bold text-[#1A1A2E]">
                {resolveListingTitle(focus.listing, language)}
              </span>
              <span className="block text-[11px] text-[#4A4A5E]">{formatRelativeTime(focus.listing.posted_at)}</span>
            </span>
          </div>
        )}
      </div>

      <p className={cn(pop.pill, 'mt-space-md')} data-testid="map-pins-line">
        <SymbolIcon name="location_on" className="text-[16px] text-[#F2512D]" />
        {messages.onboarding.map.pinsLine(teaser.total, cityLabel)}
      </p>
    </div>
  );
}

/** Fanned real cards; the heart on the front card fills in on a loop (static under reduced motion). */
export function FavoritesDemo({ listings }: { listings: ListingRow[] }) {
  const { messages, language, formatRelativeTime } = useMessages();
  const copy = messages.onboarding.favorites;
  const reduceMotion = useReducedMotion();
  const cards = listings.slice(0, 3);
  const front = cards[0];
  const tilts = [0, -7, 6];

  return (
    <div data-testid="onboarding-favorites">
      <div className="relative mx-auto mt-space-lg h-[250px] w-full max-w-[340px]" aria-hidden>
        {[...cards].reverse().map((listing) => {
          const index = cards.indexOf(listing);
          const isFront = index === 0;
          return (
            <div
              key={listing.id}
              className={cn('absolute left-1/2 top-2 w-[58%] bg-white p-1.5', pop.card, 'rounded-2xl')}
              style={{
                translate: `${-50 + (index === 1 ? -34 : index === 2 ? 34 : 0)}% ${isFront ? 0 : 14}px`,
                rotate: `${tilts[index]}deg`,
                zIndex: 10 - index,
              }}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#F3E2CF]">
                <ListingPhoto src={listing.photo_url} alt="" variant="thumbnail" sizes="200px" />
                <span className="absolute left-1.5 top-1.5 rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2 py-0.5 text-[10px] font-black uppercase text-[#1A1A2E]">
                  {messages.listing.free}
                </span>
                {isFront && (
                  <motion.span
                    className="absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1A1A2E] bg-[#F2512D] text-white shadow-[2px_2px_0_#1A1A2E]"
                    animate={reduceMotion ? undefined : { scale: [1, 1, 1.25, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 0.65, 0.8] }}
                  >
                    <SymbolIcon name="favorite" className="text-[22px]" />
                  </motion.span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-1 px-0.5 text-label-sm font-semibold text-[#1A1A2E]">
                {resolveListingTitle(listing, language)}
              </p>
              <p className="px-0.5 pb-0.5 text-[11px] text-[#4A4A5E]">{formatRelativeTime(listing.posted_at)}</p>
            </div>
          );
        })}
        {front && (
          <motion.span
            className="absolute bottom-0 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#1A1A2E] bg-[#1A1A2E] px-3 py-1.5 text-label-sm font-bold text-white shadow-[2px_2px_0_#F2512D]"
            initial={reduceMotion ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <span className="h-2 w-2 rounded-full bg-[#7FE0B0]" />
            {copy.toast} <span className="text-[#F2512D]">♥</span>
          </motion.span>
        )}
        <Sparkle className="right-2 top-0 h-6 w-6 text-[#FFC83D]" />
        <Sparkle className="left-1 top-24 h-5 w-5 text-[#F2512D]" />
      </div>

      <div className={cn('mt-space-md p-space-md', pop.card, 'bg-[#FFE3EC]')} aria-hidden>
        <p className="text-label-md font-bold text-[#1A1A2E]">{copy.tabTitle}</p>
        <div className="mt-space-sm grid grid-cols-4 gap-1 rounded-full border-2 border-[#1A1A2E] bg-white p-1">
          {(
            [
              ['home', messages.nav.home],
              ['map', messages.nav.map],
              ['favorite', messages.nav.favorites],
              ['settings', messages.nav.settings],
            ] as const
          ).map(([icon, label]) => {
            const on = icon === 'favorite';
            return (
              <span
                key={icon}
                className={cn(
                  'flex flex-col items-center rounded-full py-1 text-[10px] font-semibold',
                  on ? 'bg-[#D6F5E6] text-[#F2512D]' : 'text-[#4A4A5E]',
                )}
              >
                <SymbolIcon name={icon} className="text-[18px]" />
                <span className="truncate">{label}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
