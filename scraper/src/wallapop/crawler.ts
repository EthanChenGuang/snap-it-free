import type { RunSubitoCrawlerOptions } from '../subito/crawler.js';
import {
  runWallapopFixtureCrawler,
  runWallapopPlaywrightCrawler,
} from './playwright-crawler.js';

export type RunWallapopCrawlerOptions = RunSubitoCrawlerOptions & {
  /** Test-only: map seed URL → raw search API JSON body. */
  fixtureApiBodies?: ReadonlyMap<string, string>;
};

export { processWallapopSearchBody } from './process-search.js';

/**
 * Wallapop crawler entry — Playwright intercept by default (D-25-02).
 * Bare HTTP to api.wallapop.com is blocked by CloudFront; browser session required.
 */
export async function runWallapopCrawler(
  categoryUrls: readonly string[],
  preset: Parameters<typeof runWallapopPlaywrightCrawler>[1] = 'standard',
  proxyUrlOverride?: string,
  options: RunWallapopCrawlerOptions = {},
): Promise<Awaited<ReturnType<typeof runWallapopPlaywrightCrawler>>> {
  if (options.fixtureApiBodies) {
    return runWallapopFixtureCrawler(categoryUrls, options.fixtureApiBodies, options);
  }
  return runWallapopPlaywrightCrawler(categoryUrls, preset, proxyUrlOverride, options);
}
