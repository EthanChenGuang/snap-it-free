export type ScrapeRunStatus = 'success' | 'failed' | 'partial';

export type SourceLastRun = {
  id: string;
  status: ScrapeRunStatus;
  startedAt: string;
  finishedAt: string | null;
  listingsFound: number;
  failureReason: string | null;
};

export type SourceWithLastRun = {
  slug: string;
  displayName: string;
  implementationStatus: 'live' | 'coming_soon';
  enabled: boolean;
  intervalMinutes: number;
  antiBlockPreset: string;
  lastRun: SourceLastRun | null;
};

export type SourceDetail = SourceWithLastRun & {
  targetUrls: string[];
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
};

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
};

export type FooterStats = {
  inserted24h: number;
  failedRuns7d: number;
  avgSelectorRate: number | null;
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
};

export type ScrapeRunDetail = ScrapeRunListItem & {
  listingsUpdated: number;
  listingsSkipped: number;
  failureReason: string | null;
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
};
