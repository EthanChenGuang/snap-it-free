/** Chromium flags + pool limits for Fly.io / low-memory workers (Playwright). */
export const PLAYWRIGHT_LOW_MEMORY_LAUNCH = {
  headless: true,
  args: [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--no-first-run',
    '--disable-background-networking',
  ],
} as const;

export const PLAYWRIGHT_WALLAPOP_POOL_SIZE = 1;

export function playwrightSessionPoolOptions(maxPoolSize = PLAYWRIGHT_WALLAPOP_POOL_SIZE) {
  return {
    maxPoolSize,
    persistenceOptions: { enable: false },
  };
}
