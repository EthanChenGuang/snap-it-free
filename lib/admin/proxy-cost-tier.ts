export type ProxyCostTier =
  | 'direct_free'
  | 'webshare_budget'
  | 'residential_recommended'
  | 'insufficient_data';

export type ProxyCostTierMeta = {
  tier: ProxyCostTier;
  labelZh: string;
  labelEn: string;
  hint: string;
  suggestedProvider: string | null;
  priceHint: string | null;
};

const TIER_DETAILS: Record<
  ProxyCostTier,
  Omit<ProxyCostTierMeta, 'tier'>
> = {
  direct_free: {
    labelZh: '直连免费',
    labelEn: 'Direct (free)',
    hint: '7 日封禁率低于 50% — 保持 proxy 未配置，监控 degraded 运行。',
    suggestedProvider: null,
    priceHint: '€0',
  },
  webshare_budget: {
    labelZh: 'Webshare 经济档',
    labelEn: 'Webshare budget',
    hint: '7 日封禁率 50%–70% — 优先试用 Webshare 免费 1 GB/月，再按需付费。',
    suggestedProvider: 'Webshare',
    priceHint: '~$1.40/GB',
  },
  residential_recommended: {
    labelZh: '住宅代理推荐',
    labelEn: 'Residential recommended',
    hint: '7 日封禁率 ≥ 70% — 配置意大利住宅代理（Webshare 或 IPRoyal）。',
    suggestedProvider: 'Webshare / IPRoyal',
    priceHint: '$1.40–1.75/GB',
  },
  insufficient_data: {
    labelZh: '数据不足',
    labelEn: 'Insufficient data',
    hint: '7 日内 Subito 运行次数不足 — 继续直连并等待更多 scrape_runs。',
    suggestedProvider: null,
    priceHint: null,
  },
};

export function computeProxyCostTier(
  blockedRatio7d: number | null,
): ProxyCostTierMeta {
  if (blockedRatio7d === null) {
    return { tier: 'insufficient_data', ...TIER_DETAILS.insufficient_data };
  }
  if (blockedRatio7d < 0.5) {
    return { tier: 'direct_free', ...TIER_DETAILS.direct_free };
  }
  if (blockedRatio7d < 0.7) {
    return { tier: 'webshare_budget', ...TIER_DETAILS.webshare_budget };
  }
  return {
    tier: 'residential_recommended',
    ...TIER_DETAILS.residential_recommended,
  };
}

export function formatBlockedRatioPercent(blockedRatio7d: number | null): string | null {
  if (blockedRatio7d === null) {
    return null;
  }
  return `${(blockedRatio7d * 100).toFixed(1)}%`;
}
