import type { SupabaseClient } from '@supabase/supabase-js';

export type JobExecutionLockResult =
  | { acquired: true }
  | { acquired: false; reason: string };

export class DuplicateJobRunError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Active scrape run already exists for job ${jobId}`);
    this.name = 'DuplicateJobRunError';
    this.jobId = jobId;
  }
}

export function isDuplicateJobRunError(error: unknown): error is DuplicateJobRunError {
  return error instanceof DuplicateJobRunError;
}

export function isActiveJobRunUniqueViolation(error: unknown, jobId?: string | null): boolean {
  if (!jobId) {
    return false;
  }
  if (error instanceof DuplicateJobRunError) {
    return error.jobId === jobId;
  }
  if (typeof error === 'object' && error != null && 'code' in error) {
    return (error as { code?: string }).code === '23505';
  }
  return false;
}

export async function findActiveRunForJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('scrape_runs')
    .select('id')
    .eq('job_id', jobId)
    .is('finished_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.id as string | undefined) ?? null;
}

export async function tryClaimPendingScrapeJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<boolean> {
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('scrape_jobs')
    .update({ status: 'running', started_at: startedAt })
    .eq('id', jobId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/** DB-backed lock: one worker may execute a manual job at a time. */
export async function acquireManualJobExecution(
  supabase: SupabaseClient,
  jobId: string,
): Promise<JobExecutionLockResult> {
  if (await tryClaimPendingScrapeJob(supabase, jobId)) {
    return { acquired: true };
  }

  const activeRunId = await findActiveRunForJob(supabase, jobId);
  if (activeRunId) {
    return { acquired: false, reason: `run ${activeRunId} already in progress` };
  }

  const { data: job, error } = await supabase
    .from('scrape_jobs')
    .select('status')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!job) {
    return { acquired: false, reason: 'job not found' };
  }

  if (job.status === 'running') {
    return { acquired: true };
  }

  if (job.status === 'pending' && (await tryClaimPendingScrapeJob(supabase, jobId))) {
    return { acquired: true };
  }

  return { acquired: false, reason: `job status is ${job.status}` };
}
