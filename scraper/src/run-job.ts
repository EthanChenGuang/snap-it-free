#!/usr/bin/env node
/**
 * Process one manual scrape_jobs row (used by Admin inline dispatch).
 * Usage: node --import tsx src/run-job.ts <job-id>
 */
import { supabaseAdmin } from './config.js';
import { runSourceScrape } from './worker.js';

const jobId = process.argv[2]?.trim();
if (!jobId) {
  console.error('Usage: node --import tsx src/run-job.ts <job-id>');
  process.exit(1);
}

const { data: job, error } = await supabaseAdmin
  .from('scrape_jobs')
  .select('id, source_slug, status')
  .eq('id', jobId)
  .maybeSingle();

if (error) {
  console.error('Failed to load job:', error.message);
  process.exit(1);
}
if (!job) {
  console.error('Job not found:', jobId);
  process.exit(1);
}

console.log(`[run-job] Starting ${job.source_slug} job ${jobId} (status=${job.status})`);

if (job.status === 'completed' || job.status === 'failed' || job.status === 'skipped') {
  console.log(`[run-job] Job ${jobId} already finished (${job.status}) — skipping`);
  process.exit(0);
}

try {
  await runSourceScrape(supabaseAdmin, job.source_slug, {
    trigger: 'manual',
    jobId: job.id,
  });
  console.log(`[run-job] Completed job ${jobId}`);
} catch (err) {
  console.error(`[run-job] Failed job ${jobId}:`, err);
  process.exit(1);
}
