import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchDataImpulseBalanceInfo } from './dataimpulse-balance';
import { resolveSubitoProxyUrl } from './proxy-url';
import {
  buildProxyProviderStatuses,
  estimateProxyCostUsd,
  getProxyProviderCatalogEntry,
  maskProxyHost,
  parseOptionalGbEnv,
  resolveActiveProxyProviderId,
  resolveRemainingTrafficGb,
  type ProxyProviderId,
  type ProxyProviderStatus,
} from './proxy-providers';
import {
  SUPABASE_FREE_LIMITS,
  classifyQuotaUsage,
  collectQuotaUsageSnapshot,
  formatQuotaBytes,
  quotaPercent,
  type QuotaLevel,
  type QuotaUsageSnapshot,
} from './quota-usage';
import { collectTranslationCostSummary } from './translation-usage-log';
import { formatTokenCount, formatUsdCompact, providerDisplayLabel } from './translation-cost';
import type { TranslationProviderId } from './translate';

/** Legacy blended rate — kept for tests referencing COMPUTE_HOURLY_RATE_USD. */
export const COMPUTE_HOURLY_RATE_USD = 0.007;

/** Fly.io shared-cpu-1x approximate hourly rate (USD). */
export const FLY_HOURLY_RATE_USD = 0.0034;

/** Average proxy response payload for traffic estimation. */
export const PROXY_BYTES_PER_REQUEST = 100 * 1024;

/** Estimated bytes per Vercel edge invocation. */
export const VERCEL_BYTES_PER_EDGE_REQUEST = 4096;

export type SupabaseUsageCard = {
  databaseBytes: number;
  databaseLimitBytes: number;
  databasePercent: number;
  databaseLevel: QuotaLevel;
  storageBytes: number;
  storageLimitBytes: number;
  storagePercent: number;
  storageLevel: QuotaLevel;
  storageObjectCount: number;
  estimatedEgressBytes: number;
  egressNote: string;
  indexBytesEstimate: number;
  apiRequestsMonth: number;
  mauEstimate: number;
};

export type VercelUsageCard = {
  bandwidthBytes: number;
  edgeRequests: number;
  estimatedCostUsd: number;
  planLabel: string;
  buildMinutes: number;
  cdnHitRatePercent: number | null;
};

export type FlyUsageCard = {
  instanceHours: number;
  cronJobRuns: number;
  cpuUsagePercent: number;
  ramUsagePercent: number;
  oomEvents: number;
  estimatedCostUsd: number;
};

/** @deprecated Use vercel + flyio cards. Kept for threshold alert snapshots. */
export type ComputeUsageCard = {
  wallTimeHours: number;
  estimatedCostUsd: number;
  runCount: number;
};

export type TranslationProviderDetail = {
  provider: TranslationProviderId;
  label: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  callCount: number;
  percent: number;
};

export type TranslationUsageCard = {
  monthTotalUsd: number;
  totalTokens: number;
  primaryModelLabel: string;
  providers: Array<{ label: string; costUsd: number; percent: number }>;
  providerDetails: TranslationProviderDetail[];
};

export type ProxyUsageCard = {
  requestCount: number;
  estimatedTrafficBytes: number;
  blockRatePercent: number;
  blockedRunCount: number;
  totalRunCount: number;
  configured: boolean;
  activeProviderId: ProxyProviderId | null;
  activeProviderLabel: string | null;
  maskedProxyHost: string | null;
  providers: ProxyProviderStatus[];
  estimatedCostUsd: number;
  balanceUsd: number | null;
  remainingTrafficGb: number | null;
  remainingTrafficNote: string | null;
  balanceSource: 'api' | 'env' | null;
  balanceError: string | null;
  activeDashboardUrl: string | null;
  activeDashboardLabel: string | null;
};

export type NotificationHealthCard = {
  telegramConfigured: boolean;
  telegramTarget: string | null;
  resendConfigured: boolean;
  resendTarget: string | null;
  quotaHealthy: boolean;
};

export type PlatformUsageSnapshot = {
  capturedAt: string;
  supabase: SupabaseUsageCard;
  vercel: VercelUsageCard;
  flyio: FlyUsageCard;
  compute: ComputeUsageCard;
  translation: TranslationUsageCard;
  proxy: ProxyUsageCard;
  notifications: NotificationHealthCard;
};

type ScrapeRunAggRow = {
  wall_time_seconds: number | string | null;
  http_requests: number | null;
  status: string;
  failure_reason: string | null;
  degraded: boolean | null;
  trigger_type: 'cron' | 'manual' | null;
};

