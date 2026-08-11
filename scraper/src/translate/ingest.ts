import type { SupabaseClient } from '@supabase/supabase-js';
import { SUBITO_REGALO_CATALOG } from '../../../lib/admin/subito-regalo-catalog.js';
import { translateListingFields } from './engine.js';

export type ListingTranslationFields = {
  title: string;
  description?: string | null;
  category?: string | null;
};

export type TranslateBatchState = {
  autoTranslate: boolean;
  /** Loaded but intentionally unused downstream (dead field, preserved as-is). */
  translationProvider: 'gemini' | 'openrouter';
  translationsToday: number;
  dailyCap: number;
  today: string;
};

export async function loadTranslateBatchState(
  supabase: SupabaseClient,
): Promise<TranslateBatchState | null> {
  const { data, error } = await supabase
    .from('scraper_global_config')
    .select('auto_translate, translation_provider, translations_today, translations_reset_date, daily_translation_cap')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  let translationsToday = data.translations_today as number;

  if ((data.translations_reset_date as string) < today) {
    translationsToday = 0;
    await supabase
      .from('scraper_global_config')
      .update({
        translations_today: 0,
        translations_reset_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
  }

  return {
    autoTranslate: Boolean(data.auto_translate),
    translationProvider: (data.translation_provider as 'gemini' | 'openrouter') ?? 'gemini',
    translationsToday,
    dailyCap: data.daily_translation_cap as number,
    today,
  };
}

/**
 * Synchronous, no-`await` in-memory check-and-increment. This is what makes the cap
 * reservation race-free under concurrent dispatch (D-20 revisit): Node's single-threaded
 * event loop cannot interleave two concurrent callers inside a function body that never
 * yields, unlike the old per-listing read-then-write against the database which was racy
 * once translations for multiple listings could be in flight at once.
 */
function reserveTranslationSlot(state: TranslateBatchState): number | null {
  if (state.translationsToday >= state.dailyCap) {
    return null;
  }
  state.translationsToday += 1;
  return state.translationsToday;
}

function categoryLabelForSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const entry = SUBITO_REGALO_CATALOG.find((item) => item.slug === slug);
  return entry?.labelIt ?? slug;
}

async function queueTranslationFailure(
  supabase: SupabaseClient,
  listingId: string,
  errorMessage: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('translation_queue')
    .select('attempts')
    .eq('listing_id', listingId)
    .maybeSingle();

  const attempts = (existing?.attempts as number | undefined) ?? 0;

  await supabase.from('translation_queue').upsert(
    {
      listing_id: listingId,
      status: 'pending',
      attempts: attempts + 1,
      last_error: errorMessage.slice(0, 500),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'listing_id' },
  );
}

