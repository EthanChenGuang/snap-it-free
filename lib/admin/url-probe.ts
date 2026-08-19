const PROBE_TIMEOUT_MS = 10_000;
const PROBE_SNIPPET_BYTES = 8192;
const PROBE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const BLOCK_SNIPPET_RE = /access denied|bot detected|akamai|please verify you are a human/i;

/** Read only the first N bytes — Vinted/Subito HTML can be multi-MB. */
async function readResponseSnippet(response: Response, maxBytes: number): Promise<string> {
  const body = response.body;
  if (!body) {
    return (await response.text()).slice(0, maxBytes);
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let snippet = '';

  try {
    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) {
        break;
      }

      const remaining = maxBytes - bytesRead;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      snippet += decoder.decode(chunk, { stream: true });
      bytesRead += chunk.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  snippet += decoder.decode();
  return snippet.slice(0, maxBytes);
}

/** Vinted Datadome rate-limits burst admin probes — serialize with backoff (D-17-33). */
export const VINTED_PROBE_CONCURRENCY = 1;
export const VINTED_PROBE_DELAY_MS = 1_500;
export const VINTED_PROBE_RETRIES = 2;

export type UrlReachabilityResult =
  | { ok: true; statusCode: number }
  | { ok: false; statusCode?: number; error: string };

export type ProbeTargetUrlOptions = {
  /** Extra attempts after transient 429/503 or timeout. */
  retries?: number;
  /** Base delay before each retry (multiplied by attempt index). */
  retryDelayMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableProbeFailure(result: UrlReachabilityResult): boolean {
  if (result.ok) return false;
  if (result.statusCode === 429 || result.statusCode === 503) return true;
  return result.error === '请求超时';
}

async function probeTargetUrlOnce(url: string): Promise<UrlReachabilityResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'User-Agent': PROBE_USER_AGENT,
      },
    });

    const statusCode = response.status;
    if (statusCode < 200 || statusCode >= 400) {
      return {
        ok: false,
        statusCode,
        error: `HTTP ${statusCode}`,
      };
    }

    const snippet = await readResponseSnippet(response, PROBE_SNIPPET_BYTES);
    if (BLOCK_SNIPPET_RE.test(snippet)) {
      return {
        ok: false,
        statusCode,
        error: '页面可能被反爬拦截',
      };
    }

    return { ok: true, statusCode };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: '请求超时' };
    }
    return { ok: false, error: '网络请求失败' };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeTargetUrlReachability(
  url: string,
  options?: ProbeTargetUrlOptions,
): Promise<UrlReachabilityResult> {
  const retries = options?.retries ?? 0;
  const retryDelayMs = options?.retryDelayMs ?? 2_000;
  let lastResult: UrlReachabilityResult = { ok: false, error: '网络请求失败' };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    lastResult = await probeTargetUrlOnce(url);
    if (!isRetryableProbeFailure(lastResult) || attempt >= retries) {
      return lastResult;
    }
    await sleep(retryDelayMs * (attempt + 1));
  }

  return lastResult;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}
