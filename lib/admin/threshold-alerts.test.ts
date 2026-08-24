import { describe, expect, it } from 'vitest';
import {
  COMPUTE_HOURLY_RATE_USD,
  PROXY_BYTES_PER_REQUEST,
  formatHours,
} from './platform-usage';
import {
  ALERT_COOLDOWN_MS,
  DEFAULT_THRESHOLDS,
  evaluateThresholds,
  type ThresholdAlert,
} from './threshold-alerts';
import { buildProxyProviderStatuses } from './proxy-providers';
import type { PlatformUsageSnapshot } from './platform-usage';

function baseSnapshot(overrides: Partial<PlatformUsageSnapshot> = {}): PlatformUsageSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    supabase: {
      databaseBytes: 100 * 1024 * 1024,
      databaseLimitBytes: 500 * 1024 * 1024,
      databasePercent: 20,
      databaseLevel: 'green',
      storageBytes: 200 * 1024 * 1024,
      storageLimitBytes: 1024 * 1024 * 1024,
      storagePercent: 19.5,
      storageLevel: 'green',
      storageObjectCount: 42,
      estimatedEgressBytes: 30 * 1024 * 1024,
      egressNote: 'test',
      indexBytesEstimate: 22 * 1024 * 1024,
      apiRequestsMonth: 1200,
      mauEstimate: 48,
    },
    compute: {
      wallTimeHours: 120,
      estimatedCostUsd: 120 * COMPUTE_HOURLY_RATE_USD,
      runCount: 30,
    },
    vercel: {
      bandwidthBytes: 512_000,
      edgeRequests: 125,
      estimatedCostUsd: 0,
      planLabel: 'Hobby',
      buildMinutes: 15,
      cdnHitRatePercent: 94,
    },
    flyio: {
      instanceHours: 120,
      cronJobRuns: 30,
      cpuUsagePercent: 16,
      ramUsagePercent: 24,
      oomEvents: 0,
      estimatedCostUsd: 120 * 0.0034,
    },
    translation: {
      monthTotalUsd: 3.4,
      totalTokens: 120_000,
      primaryModelLabel: 'Gemini flash',
      providers: [],
      providerDetails: [],
    },
    proxy: {
      requestCount: 12_000,
      estimatedTrafficBytes: 12_000 * PROXY_BYTES_PER_REQUEST,
      blockRatePercent: 5,
      blockedRunCount: 1,
      totalRunCount: 20,
      configured: true,
      activeProviderId: 'dataimpulse',
      activeProviderLabel: 'DataImpulse',
      maskedProxyHost: 'gw.dataimpulse.com:823',
      providers: buildProxyProviderStatuses('dataimpulse'),
      estimatedCostUsd: 1.14,
      balanceUsd: null,
      remainingTrafficGb: null,
      remainingTrafficNote: null,
      balanceSource: null,
      balanceError: null,
      activeDashboardUrl: 'https://app.dataimpulse.com/dashboard',
      activeDashboardLabel: 'DataImpulse Dashboard',
    },
    notifications: {
      telegramConfigured: true,
      telegramTarget: '123',
      resendConfigured: false,
      resendTarget: null,
      quotaHealthy: true,
    },
    ...overrides,
  };
}

describe('platform-usage helpers', () => {
  it('formats compute hours', () => {
    expect(formatHours(120)).toBe('120 hrs');
    expect(formatHours(12.5)).toBe('12.5 hrs');
  });
});

describe('evaluateThresholds', () => {
  it('returns empty when all metrics are healthy', () => {
    expect(evaluateThresholds(baseSnapshot())).toEqual([]);
  });

  it('flags supabase db over 80%', () => {
    const alerts = evaluateThresholds(
      baseSnapshot({
        supabase: {
          ...baseSnapshot().supabase,
          databasePercent: 82,
        },
      }),
    );
    expect(alerts.some((alert: ThresholdAlert) => alert.key === 'supabase_db')).toBe(true);
    expect(alerts[0]?.message).toContain('82%');
  });

  it('flags translation cost over $10/month', () => {
    const alerts = evaluateThresholds(
      baseSnapshot({
        translation: {
          ...baseSnapshot().translation,
          monthTotalUsd: 12.5,
        },
      }),
    );
    expect(alerts.some((alert) => alert.key === 'translation_cost')).toBe(true);
  });

  it('flags proxy block rate over 20%', () => {
    const alerts = evaluateThresholds(
      baseSnapshot({
        proxy: {
          ...baseSnapshot().proxy,
          blockRatePercent: 25,
          blockedRunCount: 5,
          totalRunCount: 20,
        },
      }),
    );
    expect(alerts.some((alert) => alert.key === 'proxy_block_rate')).toBe(true);
  });
});

describe('DEFAULT_THRESHOLDS', () => {
  it('matches product defaults', () => {
    expect(DEFAULT_THRESHOLDS.supabaseDbPercent).toBe(80);
    expect(DEFAULT_THRESHOLDS.translationMonthlyUsd).toBe(10);
    expect(DEFAULT_THRESHOLDS.proxyBlockRatePercent).toBe(20);
  });

  it('cooldown is 6 hours', () => {
    expect(ALERT_COOLDOWN_MS).toBe(6 * 60 * 60 * 1000);
  });
});
