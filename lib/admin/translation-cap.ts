import type { SupabaseClient } from '@supabase/supabase-js';

export function checkTranslationCap(
  translationsToday: number,
  dailyCap: number,
): { pauseTranslate: boolean; scrapeAllowed: boolean } {
  const atCap = translationsToday >= dailyCap;
  return {
    pauseTranslate: atCap,
    scrapeAllowed: true,
  };
}

export type TranslationUsageResult = {
  allowed: boolean;
  pausedAutoTranslate: boolean;
};

type GlobalConfigUsageRow = {
  translations_today: number;
  translations_reset_date: string;
  daily_translation_cap: number;
};

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Reset counter at UTC midnight; increment when a translation is allowed (D-43). */
export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
): Promise<TranslationUsageResult> {
  const { data, error } = await supabase
    .from('scraper_global_config')
    .select('translations_today, translations_reset_date, daily_translation_cap')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return { allowed: false, pausedAutoTranslate: true };
  }

  const row = data as GlobalConfigUsageRow;
  const today = utcDateString();
  let translationsToday = row.translations_today;
  const dailyCap = row.daily_translation_cap;

  if (row.translations_reset_date < today) {
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

  const capState = checkTranslationCap(translationsToday, dailyCap);
  if (capState.pauseTranslate) {
    return { allowed: false, pausedAutoTranslate: true };
  }

  const { error: incrementError } = await supabase
    .from('scraper_global_config')
    .update({
      translations_today: translationsToday + 1,
      translations_reset_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (incrementError) {
    return { allowed: false, pausedAutoTranslate: true };
  }

  return { allowed: true, pausedAutoTranslate: false };
}
