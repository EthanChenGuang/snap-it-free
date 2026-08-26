import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PROXY_PROVIDER_ORDER,
  resolvePrimaryProxyUrl,
  resolveProxyChain,
} from './proxy-chain';

describe('PROXY_PROVIDER_ORDER', () => {
  it('matches operator policy DataImpulse → Webshare → Decodo', () => {
    expect(PROXY_PROVIDER_ORDER).toEqual(['dataimpulse', 'webshare', 'decodo']);
  });
});

describe('resolveProxyChain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('orders configured providers by priority', () => {
    vi.stubEnv(
      'PROXY_URL_DATAIMPULSE',
      'http://di:pass@gw.dataimpulse.com:823',
    );
    vi.stubEnv('PROXY_URL_WEBSHARE', 'http://ws:pass@p.webshare.io:80');
    vi.stubEnv('PROXY_URL_DECODO', 'http://dc:pass@gate.decodo.com:7000');

    const chain = resolveProxyChain();
    expect(chain.map((entry) => entry.provider)).toEqual([
      'dataimpulse',
      'webshare',
      'decodo',
    ]);
  });

  it('skips missing providers without breaking order', () => {
    vi.stubEnv('PROXY_URL_DECODO', 'http://dc:pass@gate.decodo.com:7000');
    const chain = resolveProxyChain();
    expect(chain.map((entry) => entry.provider)).toEqual(['decodo']);
  });

  it('maps legacy PROXY_URL static IP to webshare tier', () => {
    vi.stubEnv('PROXY_URL', 'http://user:pass@64.137.96.74:6641');
    vi.stubEnv('PROXY_URL_DECODO', 'http://dc:pass@gate.decodo.com:7000');

    const chain = resolveProxyChain();
    expect(chain.map((entry) => entry.provider)).toEqual(['webshare', 'decodo']);
    expect(chain[0]?.hostMasked).toBe('64.137.96.74:6641');
  });

  it('lets db proxy override its provider slot', () => {
    vi.stubEnv('PROXY_URL_WEBSHARE', 'http://ws:pass@p.webshare.io:80');
    vi.stubEnv('PROXY_URL_DECODO', 'http://dc:pass@gate.decodo.com:7000');

    const chain = resolveProxyChain({
      dbProxyUrl: 'http://db:pass@gw.dataimpulse.com:823',
    });
    expect(chain.map((entry) => entry.provider)).toEqual([
      'dataimpulse',
      'webshare',
      'decodo',
    ]);
    expect(chain[0]?.url).toContain('gw.dataimpulse.com');
  });

  it('resolvePrimaryProxyUrl returns first chain entry', () => {
    vi.stubEnv('PROXY_URL_DATAIMPULSE', 'http://di:pass@gw.dataimpulse.com:823');
    vi.stubEnv('PROXY_URL_DECODO', 'http://dc:pass@gate.decodo.com:7000');
    expect(resolvePrimaryProxyUrl()).toContain('gw.dataimpulse.com');
  });
});
