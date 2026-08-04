import type { SupabaseClient } from '@supabase/supabase-js';
import { translateListingFields } from './engine.js';

export type ListingTranslationFields = {
  title: string;
  description?: string | null;
  category?: string | null;
};

type GlobalTranslateConfig = {
  auto_translate: boolean;
  translation_provider: 'gemini' | 'openrouter';
};

async function loadTranslateConfig(
  supabase: SupabaseClient,
): Promise<GlobalTranslateConfig | null> {
  const { data, error } = await supabase
    .from('scraper_global_config')
    .select('auto_translate, translation_provider')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    auto_translate: Boolean(data.auto_translate),
    translation_provider: (data.translation_provider as 'gemini' | 'openrouter') ?? 'gemini',
  };
}

async function checkAndIncrementUsage(
  supabase: SupabaseClient,
): Promise<{ allowed: boolean }> {
  const { data, error } = await supabase
    .from('scraper_global_config')
    .select('translations_today, translations_reset_date, daily_translation_cap')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return { allowed: false };
  }

  const today = new Date().toISOString().slice(0, 10);
  let translationsToday = data.translations_today as number;
  const dailyCap = data.daily_translation_cap as number;

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

  if (translationsToday >= dailyCap) {
    return { allowed: false };
  }

  const { error: incrementError } = await supabase
    .from('scraper_global_config')
    .update({
      translations_today: translationsToday + 1,
      translations_reset_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  return { allowed: !incrementError };
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

/** Post-persist translation hook (D-24, D-27). Listing persist is never rolled back. */
export async function translateAfterPersist(
  supabase: SupabaseClient,
  listingId: string,
  fields: ListingTranslationFields,
): Promise<void> {
  const config = await loadTranslateConfig(supabase);
  if (!config?.auto_translate) {
    return;
  }

  const usage = await checkAndIncrementUsage(supabase);
  if (!usage.allowed) {
    return;
  }

  const result = await translateListingFields(fields, {
    geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
    openRouterApiKey: process.env.OPENROUTER_API_KEY?.trim(),
    openRouterModel: process.env.OPENROUTER_FALLBACK_MODEL?.trim(),
  });

  if (result.ok) {
    const { translations } = result;
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        title_en: translations.title_en,
        title_zh: translations.title_zh,
        description_en: translations.description_en,
        description_zh: translations.description_zh,
        category_en: translations.category_en,
        category_zh: translations.category_zh,
      })
      .eq('id', listingId);

    if (updateError) {
      await queueTranslationFailure(supabase, listingId, updateError.message);
      return;
    }

    await supabase.from('translation_queue').delete().eq('listing_id', listingId);
    return;
  }

  await queueTranslationFailure(supabase, listingId, result.error);
}