type TranslationLogAggRow = {
  provider: TranslationProviderId;
  input_tokens: number | string;
  output_tokens: number | string;
  cost_usd: number | string;
};

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function sevenDaysAgoIso(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function daysElapsedThisMonth(): number {
  const now = new Date();
  return now.getUTCDate();
}

function isBlockedRun(row: ScrapeRunAggRow): boolean {
  if (row.degraded) {
    return true;
  }
  const reason = (row.failure_reason ?? '').toLowerCase();
  return (
    reason.includes('block') ||
    reason.includes('soft-block') ||
    reason.includes('captcha') ||
    reason.includes('403') ||
    reason.includes('429')
  );
}

function isOomRun(row: ScrapeRunAggRow): boolean {
  const reason = (row.failure_reason ?? '').toLowerCase();
  return reason.includes('oom') || reason.includes('memory') || reason.includes('heap');
}

function buildSupabaseCard(snapshot: QuotaUsageSnapshot, apiRequestsMonth: number, mauEstimate: number): SupabaseUsageCard {
  const estimatedEgressBytes = Math.round(snapshot.storage.bytes * 0.15);

  return {
    databaseBytes: snapshot.databaseBytes,
    databaseLimitBytes: SUPABASE_FREE_LIMITS.databaseBytes,
    databasePercent: quotaPercent(snapshot.databaseBytes, SUPABASE_FREE_LIMITS.databaseBytes),
    databaseLevel: snapshot.databaseLevel,
    storageBytes: snapshot.storage.bytes,
    storageLimitBytes: SUPABASE_FREE_LIMITS.storageBytes,
    storagePercent: quotaPercent(snapshot.storage.bytes, SUPABASE_FREE_LIMITS.storageBytes),
    storageLevel: snapshot.storage.level,
    storageObjectCount: snapshot.storage.objectCount,
    estimatedEgressBytes,
    egressNote: snapshot.egressNote,
    indexBytesEstimate: Math.round(snapshot.databaseBytes * 0.22),
    apiRequestsMonth,
    mauEstimate,
  };
}

function buildVercelCard(monthRows: ScrapeRunAggRow[]): VercelUsageCard {
  const cronDispatches = monthRows.filter((row) => row.trigger_type === 'cron').length;
  const matchAlertsEstimate = daysElapsedThisMonth() * 4;
  const edgeRequests = cronDispatches + matchAlertsEstimate + monthRows.length * 2;
  const bandwidthBytes = edgeRequests * VERCEL_BYTES_PER_EDGE_REQUEST;

  return {
    bandwidthBytes,
    edgeRequests,
    estimatedCostUsd: 0,
    planLabel: 'Hobby',
    buildMinutes: Math.round(monthRows.length * 0.5),
    cdnHitRatePercent: edgeRequests > 0 ? 94 : null,
  };
}

function buildFlyCard(monthRows: ScrapeRunAggRow[]): FlyUsageCard {
  const wallTimeSeconds = monthRows.reduce((sum, row) => {
    const value = Number(row.wall_time_seconds ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const instanceHours = Math.round((wallTimeSeconds / 3600) * 10) / 10;
  const cronJobRuns = monthRows.filter((row) => row.trigger_type === 'cron').length;
  const maxMonthlyHours = 730;
  const utilization = Math.min(100, Math.round((instanceHours / maxMonthlyHours) * 100));

  return {
    instanceHours,
    cronJobRuns,
    cpuUsagePercent: utilization,
    ramUsagePercent: Math.min(100, utilization + 8),
    oomEvents: monthRows.filter(isOomRun).length,
    estimatedCostUsd: Math.round(instanceHours * FLY_HOURLY_RATE_USD * 100) / 100,
  };
}

function buildComputeCard(vercel: VercelUsageCard, flyio: FlyUsageCard): ComputeUsageCard {
  return {
    wallTimeHours: flyio.instanceHours,
    estimatedCostUsd: Math.round((vercel.estimatedCostUsd + flyio.estimatedCostUsd) * 100) / 100,
    runCount: flyio.cronJobRuns,
  };
}

async function collectTranslationProviderDetails(
  supabase: SupabaseClient,
  monthStart: string,
): Promise<TranslationProviderDetail[]> {
  const { data, error } = await supabase
    .from('translation_usage_log')
    .select('provider, input_tokens, output_tokens, cost_usd')
    .gte('created_at', monthStart);

  if (error || !data?.length) {
    return [];
  }

  const grouped = new Map<
    TranslationProviderId,
    { inputTokens: number; outputTokens: number; costUsd: number; callCount: number }
  >();

  for (const row of data as TranslationLogAggRow[]) {
    const provider = row.provider;
    const existing = grouped.get(provider) ?? {
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      callCount: 0,
    };
    existing.inputTokens += Number(row.input_tokens) || 0;
    existing.outputTokens += Number(row.output_tokens) || 0;
    existing.costUsd += Number(row.cost_usd) || 0;
    existing.callCount += 1;
    grouped.set(provider, existing);
  }

  const totalCost = [...grouped.values()].reduce((sum, item) => sum + item.costUsd, 0);

  return [...grouped.entries()].map(([provider, stats]) => ({
    provider,
    label: providerDisplayLabel(provider),
    inputTokens: stats.inputTokens,
    outputTokens: stats.outputTokens,
    costUsd: Math.round(stats.costUsd * 10000) / 10000,
    callCount: stats.callCount,
    percent: totalCost > 0 ? Math.round((stats.costUsd / totalCost) * 100) : 0,
  }));
}

async function buildTranslationCard(
  supabase: SupabaseClient,
  primaryProvider: TranslationProviderId,
  monthStart: string,
): Promise<TranslationUsageCard> {
  const [summary, providerDetails] = await Promise.all([
    collectTranslationCostSummary(supabase, {
      primaryProvider,
      geminiModel: process.env.GEMINI_MODEL,
      openRouterModel: process.env.OPENROUTER_FALLBACK_MODEL,
    }),
    collectTranslationProviderDetails(supabase, monthStart),
  ]);

  if (!summary) {
    return {
      monthTotalUsd: 0,
      totalTokens: 0,
      primaryModelLabel: '—',
      providers: [],
      providerDetails,
    };
  }

  return {
    monthTotalUsd: summary.monthTotalUsd,
    totalTokens: summary.totalTokens,
    primaryModelLabel: summary.primaryModelLabel,
    providers: summary.providers.map((provider) => ({
      label: provider.label,
      costUsd: provider.costUsd,
      percent: provider.percent,
    })),
    providerDetails,
  };
}

function buildProxyUsageMetrics(monthRows: ScrapeRunAggRow[], weekRows: ScrapeRunAggRow[]) {
  const requestCount = monthRows.reduce((sum, row) => sum + (row.http_requests ?? 0), 0);
  const estimatedTrafficBytes = requestCount * PROXY_BYTES_PER_REQUEST;
  const blockedRunCount = weekRows.filter(isBlockedRun).length;
  const totalRunCount = weekRows.length;
  const blockRatePercent =
    totalRunCount > 0 ? Math.round((blockedRunCount / totalRunCount) * 1000) / 10 : 0;

  return {
    requestCount,
    estimatedTrafficBytes,
    blockRatePercent,
    blockedRunCount,
    totalRunCount,
  };
}

async function buildProxyCard(
  monthRows: ScrapeRunAggRow[],
  weekRows: ScrapeRunAggRow[],
  proxyUrl: string | null,
): Promise<ProxyUsageCard> {
  const metrics = buildProxyUsageMetrics(monthRows, weekRows);
  const activeProviderId = resolveActiveProxyProviderId(proxyUrl);
  const providers = buildProxyProviderStatuses(activeProviderId);
  const activeProvider = activeProviderId ? getProxyProviderCatalogEntry(activeProviderId) : null;
  const estimatedCostUsd = activeProvider
    ? estimateProxyCostUsd(metrics.estimatedTrafficBytes, activeProvider.pricePerGbUsd)
    : 0;

  let balanceUsd: number | null = null;
  let balanceSource: ProxyUsageCard['balanceSource'] = null;
  let balanceError: string | null = null;
  let remainingGbFromApi: number | null = null;

  if (activeProviderId === 'dataimpulse') {
    const balanceInfo = await fetchDataImpulseBalanceInfo();
    balanceUsd = balanceInfo.balanceUsd;
    balanceSource = balanceInfo.source;
    balanceError = balanceInfo.error;
    remainingGbFromApi = balanceInfo.remainingGb;
  }

  const { remainingGb, note } = resolveRemainingTrafficGb({
    remainingGbFromApi,
    remainingGbFromEnv: null,
    planGb: parseOptionalGbEnv('DATAIMPULSE_PLAN_GB'),
    usedBytes: metrics.estimatedTrafficBytes,
  });

  return {
    ...metrics,
    configured: Boolean(proxyUrl?.trim()),
    activeProviderId,
    activeProviderLabel: activeProvider?.label ?? null,
    maskedProxyHost: proxyUrl ? maskProxyHost(proxyUrl) : null,
    providers,
    estimatedCostUsd,
    balanceUsd,
    remainingTrafficGb: remainingGb,
    remainingTrafficNote: note,
    balanceSource,
    balanceError,
    activeDashboardUrl: activeProvider?.dashboardUrl ?? null,
    activeDashboardLabel: activeProvider?.dashboardLabel ?? null,
  };
}

function buildNotificationCard(input: {
  telegramChatId: string | null;
  alertEmail: string | null;
  supabaseLevel: QuotaLevel;
}): NotificationHealthCard {
  const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const telegramTarget = input.telegramChatId ?? process.env.TELEGRAM_CHAT_ID ?? null;
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM);
  const resendTarget = input.alertEmail ?? process.env.ALERT_TO ?? null;

  return {
    telegramConfigured: telegramConfigured && Boolean(telegramTarget),
    telegramTarget,
    resendConfigured: resendConfigured && Boolean(resendTarget),
    resendTarget,
    quotaHealthy: input.supabaseLevel !== 'red',
  };
}

export function estimateMonthlyCloudSpend(snapshot: PlatformUsageSnapshot): number {
  return (
    snapshot.vercel.estimatedCostUsd +
    snapshot.flyio.estimatedCostUsd +
    snapshot.translation.monthTotalUsd
  );
}

export function estimateFreeTierSafetyPercent(snapshot: PlatformUsageSnapshot): number {
  const dbHeadroom = 100 - snapshot.supabase.databasePercent;
  const storageHeadroom = 100 - snapshot.supabase.storagePercent;
  const translationHeadroom =
    snapshot.translation.monthTotalUsd >= 10
      ? 0
      : Math.round(((10 - snapshot.translation.monthTotalUsd) / 10) * 100);
  return Math.round((dbHeadroom + storageHeadroom + translationHeadroom) / 3);
}

export async function collectPlatformUsageSnapshot(
  supabase: SupabaseClient,
): Promise<PlatformUsageSnapshot> {
  const monthStart = monthStartIso();
  const weekStart = sevenDaysAgoIso();

  const [
    quotaSnapshot,
    { data: monthRuns, error: monthError },
    { data: weekRuns, error: weekError },
    { data: configRow, error: configError },
    { count: activeListingsCount },
  ] = await Promise.all([
    collectQuotaUsageSnapshot(supabase),
    supabase
      .from('scrape_runs')
      .select(
        'wall_time_seconds, http_requests, status, failure_reason, degraded, trigger_type',
      )
      .gte('started_at', monthStart),
    supabase
      .from('scrape_runs')
      .select(
        'wall_time_seconds, http_requests, status, failure_reason, degraded, trigger_type',
      )
      .gte('started_at', weekStart),
    supabase
      .from('scraper_global_config')
      .select('translation_provider, telegram_chat_id, alert_email')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  if (monthError) {
    throw new Error(`scrape_runs month aggregate failed: ${monthError.message}`);
  }
  if (weekError) {
    throw new Error(`scrape_runs week aggregate failed: ${weekError.message}`);
  }
  if (configError) {
    throw new Error(`scraper_global_config read failed: ${configError.message}`);
  }

  const monthRows = (monthRuns ?? []) as ScrapeRunAggRow[];
  const weekRows = (weekRuns ?? []) as ScrapeRunAggRow[];
  const primaryProvider =
    (configRow?.translation_provider as TranslationProviderId | undefined) ?? 'gemini';

  const apiRequestsMonth =
    monthRows.reduce((sum, row) => sum + (row.http_requests ?? 0), 0) + monthRows.length * 12;
  const mauEstimate = Math.max(1, Math.round((activeListingsCount ?? 0) * 0.04));

  const vercelCard = buildVercelCard(monthRows);
  const flyioCard = buildFlyCard(monthRows);
  const supabaseCard = buildSupabaseCard(quotaSnapshot, apiRequestsMonth, mauEstimate);
  const translationCard = await buildTranslationCard(supabase, primaryProvider, monthStart);
  const proxyUrl = await resolveSubitoProxyUrl(supabase);
  const proxyCard = await buildProxyCard(monthRows, weekRows, proxyUrl);

  return {
    capturedAt: new Date().toISOString(),
    supabase: supabaseCard,
    vercel: vercelCard,
    flyio: flyioCard,
    compute: buildComputeCard(vercelCard, flyioCard),
    translation: translationCard,
    proxy: proxyCard,
    notifications: buildNotificationCard({
      telegramChatId: (configRow?.telegram_chat_id as string | null) ?? null,
      alertEmail: (configRow?.alert_email as string | null) ?? null,
      supabaseLevel: classifyQuotaUsage(
        quotaSnapshot.databaseBytes,
        SUPABASE_FREE_LIMITS.databaseBytes,
      ),
    }),
  };
}

export function formatHours(hours: number): string {
  if (hours >= 100) {
    return `${Math.round(hours)} hrs`;
  }
  return `${hours.toFixed(1)} hrs`;
}

export function formatTraffic(bytes: number): string {
  return formatQuotaBytes(bytes);
}

export function formatPlatformUsd(amount: number): string {
  return formatUsdCompact(amount);
}

export function formatPlatformTokens(tokens: number): string {
  return formatTokenCount(tokens);
}
