import type { SupabaseClient } from '@supabase/supabase-js';
import type { VeniceZone } from '@/lib/listings/types';
import type { AppLanguage } from '@/lib/settings/preferences';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { getMessages, zoneLabel as zoneLabelFor } from '@/messages';

export const APP_LANGUAGES = ['zh', 'en', 'it'] as const;

export function isValidAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
}

export function buildMatchPushContent(
  listing: {
    title: string;
    title_en?: string | null;
    title_zh?: string | null;
    zone: VeniceZone | null;
  },
  locale: AppLanguage,
): { title: string; body: string } {
  const messages = getMessages(locale);
  const zoneText = listing.zone
    ? zoneLabelFor(listing.zone, messages)
    : messages.settings.matches.zoneUnknown;

  return {
    title: resolveListingTitle(listing, locale),
    body: `${zoneText} · ${messages.settings.push.matchBodySuffix}`,
  };
}

export async function resolveUserLocale(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppLanguage> {
  const { data, error } = await supabase
    .from('profiles')
    .select('language')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.language || !isValidAppLanguage(data.language)) {
    return 'zh';
  }

  return data.language;
}

export async function loadUserLocales(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AppLanguage>> {
  const localeByUser = new Map<string, AppLanguage>();
  if (userIds.length === 0) return localeByUser;

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, language')
    .in('user_id', userIds);

  if (error) return localeByUser;

  for (const row of data ?? []) {
    if (isValidAppLanguage(row.language)) {
      localeByUser.set(row.user_id, row.language);
    }
  }

  return localeByUser;
}

export async function syncUserLocale(
  supabase: SupabaseClient,
  userId: string,
  language: AppLanguage,
): Promise<{ error: string | null }> {
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      language,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: pushError } = await supabase
    .from('push_subscriptions')
    .update({ locale: language })
    .eq('user_id', userId);

  if (pushError) {
    return { error: pushError.message };
  }

  return { error: null };
}
