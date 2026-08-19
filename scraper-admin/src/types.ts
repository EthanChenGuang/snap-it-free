export type NavTab =
  | 'dashboard'
  | 'sources'
  | 'source-detail'
  | 'runs'
  | 'run-detail'
  | 'rejects'
  | 'translation'
  | 'settings';

export type AntiBlockStrategy = 'Conservative' | 'Standard' | 'Aggressive';

export interface Source {
  id: string;
  name: string;
  status: 'Running' | 'Completed' | 'Failed' | 'Coming soon' | 'Idle';
  enabled: boolean;
  interval: number; // in minutes
  antiBlock: AntiBlockStrategy;
  targetUrls: string[];
  lastRun?: string;
  lastRunDetails?: {
    status: 'Success' | 'Failed';
    listingsCount: number;
    timestamp: string;
  };
  logoUrl?: string;
  isSupported: boolean;
  note?: string;
}

export interface RunLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface RunItem {
  id: string;
  source: string;
  startedAt: string;
  duration: string;
  status: 'Success' | 'Failed' | 'Running';
  found: number;
  inserted: number;
  updated: number;
  skippedRejected: number;
  selectorRate: number; // e.g. 98
  logs: RunLog[];
}

export interface RejectPayload {
  id: string;
  source: string;
  foundAt: string;
  reason: string;
  ruleTriggered: string;
  preview: string;
  rawJson: {
    id: string;
    source: string;
    url: string;
    scrapedAt: string;
    rawHtml: string;
    parsedData: {
      title: string;
      description: string;
      price?: number | null;
      currency?: string;
      location?: {
        city: string;
        region?: string;
        address?: string;
      };
      attributes?: Record<string, any>;
    };
    pipelineMetadata: {
      workerId: string;
      confidenceScore: number;
      translationRequired: boolean;
    };
  };
}

export interface TranslationItem {
  id: string;
  source: string;
  title: string;
  description: string;
  errorMessage: string;
  errorType: 'warning' | 'error';
  retries: number;
  isTranslating?: boolean;
}

export interface AlertItem {
  id: string;
  source: string;
  message: string;
  timestamp: string;
  severity: 'error' | 'warning';
}

export interface SystemConfig {
  globalPause: boolean;
  proxyUrl: string;
  telegramChatId: string;
  alertEmailTo: string;
  autoTranslate: boolean;
}
