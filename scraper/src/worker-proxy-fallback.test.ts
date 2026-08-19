import { describe, expect, it, vi } from 'vitest';
import type { AntiBlockPreset } from './admin/presets.js';
import { ProxyQuotaFatalError } from './shared/proxy-errors.js';
import type { CrawlResult } from './subito/crawler.js';
import { runSubitoCrawlWithProxyFallback } from './worker-proxy-fallback.js';

const mockCrawlResult: CrawlResult = {
  rawListings: [],
  selectorHitRate: 1,
  httpRequests: 0,
  listingsSkippedAtCrawl: 0,
  jsonFieldCompleteness: 1,
  blockedUrlCount: 0,
  detailCapDeferred: 0,
  crawlMode: 'incremental',
  urlBreakdown: [],
};

describe('runSubitoCrawlWithProxyFallback', () => {
  it('retries once without proxy on ProxyQuotaFatalError', async () => {
    const runSubitoCrawler = vi
      .fn<
        (
          urls: readonly string[],
          preset: AntiBlockPreset,
          proxyUrl?: string,
        ) => Promise<CrawlResult>
      >()
      .mockRejectedValueOnce(new ProxyQuotaFatalError('Proxy quota exhausted'))
      .mockResolvedValueOnce(mockCrawlResult);

    const result = await runSubitoCrawlWithProxyFallback(
      runSubitoCrawler,
      ['https://www.subito.it/annunci-veneto/regalo/'],
      'standard',
      'http://user:pass@proxy.example:8080',
      { mode: 'incremental' },
    );

    expect(runSubitoCrawler).toHaveBeenCalledTimes(2);
    expect(runSubitoCrawler.mock.calls[0]?.[2]).toBe('http://user:pass@proxy.example:8080');
    expect(runSubitoCrawler.mock.calls[1]?.[2]).toBeUndefined();
    expect(runSubitoCrawler.mock.calls[1]?.[3]).toMatchObject({
      proxyUrlOverride: '',
      runId: undefined,
    });
    expect(result.crawlResult).toBe(mockCrawlResult);
    expect(result.fallbackDegraded).toBe(true);
    expect(result.fallbackReason).toMatch(/direct fallback/i);
  });

  it('propagates generic errors without retry', async () => {
    const runSubitoCrawler = vi
      .fn<
        (
          urls: readonly string[],
          preset: AntiBlockPreset,
          proxyUrl?: string,
        ) => Promise<CrawlResult>
      >()
      .mockRejectedValue(new Error('connection reset'));

    await expect(
      runSubitoCrawlWithProxyFallback(
        runSubitoCrawler,
        ['https://www.subito.it/annunci-veneto/regalo/'],
        'standard',
        'http://proxy.example:8080',
        {},
      ),
    ).rejects.toThrow('connection reset');

    expect(runSubitoCrawler).toHaveBeenCalledTimes(1);
  });

  it('uses a fresh request queue on direct fallback when runId is set', async () => {
    const runSubitoCrawler = vi
      .fn<
        (
          urls: readonly string[],
          preset: AntiBlockPreset,
          proxyUrl?: string,
        ) => Promise<CrawlResult>
      >()
      .mockRejectedValueOnce(new ProxyQuotaFatalError('quota on proxy'))
      .mockResolvedValueOnce(mockCrawlResult);

    await runSubitoCrawlWithProxyFallback(
      runSubitoCrawler,
      ['https://www.subito.it/annunci-veneto/regalo/'],
      'standard',
      'http://proxy.example:8080',
      { mode: 'incremental', runId: 'run-abc' },
    );

    expect(runSubitoCrawler.mock.calls[1]?.[3]).toMatchObject({
      proxyUrlOverride: '',
      runId: 'run-abc-direct',
    });
  });

  it('propagates second ProxyQuotaFatalError without further retry', async () => {
    const runSubitoCrawler = vi
      .fn<
        (
          urls: readonly string[],
          preset: AntiBlockPreset,
          proxyUrl?: string,
        ) => Promise<CrawlResult>
      >()
      .mockRejectedValueOnce(new ProxyQuotaFatalError('quota on proxy'))
      .mockRejectedValueOnce(new ProxyQuotaFatalError('quota on direct'));

    await expect(
      runSubitoCrawlWithProxyFallback(
        runSubitoCrawler,
        ['https://www.subito.it/annunci-veneto/regalo/'],
        'standard',
        'http://proxy.example:8080',
        {},
      ),
    ).rejects.toThrow('quota on direct');

    expect(runSubitoCrawler).toHaveBeenCalledTimes(2);
  });
});
