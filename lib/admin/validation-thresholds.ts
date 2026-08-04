/** Read-only scrape validation constants — must stay aligned with scraper/src/config.ts (D-23). */
export const SCRAPE_MIN_SELECTOR_RATE = 0.9;
export const SCRAPE_MIN_COUNT_RATIO =
  Number.parseFloat(process.env.SCRAPE_MIN_COUNT_RATIO ?? '0.5') || 0.5;
export const SCRAPE_MIN_GEO_RESOLUTION_RATE =
  Number.parseFloat(process.env.SCRAPE_MIN_GEO_RESOLUTION_RATE ?? '0.5') || 0.5;

export function formatThresholdPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
