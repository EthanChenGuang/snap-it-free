import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { getProxyUrl } from '../config.js';
import { extractListingsFromPage, type RawListing } from './extract.js';

export type CrawlResult = {
  rawListings: RawListing[];
  selectorHitRate: number;
};

export async function runSubitoCrawler(categoryUrls: readonly string[]): Promise<CrawlResult> {
  const rawListings: RawListing[] = [];
  let selectorHits = 0;
  let selectorTotal = 0;

  const proxyUrl = getProxyUrl();
  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { maxPoolSize: 5 },
    maxRequestRetries: 3,
    launchContext: {
      launchOptions: {
        headless: true,
      },
    },
    async requestHandler({ page, session }) {
      const title = await page.title();
      if (title.toLowerCase().includes('blocked')) {
        session?.retire();
        return;
      }

      const { listings, hitRate } = await extractListingsFromPage(page);
      rawListings.push(...listings);
      selectorHits += hitRate.hits;
      selectorTotal += hitRate.total;
    },
  });

  await crawler.run([...categoryUrls]);

  return {
    rawListings,
    selectorHitRate: selectorTotal > 0 ? selectorHits / selectorTotal : 0,
  };
}
