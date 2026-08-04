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
