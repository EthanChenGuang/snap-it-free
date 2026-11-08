'use client';

import { motion, useReducedMotion } from 'motion/react';
import { pop } from '@/components/onboarding/pop-theme';
import { Sparkle } from '@/components/onboarding/steps/PhotoCollage';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import {
  ITALY_MAINLAND,
  ITALY_MAP_ASPECT,
  NEIGHBOURS,
  outlinePath,
  projectToFrame,
  SARDINIA,
} from '@/lib/geo/italy-outline';
import { useMessages } from '@/lib/i18n/useMessages';
import type { CityMap, DailyCount } from '@/lib/paywall/onboarding-stats';
import { cn } from '@/lib/utils';

/**
 * Visuals for the three screens added to match Snag's onboarding shape (quick 261031-ob4):
 * weekly volume, items per city on a map, saving favourites, and the trust promises. Lagoon Pop UI (Stitch project 9058658661756179433),
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
  const perDay = Math.round(daily.reduce((sum, day) => sum + day.count, 0) / Math.max(1, daily.length));
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
            {copy.perDay(perDay)}
          </span>
        </div>
        <div className="mt-space-md flex h-32 items-end gap-1.5">
          {daily.map((day, index) => {
            const isPeak = day.count === max;
            const height = Math.max(8, Math.round((day.count / max) * 100));
            return (
              <div key={day.dayStart} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className={cn('text-[11px] font-bold', isPeak ? 'text-[#F2512D]' : 'text-[#4A4A5E]')}>{day.count}</span>
                <motion.div
                  className={cn(
                    'w-full rounded-t-xl border-2 border-[#1A1A2E]',
                    isPeak ? 'bg-[#F2512D]' : BAR_FILLS[index % BAR_FILLS.length],
                  )}
                  style={{ height: `${height}%`, transformOrigin: 'bottom' }}
                  initial={reduceMotion ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
                <span className={cn('text-[11px] font-black', isPeak ? 'text-[#F2512D]' : 'text-[#1A1A2E]')}>
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

const MAP_W = 400;
const MAP_H = Math.round(MAP_W / ITALY_MAP_ASPECT);
const LABELLED_CITIES = 3;

/**
 * City-level map: listings only carry their city's centre, so we never draw per-item pins. One
 * bubble per city, area proportional to its real active count, over a simplified Italy backdrop.
 */
export function CityMapView({ map, cityLabels }: { map: CityMap; cityLabels: Record<ConsumerCityKey, string> }) {
  const { messages, language } = useMessages();
  const reduceMotion = useReducedMotion();
  const tag = localeTag(language);
  const max = Math.max(1, ...map.cities.map((bubble) => bubble.count));
  const bubbles = map.cities.map((bubble) => ({
    ...bubble,
    ...projectToFrame(bubble.lngLat, MAP_W, MAP_H),
    r: 5 + Math.sqrt(bubble.count / max) * 21,
  }));
  // Label the busiest cities; flip a label below its bubble when it would sit on an earlier one.
  const labels: Array<{ city: ConsumerCityKey; x: number; y: number; below: boolean; count: number }> = [];
  for (const bubble of bubbles.slice(0, LABELLED_CITIES)) {
    const clash = labels.some((label) => Math.abs(label.x - bubble.x) < 120 && Math.abs(label.y - bubble.y) < 26);
    labels.push({ city: bubble.city, x: bubble.x, y: bubble.y + (clash ? bubble.r : -bubble.r), below: clash, count: bubble.count });
  }

  return (
    <div data-testid="onboarding-map">
      <div className={cn('relative mt-space-lg overflow-hidden', pop.card, 'bg-[#CFEFF5]')}>
        <div className="relative w-full" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
            {NEIGHBOURS.map((points, index) => (
              <path key={index} d={outlinePath(points, MAP_W, MAP_H)} fill="#E6E1D3" />
            ))}
            <path d={outlinePath(SARDINIA, MAP_W, MAP_H)} fill="#F5EEDC" stroke="#1A1A2E" strokeOpacity="0.2" strokeWidth="1.5" />
            <path d={outlinePath(ITALY_MAINLAND, MAP_W, MAP_H)} fill="#F5EEDC" stroke="#1A1A2E" strokeOpacity="0.2" strokeWidth="1.5" />
            {[...bubbles].reverse().map((bubble, index) => (
              <motion.circle
                key={bubble.city}
                data-testid="map-city-bubble"
                cx={bubble.x}
                cy={bubble.y}
                r={bubble.r}
                fill="#F2512D"
                fillOpacity={0.78}
                stroke="#1A1A2E"
                strokeWidth="2"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                initial={reduceMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.04 * (bubbles.length - index), type: 'spring', stiffness: 320, damping: 20 }}
              />
            ))}
          </svg>
          {labels.map((label) => (
            <span
              key={label.city}
              className={cn(
                pop.pill,
                'absolute z-10 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-0.5 text-[11px]',
                label.below ? 'translate-y-1' : '-translate-y-[calc(100%+4px)]',
              )}
              style={{ left: `${(label.x / MAP_W) * 100}%`, top: `${(label.y / MAP_H) * 100}%` }}
              aria-hidden
            >
              <span className="font-black">{cityLabels[label.city]}</span>
              <span className="text-[#F2512D]">{label.count.toLocaleString(tag)}</span>
            </span>
          ))}
        </div>
      </div>

      <p className={cn(pop.pill, 'mt-space-md')} data-testid="map-pins-line">
        <SymbolIcon name="location_on" className="text-[16px] text-[#F2512D]" />
        {messages.onboarding.map.pinsLine(map.total, map.cities.length)}
      </p>
    </div>
  );
}

