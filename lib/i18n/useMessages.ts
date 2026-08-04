'use client';

import {
  readAppPreferences,
  subscribeAppPreferences,
  type AppLanguage,
  type AppPreferences,
} from '@/lib/settings/preferences';
import {
  categoryLabel as categoryLabelFor,
  formatRelativeTime as formatRelativeTimeFor,
  getMessages,
  zoneLabel as zoneLabelFor,
  type Messages,
} from '@/messages';
import type { ListingCategory } from '@/lib/listings/categories';
import type { VeniceZone } from '@/lib/listings/types';
import { useSyncExternalStore } from 'react';

const SERVER_SNAPSHOT: AppPreferences = {
  language: 'zh',
  appearance: 'light',
  soundAlerts: false,
};

export type UseMessagesResult = {
  language: AppLanguage;
  messages: Messages;
  zoneLabel: (zone: VeniceZone | 'All') => string;
  categoryLabel: (category: ListingCategory) => string;
  formatRelativeTime: (isoDate: string, now?: Date) => string;
};

export function useMessages(): UseMessagesResult {
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => SERVER_SNAPSHOT,
  );

  const messages = getMessages(preferences.language);

  return {
    language: preferences.language,
    messages,
    zoneLabel: (zone) => zoneLabelFor(zone, messages),
    categoryLabel: (category) => categoryLabelFor(category, messages),
    formatRelativeTime: (isoDate, now) => formatRelativeTimeFor(isoDate, messages, now),
  };
}
