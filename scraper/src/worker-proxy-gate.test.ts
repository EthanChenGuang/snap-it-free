import { afterEach, describe, expect, it } from 'vitest';
import {
  decideCrawlMode,
  evaluateProxyGate,
  isProductionSoftProxyContext,
} from './worker-proxy-gate.js';

describe('decideCrawlMode', () => {
  const now = new Date('2026-08-11T12:00:00.000Z');

  it('returns full when lastFullRefreshAt is null', () => {
    expect(
      decideCrawlMode({
        lastFullRefreshAt: null,
        fullRefreshHours: 24,
        now,
      }),
    ).toBe('full');
  });

  it('returns full at exact fullRefreshHours boundary', () => {
    const lastFullRefreshAt = new Date('2026-08-10T12:00:00.000Z');
    expect(
      decideCrawlMode({
        lastFullRefreshAt,
        fullRefreshHours: 24,
        now,
      }),
    ).toBe('full');
  });

  it('returns incremental when within refresh window', () => {
    const lastFullRefreshAt = new Date('2026-08-11T06:00:00.000Z');
    expect(
      decideCrawlMode({
        lastFullRefreshAt,
        fullRefreshHours: 24,
        now,
      }),
    ).toBe('incremental');
  });

  it('jobCrawlMode full overrides timer', () => {
    const lastFullRefreshAt = new Date('2026-08-11T06:00:00.000Z');
    expect(
      decideCrawlMode({
        lastFullRefreshAt,
        fullRefreshHours: 24,
        jobCrawlMode: 'full',
        now,
      }),
    ).toBe('full');
  });
});

describe('evaluateProxyGate', () => {
  it('returns not degraded when proxy is configured', () => {
    expect(
      evaluateProxyGate({
        isProduction: true,
        proxyUrl: 'http://proxy.example:8080',
      }),
    ).toEqual({ degraded: false });
  });

  it('returns degraded without throw when production and proxy missing', () => {
    const result = evaluateProxyGate({
      isProduction: true,
      proxyUrl: undefined,
    });
    expect(result.degraded).toBe(true);
    expect(result.warning).toMatch(/degraded/i);
  });

  it('warns but does not degrade in non-production without proxy', () => {
    const result = evaluateProxyGate({
      isProduction: false,
      proxyUrl: undefined,
    });
    expect(result.degraded).toBe(false);
    expect(result.warning).toBeDefined();
  });
});

describe('isProductionSoftProxyContext', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('is true when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FLY_APP_NAME;
    expect(isProductionSoftProxyContext()).toBe(true);
  });

  it('is true when FLY_APP_NAME is set', () => {
    process.env.NODE_ENV = 'development';
    process.env.FLY_APP_NAME = 'snap-it-free-scraper';
    expect(isProductionSoftProxyContext()).toBe(true);
  });
});
