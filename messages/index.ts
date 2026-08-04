import type { ListingCategory } from '@/lib/listings/categories';
import type { VeniceZone } from '@/lib/listings/types';
import type { AppLanguage } from '@/lib/settings/preferences';
import { messages as en } from './en';
import { messages as it, type Messages } from './it';
import { messages as zh } from './zh';

export type { Messages };
export type { AppLanguage };

export const DEFAULT_LANGUAGE: AppLanguage = 'zh';

export const catalogs: Record<AppLanguage, Messages> = {
  zh,
  en,
  it,
};

export function getMessages(lang?: AppLanguage): Messages {
  if (lang && lang in catalogs) {
    return catalogs[lang];
  }
  return catalogs[DEFAULT_LANGUAGE];
}

export function zoneLabel(zone: VeniceZone | 'All', messages: Messages): string {
  if (zone === 'All') return messages.zones.all;
  return messages.zones[zone];
}

export function categoryLabel(category: ListingCategory, messages: Messages): string {
  return messages.categories[category];
}

export function formatRelativeTime(
  isoDate: string,
  messages: Messages,
  now = new Date(),
): string {
  const posted = new Date(isoDate);
  const diffMs = now.getTime() - posted.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return messages.listing.postedAgo.justNow;
  if (diffMinutes < 60) return messages.listing.postedAgo.minutes(diffMinutes);
  if (diffHours < 24) return messages.listing.postedAgo.hours(diffHours);
  return messages.listing.postedAgo.days(diffDays);
}
