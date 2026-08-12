import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  resolveGeminiModel,
  resolveOpenRouterModel,
} from './translation-models';

export type TranslationProviderId = 'gemini' | 'openrouter';

export type TranslationListingCost = {
  listingId: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  modelLabel: string;
  provider: TranslationProviderId;
  attempts: number;
};

export type TranslationProviderCostShare = {
  provider: TranslationProviderId;
  label: string;
  costUsd: number;
  percent: number;
  color: string;
};

export type TranslationCostSummary = {
  monthTotalUsd: number;
  todayUsd: number;
  totalTokens: number;
  avgCostPerListingUsd: number;
  monthOverMonthDeltaPercent: number | null;
  providers: TranslationProviderCostShare[];
  primaryModelLabel: string;
  translatedThisMonth: number;
  translationsToday: number;
};

const SYSTEM_PROMPT_TOKENS = 120;
const OUTPUT_TOKENS_BASE = 130;

/** Rough token estimate — ~4 chars per token for Latin/CJK mix. */
export function estimateTokensFromText(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateListingInputTokens(input: {
  title: string;
  description?: string | null;
  category?: string | null;
}): number {
  const payloadTokens =
    estimateTokensFromText(input.title) +
    estimateTokensFromText(input.description ?? '') +
    estimateTokensFromText(input.category ?? '') +
    24;
  return SYSTEM_PROMPT_TOKENS + payloadTokens;
}

const PRICING: Record<
  TranslationProviderId,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  gemini: { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  openrouter: { inputPerMillion: 0.1, outputPerMillion: 0.4 },
};

export function computeTranslationCostUsd(
  provider: TranslationProviderId,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = PRICING[provider];
  const inputCost = (inputTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * rates.outputPerMillion;
  return inputCost + outputCost;
}

/** Prefer provider-reported cost (OpenRouter) when available. */
export function resolveTranslationCostUsd(
  provider: TranslationProviderId,
  inputTokens: number,
  outputTokens: number,
  reportedCostUsd?: number | null,
): number {
  if (reportedCostUsd != null && Number.isFinite(reportedCostUsd) && reportedCostUsd >= 0) {
    return reportedCostUsd;
  }
  return computeTranslationCostUsd(provider, inputTokens, outputTokens);
}

export function formatUsd(amount: number, digits = 2): string {
  return `$${amount.toFixed(digits)}`;
}

export function formatUsdCompact(amount: number): string {
  if (amount >= 1) {
    return formatUsd(amount, 2);
  }
  if (amount >= 0.01) {
    return formatUsd(amount, 3);
  }
  return formatUsd(amount, 4);
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return String(tokens);
}

export function providerDisplayLabel(provider: TranslationProviderId): string {
  return provider === 'gemini' ? 'Gemini' : 'OpenRouter';
}

export function resolveModelLabel(
  provider: TranslationProviderId,
  options?: { geminiModel?: string; openRouterModel?: string },
): string {
  if (provider === 'gemini') {
    const model = resolveGeminiModel(options?.geminiModel);
    return `Gemini ${model.replace(/^gemini-?/i, '')}`;
  }
  const model = resolveOpenRouterModel(options?.openRouterModel);
  const short = model.includes('/') ? model.split('/').pop() ?? model : model;
  return `OpenRouter ${short}`;
}

export function estimateListingCost(input: {
  title: string;
  attempts: number;
  provider: TranslationProviderId;
  geminiModel?: string;
  openRouterModel?: string;
}): TranslationListingCost {
  const inputTokens = estimateListingInputTokens({ title: input.title });
  const outputTokens = OUTPUT_TOKENS_BASE;
  const attempts = Math.max(1, input.attempts || 1);
  const perAttemptCost = computeTranslationCostUsd(input.provider, inputTokens, outputTokens);

  return {
    listingId: '',
    costUsd: perAttemptCost * attempts,
    inputTokens,
    outputTokens,
    modelLabel: resolveModelLabel(input.provider, {
      geminiModel: input.geminiModel,
      openRouterModel: input.openRouterModel,
    }),
    provider: input.provider,
    attempts,
  };
}

export function buildCostSummary(input: {
  translatedThisMonth: number;
  translatedLastMonth: number;
  translationsToday: number;
  primaryProvider: TranslationProviderId;
  geminiModel?: string;
  openRouterModel?: string;
}): TranslationCostSummary {
  const avgInput = estimateListingInputTokens({ title: 'Sample listing title for average cost' });
  const avgOutput = OUTPUT_TOKENS_BASE;
  const avgCostPrimary = computeTranslationCostUsd(
    input.primaryProvider,
    avgInput,
    avgOutput,
  );

  // translations_today counts API calls (incl. retries); translatedThisMonth counts
  // listings scraped this month with title_en. They diverge — month must be >= today.
  const effectiveMonthTranslations = Math.max(
    input.translatedThisMonth,
    input.translationsToday,
  );

  const monthTotalUsd = effectiveMonthTranslations * avgCostPrimary;
  const todayUsd = Math.min(input.translationsToday * avgCostPrimary, monthTotalUsd);
  const totalTokens = effectiveMonthTranslations * (avgInput + avgOutput);

  const lastMonthUsd = input.translatedLastMonth * avgCostPrimary;
  const monthOverMonthDeltaPercent =
    lastMonthUsd > 0
      ? Math.round(((monthTotalUsd - lastMonthUsd) / lastMonthUsd) * 100)
      : null;

  const primaryShare = 0.72;
  const fallbackShare = 1 - primaryShare;
  const primaryProvider = input.primaryProvider;
  const fallbackProvider: TranslationProviderId =
    primaryProvider === 'gemini' ? 'openrouter' : 'gemini';

  const primaryCost = monthTotalUsd * primaryShare;
  const fallbackCost = monthTotalUsd * fallbackShare;

  const providers: TranslationProviderCostShare[] = [
    {
      provider: primaryProvider,
      label: providerDisplayLabel(primaryProvider),
      costUsd: primaryCost,
      percent: Math.round(primaryShare * 100),
      color: primaryProvider === 'gemini' ? '#007aff' : '#5856d6',
    },
    {
      provider: fallbackProvider,
      label: providerDisplayLabel(fallbackProvider),
      costUsd: fallbackCost,
      percent: Math.round(fallbackShare * 100),
      color: fallbackProvider === 'gemini' ? '#34c759' : '#ff9500',
    },
  ].sort((a, b) => b.costUsd - a.costUsd);

  return {
    monthTotalUsd,
    todayUsd,
    totalTokens,
    avgCostPerListingUsd: avgCostPrimary,
    monthOverMonthDeltaPercent,
    providers,
    primaryModelLabel: resolveModelLabel(primaryProvider, {
      geminiModel: input.geminiModel ?? DEFAULT_GEMINI_MODEL,
      openRouterModel: input.openRouterModel ?? DEFAULT_OPENROUTER_MODEL,
    }),
    translatedThisMonth: effectiveMonthTranslations,
    translationsToday: input.translationsToday,
  };
}
