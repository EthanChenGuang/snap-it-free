export type ProxyProviderId = 'dataimpulse' | 'webshare' | 'decodo';

export type ProxyProviderCatalogEntry = {
  id: ProxyProviderId;
  label: string;
  subtitle: string;
  hostPatterns: string[];
  dashboardUrl: string;
  dashboardLabel: string;
  pricePerGbUsd: number;
  defaultInactiveReason: string;
};

export type ProxyProviderStatus = {
  id: ProxyProviderId;
  label: string;
  subtitle: string;
  active: boolean;
  inactiveReason: string | null;
  dashboardUrl: string;
  dashboardLabel: string;
  pricePerGbUsd: number;
  planTier: 'free' | 'paid';
};

export const PROXY_PROVIDER_CATALOG: ProxyProviderCatalogEntry[] = [
  {
    id: 'dataimpulse',
    label: 'DataImpulse',
    subtitle: 'Residential · gw.dataimpulse.com',
    hostPatterns: ['dataimpulse.com'],
    dashboardUrl: 'https://app.dataimpulse.com/dashboard',
    dashboardLabel: 'DataImpulse Dashboard',
    pricePerGbUsd: 1,
    defaultInactiveReason: '未启用',
  },
  {
    id: 'webshare',
    label: 'Webshare',
    subtitle: 'Rotating residential · p.webshare.io',
    hostPatterns: ['webshare.io'],
    dashboardUrl: 'https://dashboard.webshare.io/',
    dashboardLabel: 'Webshare Dashboard',
    pricePerGbUsd: 1.4,
    defaultInactiveReason: '价格较高，暂未启用',
  },
  {
    id: 'decodo',
    label: 'Decodo',
    subtitle: 'Residential · gate.decodo.com',
    hostPatterns: ['decodo.com', 'smartproxy.com'],
    dashboardUrl: 'https://app.decodo.com/',
    dashboardLabel: 'Decodo Dashboard',
    pricePerGbUsd: 2,
    defaultInactiveReason: '价格较高，暂未启用',
  },
];

export function maskProxyHost(proxyUrl: string): string {
  try {
    const parsed = new URL(proxyUrl);
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.hostname}${port}`;
  } catch {
    return '[invalid-proxy-url]';
  }
}

export function detectProxyProviderId(proxyUrl: string | null | undefined): ProxyProviderId | null {
  if (!proxyUrl?.trim()) {
    return null;
  }

  let hostname = '';
  try {
    hostname = new URL(proxyUrl.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }

  for (const provider of PROXY_PROVIDER_CATALOG) {
    if (provider.hostPatterns.some((pattern) => hostname.includes(pattern))) {
      return provider.id;
    }
  }

  return null;
}

export function resolveActiveProxyProviderId(
  proxyUrl: string | null | undefined,
): ProxyProviderId | null {
  const fromUrl = detectProxyProviderId(proxyUrl);
  if (fromUrl) {
    return fromUrl;
  }

  const fromEnv = process.env.PROXY_PROVIDER?.trim().toLowerCase();
  if (fromEnv === 'dataimpulse' || fromEnv === 'webshare' || fromEnv === 'decodo') {
    return fromEnv;
  }

  if (proxyUrl?.trim()) {
    return 'dataimpulse';
  }

  return null;
}

export function getProxyProviderCatalogEntry(id: ProxyProviderId): ProxyProviderCatalogEntry {
  const entry = PROXY_PROVIDER_CATALOG.find((provider) => provider.id === id);
  if (!entry) {
    throw new Error(`Unknown proxy provider: ${id}`);
  }
  return entry;
}

export function buildProxyProviderStatuses(
  activeProviderId: ProxyProviderId | null,
): ProxyProviderStatus[] {
  return PROXY_PROVIDER_CATALOG.map((provider) => {
    const active = provider.id === activeProviderId;
    return {
      id: provider.id,
      label: provider.label,
      subtitle: provider.subtitle,
      active,
      inactiveReason: active ? null : provider.defaultInactiveReason,
      dashboardUrl: provider.dashboardUrl,
      dashboardLabel: provider.dashboardLabel,
      pricePerGbUsd: provider.pricePerGbUsd,
      planTier: provider.id === 'webshare' ? 'free' : 'paid',
    };
  });
}

export function estimateProxyCostUsd(trafficBytes: number, pricePerGbUsd: number): number {
  if (!Number.isFinite(trafficBytes) || trafficBytes <= 0) {
    return 0;
  }
  const gb = trafficBytes / (1024 * 1024 * 1024);
  return Math.round(gb * pricePerGbUsd * 10000) / 10000;
}

export function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

export function parseOptionalGbEnv(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function resolveRemainingTrafficGb(input: {
  remainingGbFromApi: number | null;
  remainingGbFromEnv: number | null;
  planGb: number | null;
  usedBytes: number;
}): { remainingGb: number | null; note: string | null } {
  if (input.remainingGbFromApi != null) {
    return { remainingGb: input.remainingGbFromApi, note: '来自 DataImpulse API' };
  }
  if (input.remainingGbFromEnv != null) {
    return { remainingGb: input.remainingGbFromEnv, note: '来自环境变量' };
  }
  if (input.planGb != null) {
    const usedGb = bytesToGb(input.usedBytes);
    return {
      remainingGb: Math.max(0, Math.round((input.planGb - usedGb) * 100) / 100),
      note: '按套餐总量减去本月估算用量',
    };
  }
  return { remainingGb: null, note: null };
}
