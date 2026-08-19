import {
  mapWithConcurrency,
  probeTargetUrlReachability,
  VINTED_PROBE_CONCURRENCY,
  VINTED_PROBE_DELAY_MS,
  VINTED_PROBE_RETRIES,
} from './url-probe';
import { validateTargetUrl } from './url-validate';

export type UrlValidationEntry = {
  line: number;
  url: string;
  format: { ok: true } | { ok: false; error: string };
  reachability?:
    | { ok: true; statusCode: number }
    | { ok: false; statusCode?: number; error: string };
};

export type UrlValidationSummary = {
  total: number;
  formatOk: number;
  reachOk: number;
  failed: number;
};

export type UrlValidationReport = {
  summary: UrlValidationSummary;
  results: UrlValidationEntry[];
};

const DEFAULT_PROBE_CONCURRENCY = 4;

function probeSettingsForSource(slug: string): {
  concurrency: number;
  delayMs: number;
  retries: number;
} {
  if (slug === 'vinted') {
    return {
      concurrency: VINTED_PROBE_CONCURRENCY,
      delayMs: VINTED_PROBE_DELAY_MS,
      retries: VINTED_PROBE_RETRIES,
    };
  }
  return { concurrency: DEFAULT_PROBE_CONCURRENCY, delayMs: 0, retries: 0 };
}

function parseUrlLines(text: string): Array<{ line: number; url: string }> {
  return text
    .split('\n')
    .map((raw, index) => ({ line: index + 1, url: raw.trim() }))
    .filter((entry) => entry.url.length > 0);
}

export async function validateTargetUrlList(
  slug: string,
  text: string,
  options?: { probe?: boolean; concurrency?: number },
): Promise<UrlValidationReport> {
  const entries = parseUrlLines(text);

  if (entries.length === 0) {
    return {
      summary: { total: 0, formatOk: 0, reachOk: 0, failed: 0 },
      results: [],
    };
  }

  const formatResults = entries.map((entry) => {
    const format = validateTargetUrl(entry.url, slug);
    return {
      line: entry.line,
      url: entry.url,
      format,
    };
  });

  let reachResults: Array<
    | { ok: true; statusCode: number }
    | { ok: false; statusCode?: number; error: string }
    | undefined
  > = entries.map(() => undefined);

  if (options?.probe !== false) {
    const sourceProbe = probeSettingsForSource(slug);
    const probeTargets = formatResults
      .map((entry, index) => ({ index, url: entry.url, formatOk: entry.format.ok }))
      .filter((entry) => entry.formatOk);

    const probed = await mapWithConcurrency(
      probeTargets,
      options?.concurrency ?? sourceProbe.concurrency,
      async (entry) => {
        const reachability = await probeTargetUrlReachability(entry.url, {
          retries: sourceProbe.retries,
        });
        if (sourceProbe.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, sourceProbe.delayMs));
        }
        return {
          index: entry.index,
          reachability,
        };
      },
    );

    reachResults = entries.map(() => undefined);
    for (const item of probed) {
      reachResults[item.index] = item.reachability;
    }
  }

  const results: UrlValidationEntry[] = formatResults.map((entry, index) => ({
    line: entry.line,
    url: entry.url,
    format: entry.format,
    reachability: reachResults[index],
  }));

  const formatOk = results.filter((entry) => entry.format.ok).length;
  const reachOk = results.filter((entry) => entry.reachability?.ok).length;
  const failed = results.filter(
    (entry) => !entry.format.ok || (entry.reachability != null && !entry.reachability.ok),
  ).length;

  return {
    summary: {
      total: results.length,
      formatOk,
      reachOk,
      failed,
    },
    results,
  };
}
