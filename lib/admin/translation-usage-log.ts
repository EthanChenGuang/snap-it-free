import type { SupabaseClient } from '@supabase/supabase-js';
import type { TranslationProviderId } from './translate';
import {
  buildCostSummary,
  providerDisplayLabel,
  resolveModelLabel,
  type TranslationCostSummary,
  type TranslationProviderCostShare,
} from './translation-cost';

export type TranslationUsageLogSource = 'retry' | 'ingest' | 'rescue' | 'backfill';

export type TranslationUsageRecord = {
  listingId: string | null;
  provider: TranslationProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs?: number;
  source: TranslationUsageLogSource;
};

const PROVIDER_COLORS: Record<TranslationProviderId, string> = {
  gemini: '#007aff',
  openrouter: '#5856d6',
};

type RpcSummaryRow = {
  month_total_usd: number | string;
  today_usd: number | string;
  total_tokens: number | string;
  translated_this_month: number;
  translations_today: number;
  last_month_usd: number | string;
  latest_model: string | null;
  providers: Array<{
    provider: TranslationProviderId;
    cost_usd: number | string;
    call_count: number;
  }> | null;
};

function toNumber(value: number | string | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function logTranslationUsage(
  supabase: SupabaseClient,
  entry: TranslationUsageRecord,
): Promise<void> {
  const { error } = await supabase.from('translation_usage_log').insert({
    listing_id: entry.listingId,
    provider: entry.provider,
    model: entry.model,
    input_tokens: entry.inputTokens,
    output_tokens: entry.outputTokens,
    cost_usd: entry.costUsd,
    duration_ms: entry.durationMs ?? null,
    source: entry.source,
  });

  if (error) {
    console.warn('[logTranslationUsage]', error.message);
  }
}

export async function recordTranslationSuccess(
  supabase: SupabaseClient,
  listingId: string,
  result: {
    durationMs: number;
    usage: {
      provider: TranslationProviderId;
      model: string;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    };
  },
  source: TranslationUsageLogSource,
): Promise<void> {
  await logTranslationUsage(supabase, {
    listingId,
    provider: result.usage.provider,
    model: result.usage.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    costUsd: result.usage.costUsd,
    durationMs: result.durationMs,
    source,
  });
}

function buildProviderShares(
  rows: RpcSummaryRow['providers'],
  monthTotalUsd: number,
): TranslationProviderCostShare[] {
  if (!rows?.length || monthTotalUsd <= 0) {
    return [];
  }

  return rows.map((row) => {
    const costUsd = toNumber(row.cost_usd);
    const provider = row.provider;
    return {
      provider,
      label: providerDisplayLabel(provider),
      costUsd,
      percent: Math.round((costUsd / monthTotalUsd) * 100),
      color: PROVIDER_COLORS[provider] ?? '#86868b',
    };
  });
}

export async function collectTranslationCostSummary(
  supabase: SupabaseClient,
  options?: {
    primaryProvider?: TranslationProviderId;
    geminiModel?: string;
    openRouterModel?: string;
  },
): Promise<TranslationCostSummary | null> {
  const { data, error } = await supabase.rpc('get_translation_cost_summary');

  if (error) {
    if (error.message.includes('get_translation_cost_summary')) {
      return null;
    }
    throw new Error(`get_translation_cost_summary failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as RpcSummaryRow;
  const monthTotalUsd = toNumber(row.month_total_usd);
  const todayUsd = toNumber(row.today_usd);
  const lastMonthUsd = toNumber(row.last_month_usd);
  const translatedThisMonth = row.translated_this_month ?? 0;
  const translationsToday = row.translations_today ?? 0;
  const totalTokens = toNumber(row.total_tokens);
  const avgCostPerListingUsd =
    translatedThisMonth > 0 ? monthTotalUsd / translatedThisMonth : 0;

  const monthOverMonthDeltaPercent =
    lastMonthUsd > 0
      ? Math.round(((monthTotalUsd - lastMonthUsd) / lastMonthUsd) * 100)
      : null;

  const primaryProvider = options?.primaryProvider ?? 'gemini';
  const providers = buildProviderShares(row.providers, monthTotalUsd);
  const latestModel = row.latest_model?.trim();

  return {
    monthTotalUsd,
    todayUsd: Math.min(todayUsd, monthTotalUsd),
    totalTokens,
    avgCostPerListingUsd,
    monthOverMonthDeltaPercent,
    providers,
    primaryModelLabel: latestModel
      ? latestModel.includes('/')
        ? `OpenRouter ${latestModel.split('/').pop()}`
        : latestModel.startsWith('gemini')
          ? resolveModelLabel('gemini', { geminiModel: latestModel })
          : latestModel
      : resolveModelLabel(primaryProvider, {
          geminiModel: options?.geminiModel,
          openRouterModel: options?.openRouterModel,
        }),
    translatedThisMonth,
    translationsToday,
  };
}

export type ListingUsageAggregate = {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  modelLabel: string;
  provider: TranslationProviderId;
};

type ListingUsageRow = {
  listing_id: string;
  cost_usd: number | string;
  input_tokens: number | string;
  output_tokens: number | string;
  latest_provider: TranslationProviderId;
  latest_model: string;
};

export async function getListingUsageTotals(
  supabase: SupabaseClient,
  listingIds: string[],
): Promise<Map<string, ListingUsageAggregate>> {
  const result = new Map<string, ListingUsageAggregate>();
  if (listingIds.length === 0) {
    return result;
  }

  const { data, error } = await supabase
    .from('translation_usage_log')
    .select('listing_id, cost_usd, input_tokens, output_tokens, provider, model, created_at')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    return result;
  }

  const grouped = new Map<string, ListingUsageRow & { inputSum: number; outputSum: number }>();

  for (const row of data) {
    const listingId = row.listing_id as string;
    if (!listingId) {
      continue;
    }

    const existing = grouped.get(listingId);
    const costUsd = toNumber(row.cost_usd as number | string);
    const inputTokens = toNumber(row.input_tokens as number | string);
    const outputTokens = toNumber(row.output_tokens as number | string);

    if (!existing) {
      grouped.set(listingId, {
        listing_id: listingId,
        cost_usd: costUsd,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latest_provider: row.provider as TranslationProviderId,
        latest_model: row.model as string,
        inputSum: inputTokens,
        outputSum: outputTokens,
      });
      continue;
    }

    existing.cost_usd = toNumber(existing.cost_usd) + costUsd;
    existing.inputSum += inputTokens;
    existing.outputSum += outputTokens;
    existing.input_tokens = existing.inputSum;
    existing.output_tokens = existing.outputSum;
  }

  for (const [listingId, row] of grouped) {
    const provider = row.latest_provider;
    result.set(listingId, {
      costUsd: toNumber(row.cost_usd),
      inputTokens: row.inputSum,
      outputTokens: row.outputSum,
      provider,
      modelLabel: resolveModelLabel(provider, {
        geminiModel: provider === 'gemini' ? row.latest_model : undefined,
        openRouterModel: provider === 'openrouter' ? row.latest_model : undefined,
      }),
    });
  }

  return result;
}

/** Fallback when migration not applied or table empty. */
export function buildEstimatedCostSummary(
  input: Parameters<typeof buildCostSummary>[0],
): TranslationCostSummary {
  return buildCostSummary(input);
}
