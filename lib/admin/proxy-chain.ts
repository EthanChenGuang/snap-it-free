import {
  detectProxyProviderId,
  maskProxyHost,
  type ProxyProviderId,
} from './proxy-providers';

/** Runtime failover order — highest priority first (operator policy). */
export const PROXY_PROVIDER_ORDER: ProxyProviderId[] = ['dataimpulse', 'webshare', 'decodo'];

export type ProxyChainEntry = {
  provider: ProxyProviderId;
  url: string;
  hostMasked: string;
};

function envFirst(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

function buildDataImpulseProxyUrl(): string | null {
  const direct = envFirst('PROXY_URL_DATAIMPULSE');
  if (direct) {
    return direct;
  }

  const login = envFirst(
    'DATAIMPULSE_PROXY_LOGIN',
    'DATAIMPULSE_LOGIN',
    'DATAIMPULSE_USERNAME',
  );
  const password = envFirst('DATAIMPULSE_PROXY_PASSWORD', 'DATAIMPULSE_PASSWORD');
  if (!login || !password) {
    return null;
  }

  const port = process.env.DATAIMPULSE_PORT?.trim() || '823';
  const country = process.env.DATAIMPULSE_COUNTRY?.trim() || 'it';
  const username = login.includes('__cr.') ? login : `${login}__cr.${country}`;
  return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@gw.dataimpulse.com:${port}`;
}

function buildWebshareProxyUrl(): string | null {
  const direct = envFirst('PROXY_URL_WEBSHARE');
  if (direct) {
    return direct;
  }

  const baseUser = envFirst('WEBSHARE_PROXY_USERNAME', 'WEBSHARE_USERNAME');
  const password = envFirst('WEBSHARE_PROXY_PASSWORD', 'WEBSHARE_PASSWORD');
  if (!baseUser || !password) {
    return null;
  }

  const port = process.env.WEBSHARE_PORT?.trim() || '80';
  const city = process.env.WEBSHARE_CITY?.trim().toLowerCase();
  const userRoot = baseUser.replace(/-it(-.*)?$/, '');
  const parts = [userRoot, 'it'];
  if (city) {
    parts.push(`city_${city.replace(/\s+/g, '_')}`);
  }
  parts.push('rotate');
  const username = parts.join('-');
  return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@p.webshare.io:${port}`;
}

function normalizeDecodoUser(input: string): string {
  let user = input.trim();
  if (user.startsWith('user-')) {
    user = user.slice(5);
  }
  const geoIdx = user.search(/-(country|city|session|sessionduration|continent|asn|state|zip)-/);
  if (geoIdx !== -1) {
    user = user.slice(0, geoIdx);
  }
  return user;
}

function buildDecodoProxyUrl(): string | null {
  const direct = envFirst('PROXY_URL_DECODO');
  if (direct) {
    return direct;
  }

  const rawUser = envFirst('DECODO_PROXY_USERNAME', 'DECODO_USERNAME');
  const password = envFirst('DECODO_PROXY_PASSWORD', 'DECODO_PASSWORD');
  if (!rawUser || !password) {
    return null;
  }

  const port = process.env.DECODO_PORT?.trim() || '7000';
  const city = process.env.DECODO_CITY?.trim().toLowerCase().replace(/\s+/g, '_');
  const sessionId = process.env.DECODO_SESSION?.trim();
  const sessionMinutes = process.env.DECODO_SESSION_MINUTES?.trim();

  const baseUser = normalizeDecodoUser(rawUser);
  const parts = ['user', baseUser, 'country-it'];
  if (city) {
    parts.push(`city-${city}`);
  }
  if (sessionId) {
    parts.push(`session-${sessionId}`);
    if (sessionMinutes) {
      parts.push(`sessionduration-${sessionMinutes}`);
    }
  }

  const username = parts.join('-');
  return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@gate.decodo.com:${port}`;
}

/** Build per-provider URLs from env (does not merge legacy PROXY_URL). */
export function buildProviderProxyUrlsFromEnv(): Partial<Record<ProxyProviderId, string>> {
  const urls: Partial<Record<ProxyProviderId, string>> = {};
  const dataimpulse = buildDataImpulseProxyUrl();
  const webshare = buildWebshareProxyUrl();
  const decodo = buildDecodoProxyUrl();
  if (dataimpulse) urls.dataimpulse = dataimpulse;
  if (webshare) urls.webshare = webshare;
  if (decodo) urls.decodo = decodo;
  return urls;
}

function insertLegacyProxyUrl(
  chain: ProxyChainEntry[],
  legacyUrl: string,
): ProxyChainEntry[] {
  const provider = detectProxyProviderId(legacyUrl);
  const hostMasked = maskProxyHost(legacyUrl);

  if (provider) {
    const existingIdx = chain.findIndex((entry) => entry.provider === provider);
    if (existingIdx >= 0) {
      if (chain[existingIdx].url !== legacyUrl) {
        chain[existingIdx] = { provider, url: legacyUrl, hostMasked };
      }
      return chain;
    }
    const next = [...chain];
    const orderIdx = PROXY_PROVIDER_ORDER.indexOf(provider);
    let insertAt = next.findIndex(
      (entry) => PROXY_PROVIDER_ORDER.indexOf(entry.provider) > orderIdx,
    );
    if (insertAt === -1) {
      insertAt = next.length;
    }
    next.splice(insertAt, 0, { provider, url: legacyUrl, hostMasked });
    return next;
  }

  // Static / unknown host — treat as Webshare tier (e.g. dedicated IP endpoints).
  if (!chain.some((entry) => entry.url === legacyUrl)) {
    const webshareIdx = chain.findIndex((entry) => entry.provider === 'webshare');
    const entry: ProxyChainEntry = {
      provider: 'webshare',
      url: legacyUrl,
      hostMasked,
    };
    if (webshareIdx >= 0) {
      const next = [...chain];
      next[webshareIdx] = entry;
      return next;
    }
    const orderIdx = PROXY_PROVIDER_ORDER.indexOf('webshare');
    const next = [...chain];
    let insertAt = next.findIndex(
      (item) => PROXY_PROVIDER_ORDER.indexOf(item.provider) > orderIdx,
    );
    if (insertAt === -1) {
      insertAt = next.length;
    }
    next.splice(insertAt, 0, entry);
    return next;
  }

  return chain;
}

/**
 * Resolve ordered proxy chain for crawlers.
 * Priority: DataImpulse → Webshare → Decodo; DB proxy_enc overrides its provider slot.
 * Legacy PROXY_URL fills the matching provider slot when PROXY_URL_* unset.
 */
export function resolveProxyChain(options?: {
  dbProxyUrl?: string | null;
}): ProxyChainEntry[] {
  const fromEnv = buildProviderProxyUrlsFromEnv();
  let chain: ProxyChainEntry[] = [];

  for (const provider of PROXY_PROVIDER_ORDER) {
    let url = fromEnv[provider];
    if (options?.dbProxyUrl) {
      const dbProvider = detectProxyProviderId(options.dbProxyUrl);
      if (dbProvider === provider) {
        url = options.dbProxyUrl;
      }
    }
    if (url) {
      chain.push({
        provider,
        url,
        hostMasked: maskProxyHost(url),
      });
    }
  }

  const legacy = process.env.PROXY_URL?.trim();
  if (legacy) {
    chain = insertLegacyProxyUrl(chain, legacy);
  }

  if (options?.dbProxyUrl) {
    const dbProvider = detectProxyProviderId(options.dbProxyUrl);
    if (!dbProvider && !chain.some((entry) => entry.url === options.dbProxyUrl)) {
      chain = insertLegacyProxyUrl(chain, options.dbProxyUrl);
    }
  }

  const seen = new Set<string>();
  return chain.filter((entry) => {
    if (seen.has(entry.url)) {
      return false;
    }
    seen.add(entry.url);
    return true;
  });
}

export function resolvePrimaryProxyUrl(options?: {
  dbProxyUrl?: string | null;
}): string | undefined {
  return resolveProxyChain(options)[0]?.url;
}

export function resolveProxyUrlList(options?: {
  dbProxyUrl?: string | null;
}): string[] {
  return resolveProxyChain(options).map((entry) => entry.url);
}
