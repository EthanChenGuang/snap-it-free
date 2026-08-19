import { spawn } from 'node:child_process';
import path from 'node:path';

/** Fire-and-forget: run scraper worker subprocess with latest code (local Admin path). */
export function dispatchScrapeJobSubprocess(jobId: string): void {
  const scraperRoot = path.join(process.cwd(), 'scraper');
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/run-job.ts', jobId], {
    cwd: scraperRoot,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, CRAWLEE_PERSIST_STORAGE: 'false' },
  });
  child.unref();
}
