import { describe, expect, it } from 'vitest';
import {
  buildProxyProviderStatuses,
  detectProxyProviderId,
  estimateProxyCostUsd,
  maskProxyHost,
  resolveActiveProxyProviderId,
  resolveRemainingTrafficGb,
} from './proxy-providers';

describe('detectProxyProviderId', () => {
  it('detects DataImpulse gateway host', () => {
    expect(detectProxyProviderId('http://user:pass@gw.dataimpulse.com:823')).toBe('dataimpulse');
  });

  it('detects Webshare host', () => {
    expect(detectProxyProviderId('http://user:pass@p.webshare.io:80')).toBe('webshare');
  });

  it('detects Decodo host', () => {
    expect(detectProxyProviderId('http://user:pass@gate.decodo.com:7000')).toBe('decodo');
  });
});

describe('resolveActiveProxyProviderId', () => {
  it('prefers hostname detection', () => {
    expect(resolveActiveProxyProviderId('http://user:pass@p.webshare.io:80')).toBe('webshare');
  });

  it('falls back to configured provider when URL host is unknown', () => {
    expect(resolveActiveProxyProviderId('http://user:pass@proxy.example:8080')).toBe('dataimpulse');
  });
});

describe('buildProxyProviderStatuses', () => {
  it('marks only the active provider', () => {
    const statuses = buildProxyProviderStatuses('dataimpulse');
    expect(statuses.find((item) => item.id === 'dataimpulse')?.active).toBe(true);
    expect(statuses.find((item) => item.id === 'webshare')?.active).toBe(false);
    expect(statuses.find((item) => item.id === 'webshare')?.inactiveReason).toContain('暂未启用');
  });
});

describe('estimateProxyCostUsd', () => {
  it('computes pay-as-you-go cost from traffic bytes', () => {
    const oneGb = 1024 * 1024 * 1024;
    expect(estimateProxyCostUsd(oneGb, 1)).toBe(1);
  });
});

describe('maskProxyHost', () => {
  it('masks credentials but keeps host and port', () => {
    expect(maskProxyHost('http://user:pass@gw.dataimpulse.com:823')).toBe('gw.dataimpulse.com:823');
  });
});

describe('resolveRemainingTrafficGb', () => {
  it('prefers API remaining traffic', () => {
    expect(
      resolveRemainingTrafficGb({
        remainingGbFromApi: 4.2,
        remainingGbFromEnv: 1,
        planGb: 5,
        usedBytes: 0,
      }).remainingGb,
    ).toBe(4.2);
  });

  it('derives remaining traffic from plan total minus usage', () => {
    const halfGb = 512 * 1024 * 1024;
    expect(
      resolveRemainingTrafficGb({
        remainingGbFromApi: null,
        remainingGbFromEnv: null,
        planGb: 5,
        usedBytes: halfGb,
      }).remainingGb,
    ).toBe(4.5);
  });
});