const TRUST_ICONS = ['verified', 'bar_chart', 'receipt_long', 'lock'] as const;
const TRUST_BADGES = ['bg-[#D6F5E6]', 'bg-[#DDF0FF]', 'bg-[#EAE2FF]', 'bg-[#FFE3D3]'] as const;

/**
 * Honest stand-in for Snag's testimonial wall (quick 261105-ob6, Stitch screen 857017fd…): four
 * promises we keep, plus the live item count. No reviews, ratings or people, since we have none to show.
 */
export function TrustPromises({ liveCount }: { liveCount: number | null }) {
  const { messages } = useMessages();
  const copy = messages.onboarding.trust;
  const reduceMotion = useReducedMotion();
  return (
    <div data-testid="onboarding-trust">
      <ul className="mt-space-lg flex flex-col gap-space-sm">
        {copy.rows.map((row, index) => (
          <motion.li
            key={row.title}
            className={cn('flex items-center gap-space-md p-space-md', pop.card, 'rounded-[20px]')}
            initial={reduceMotion ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.06 * index, duration: 0.3 }}
          >
            <span
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#1A1A2E] text-[#1A1A2E]',
                TRUST_BADGES[index % TRUST_BADGES.length],
              )}
              aria-hidden
            >
              <SymbolIcon name={TRUST_ICONS[index % TRUST_ICONS.length]} className="text-[24px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-body-md font-black text-[#1A1A2E]">{row.title}</span>
              <span className="block text-label-md text-[#4A4A5E]">{row.line}</span>
            </span>
          </motion.li>
        ))}
      </ul>
      {liveCount !== null && liveCount > 0 && (
        <p
          className="mx-auto mt-space-md flex w-max items-center gap-2 rounded-full bg-[#1A1A2E] px-space-md py-1.5 text-label-md font-bold text-white"
          data-testid="trust-live-line"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[#7FE0B0]" aria-hidden />
          {copy.liveLine(liveCount)}
        </p>
      )}
    </div>
  );
}

/**
 * Illustrative example items (Stitch screen afff87b6…, 2026-11-08), bundled so they show at once. They are
 * not listings, so the cards carry only a short item name: no listing title, age or place.
 */
const FAVORITE_EXAMPLES = [
  { key: 'bike', url: '/images/onboarding/favorites/bike.webp' },
  { key: 'lamp', url: '/images/onboarding/favorites/lamp.webp' },
  { key: 'guitar', url: '/images/onboarding/favorites/guitar.webp' },
] as const;

/** Fanned example cards; the heart on the front card fills in on a loop (static under reduced motion). */
export function FavoritesDemo() {
  const { messages } = useMessages();
  const copy = messages.onboarding.favorites;
  const reduceMotion = useReducedMotion();
  const cards = FAVORITE_EXAMPLES;
  const front = cards[0];
  const tilts = [0, -7, 6];

  return (
    <div data-testid="onboarding-favorites">
      <div className="relative mx-auto mt-space-lg h-[250px] w-full max-w-[340px]" aria-hidden>
        {[...cards].reverse().map((item) => {
          const index = cards.indexOf(item);
          const isFront = index === 0;
          return (
            <div
              key={item.key}
              className={cn('absolute left-1/2 top-2 w-[58%] bg-white p-1.5', pop.card, 'rounded-2xl')}
              style={{
                translate: `${-50 + (index === 1 ? -34 : index === 2 ? 34 : 0)}% ${isFront ? 0 : 14}px`,
                rotate: `${tilts[index]}deg`,
                zIndex: 10 - index,
              }}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#F3E2CF]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="absolute inset-0 h-full w-full object-cover" decoding="async" />
                <span className="absolute left-1.5 top-1.5 z-[2] rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2 py-0.5 text-[10px] font-black uppercase text-[#1A1A2E]">
                  {messages.listing.free}
                </span>
                {isFront && (
                  <motion.span
                    className="absolute bottom-1.5 right-1.5 z-[2] flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1A1A2E] bg-[#F2512D] text-white shadow-[2px_2px_0_#1A1A2E]"
                    animate={reduceMotion ? undefined : { scale: [1, 1, 1.25, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 0.65, 0.8] }}
                  >
                    <SymbolIcon name="favorite" className="text-[22px]" />
                  </motion.span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-1 px-0.5 pb-0.5 text-label-sm font-semibold text-[#1A1A2E]">
                {copy.examples[item.key]}
              </p>
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
