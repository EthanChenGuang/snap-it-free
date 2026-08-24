import { formatQuotaBytes } from './quota-usage';
import { formatTokenCount, formatUsdCompact } from './translation-cost';
import type { TranslationProviderId } from './translate';
import type { QuotaLevel } from './quota-usage';
import type { ProxyProviderId, ProxyProviderStatus } from './proxy-providers';

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

export type ProxyMetricSource = 'estimated' | 'provider_api' | 'env';

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
  trafficBytes: number;
  trafficSource: ProxyMetricSource;
  costUsd: number;
  costSource: ProxyMetricSource;
  balanceUsd: number | null;
  remainingTrafficGb: number | null;
  remainingTrafficSource: ProxyMetricSource | null;
  remainingTrafficNote: string | null;
  balanceSource: 'api' | 'env' | null;
  balanceError: string | null;
  activeDashboardUrl: string | null;
  activeDashboardLabel: string | null;
  providerSyncedAt: string | null;
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
