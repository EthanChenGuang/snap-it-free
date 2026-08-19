import { afterEach, describe, expect, it, vi } from 'vitest';
import { probeTargetUrlReachability } from './url-probe';
import { validateTargetUrlList } from './url-test';

describe('probeTargetUrlReachability', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts HTTP 200 HTML responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        text: async () => '<html><title>Subito</title></html>',
      })),
    );

    const result = await probeTargetUrlReachability(
      'https://www.subito.it/annunci-veneto/regalo/informatica/venezia/venezia/',
    );

    expect(result).toEqual({ ok: true, statusCode: 200 });
  });

  it('rejects blocked HTML even when status is 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        text: async () => '<html>Access Denied</html>',
      })),
    );

    const result = await probeTargetUrlReachability(
      'https://www.subito.it/annunci-veneto/regalo/informatica/venezia/venezia/',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/反爬/);
    }
  });

  it('retries transient HTTP 429 for Vinted-style probes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 429, text: async () => '' })
      .mockResolvedValueOnce({
        status: 200,
        text: async () => '<html><title>Vinted</title></html>',
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await probeTargetUrlReachability(
      'https://www.vinted.it/catalog/1918-casa?order=newest_first&city=venezia',
      { retries: 1, retryDelayMs: 1 },
    );

    expect(result).toEqual({ ok: true, statusCode: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reads only the first bytes of large HTML bodies', async () => {
    const largeTail = 'x'.repeat(100_000);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<html><title>Vinted</title>'));
        controller.enqueue(new TextEncoder().encode(largeTail));
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        body: stream,
      })),
    );

    const result = await probeTargetUrlReachability(
      'https://www.vinted.it/catalog/1918-casa?order=newest_first&city=venezia',
    );

    expect(result).toEqual({ ok: true, statusCode: 200 });
  });
});

describe('validateTargetUrlList', () => {
  it('reports format failures without probing invalid URLs', async () => {
    const report = await validateTargetUrlList(
      'subito',
      [
        'https://www.subito.it/annunci-veneto/regalo/informatica/venezia/venezia/',
        'https://evil.com/listings',
      ].join('\n'),
      { probe: false },
    );

    expect(report.summary.total).toBe(2);
    expect(report.summary.formatOk).toBe(1);
    expect(report.summary.failed).toBe(1);
    expect(report.results[1]?.format.ok).toBe(false);
    expect(report.results[1]?.reachability).toBeUndefined();
  });
});
