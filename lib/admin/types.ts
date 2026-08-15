export type ScrapeRunStatus = 'success' | 'failed' | 'partial';

export type SourceLastRun = {
  id: string;
  status: ScrapeRunStatus;
  startedAt: string;
  finishedAt: string | null;
  listingsFound: number;
  failureReason: string | null;
};

export type SourceLastFullSuccess = {
  finishedAt: string;
  listingsFound: number;
};

export type SourceWithLastRun = {
  slug: string;
  displayName: string;
  implementationStatus: 'live' | 'coming_soon';
  enabled: boolean;
  intervalMinutes: number;
  antiBlockPreset: string;
  lastRun: SourceLastRun | null;
  lastFullSuccess: SourceLastFullSuccess | null;
};

export type SourceDetail = SourceWithLastRun & {
  targetUrls: string[];
  sessionConfigured: boolean;
  proxyConfigured: boolean;
};

export type AntiBlockPreset = 'conservative' | 'standard' | 'aggressive';

export type AdminAlert = {
  id: string;
  source: string;
  message: string;
  timestamp: string;
  status: 'failed' | 'partial';
};

export type GlobalAdminStatus = {
  globalPause: boolean;
  lastSyncAt: string | null;
  showDegradedBanner: boolean;
};

export type CrawlMode = 'incremental' | 'full';

export type GlobalSettingsConfig = {
  globalPause: boolean;
  autoTranslate: boolean;
  dailyTranslationCap: number;
  translationProvider: 'gemini' | 'openrouter';
  telegramChatId: string | null;
  alertEmail: string | null;
  proxyConfigured: boolean;
  translationsToday: number;
  translationsResetDate: string;
  updatedAt: string;
  earlyStopK: number;
  fullRefreshHours: number;
  maxPages: number;
  lastBlockReason: string | null;
  degradedRunCount: number;
  showDegradedBanner: boolean;
};

export type FooterStats = {
  inserted24h: number;
  failedRuns7d: number;
  avgSelectorRate: number | null;
};

export type ScrapeRunTrigger = 'cron' | 'manual';

export type ScrapeRunUrlBreakdownItem = {
  url: string;
  label: string;
  listingsFound: number;
  listingsSkippedAtCrawl: number;
  blocked: boolean;
  earlyStopTriggered: boolean;
};

export type ScrapeRunListItem = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  source: string;
  status: ScrapeRunStatus;
  listingsFound: number;
  listingsInserted: number;
  listingsRejected: number;
  selectorHitRate: number | null;
  failureReason: string | null;
  crawlMode: CrawlMode | null;
  triggerType: ScrapeRunTrigger | null;
  wallTimeSeconds: number | null;
  targetUrlCount: number | null;
};

export type ScrapeRunDetail = ScrapeRunListItem & {
  listingsUpdated: number;
  listingsSkipped: number;
  failureReason: string | null;
  listingsSkippedAtCrawl: number;
  httpRequests: number | null;
  degraded: boolean;
  jsonFieldCompleteness: number | null;
  jobId: string | null;
  targetUrlsSnapshot: string[];
  blockedUrlCount: number;
  urlBreakdown: ScrapeRunUrlBreakdownItem[];
};

export type ScrapeRejectItem = {
  id: string;
  scrapeRunId: string | null;
  externalId: string | null;
  rejectReason: string;
  rawSnippet: Record<string, unknown>;
  createdAt: string;
  source: string | null;
};

import type { TranslationCostSummary } from '@/lib/admin/translation-cost';

export type TranslationListingCostDetail = {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  modelLabel: string;
  provider: 'gemini' | 'openrouter';
};

export type TranslationQueueItem = {
  listingId: string;
  externalId: string | null;
  title: string;
  source: string;
  status: 'pending' | 'processing' | 'failed' | 'done';
  statusLabel: string;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
  cost: TranslationListingCostDetail;
};

export type { TranslationCostSummary };
