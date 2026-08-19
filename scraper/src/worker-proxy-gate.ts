export type CrawlMode = 'incremental' | 'full';

export type DecideCrawlModeParams = {
  lastFullRefreshAt: Date | null;
  fullRefreshHours: number;
  jobCrawlMode?: CrawlMode | null;
  now?: Date;
};

export function decideCrawlMode(params: DecideCrawlModeParams): CrawlMode {
  if (params.jobCrawlMode === 'full') {
    return 'full';
  }

  // Manual incremental jobs honor UI choice even before first successful full refresh.
  if (params.jobCrawlMode === 'incremental') {
    return 'incremental';
  }

  if (params.lastFullRefreshAt == null) {
    return 'full';
  }

  const now = params.now ?? new Date();
  const ageMs = now.getTime() - params.lastFullRefreshAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours >= params.fullRefreshHours) {
    return 'full';
  }

  return 'incremental';
}

export function isProductionSoftProxyContext(): boolean {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.FLY_APP_NAME?.trim());
}

export type ProxyGateResult = {
  degraded: boolean;
  warning?: string;
};

export function evaluateProxyGate(params: {
  isProduction: boolean;
  proxyUrl: string | undefined;
}): ProxyGateResult {
  if (params.proxyUrl) {
    return { degraded: false };
  }

  if (params.isProduction) {
    return {
      degraded: true,
      warning:
        '[worker] Production run without proxy — marking run degraded (D-15-18)',
    };
  }

  return {
    degraded: false,
    warning: '[worker] No proxy configured — dev/local warning (D-15-17)',
  };
}
