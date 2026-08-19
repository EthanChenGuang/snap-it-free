'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sourcesMessages } from '@/components/admin/admin-messages';
import type { CrawlMode, SourceDetail, SourceLastRun, SourceWithLastRun } from '@/lib/admin/types';

export type RunNowPhase =
  | 'idle'
  | 'submitting'
  | 'queued'
  | 'running'
  | 'done'
  | 'error';

type SourcePayload = {
  source: SourceWithLastRun | SourceDetail;
};

type ScrapeJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

type JobPayload = {
  job: {
    id: string;
    status: ScrapeJobStatus;
    message: string | null;
  };
};

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 120_000;
const DONE_RESET_MS = 4_000;

function isNewRun(run: SourceLastRun | null, baselineRunId: string | null, queuedAt: number): boolean {
  if (!run) {
    return false;
  }
  if (baselineRunId && run.id === baselineRunId) {
    return false;
  }
  return new Date(run.startedAt).getTime() >= queuedAt - 5_000;
}

export function useRunNow(options?: {
  globalPause?: boolean;
  onComplete?: () => void;
  onPhaseChange?: (phase: RunNowPhase) => void;
}) {
  const globalPause = options?.globalPause ?? false;
  const onComplete = options?.onComplete;
  const onPhaseChange = options?.onPhaseChange;
  const [phase, setPhase] = useState<RunNowPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedAtRef = useRef(0);
  const baselineRunIdRef = useRef<string | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const setPhaseSafe = useCallback(
    (next: RunNowPhase) => {
      setPhase(next);
      onPhaseChange?.(next);
    },
    [onPhaseChange],
  );

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const clearReset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const scheduleIdleReset = useCallback(() => {
    clearReset();
    resetTimerRef.current = setTimeout(() => {
      setPhaseSafe('idle');
      setMessage(null);
      jobIdRef.current = null;
    }, DONE_RESET_MS);
  }, [clearReset, setPhaseSafe]);

  const fetchSource = useCallback(async (slug: string): Promise<SourcePayload | null> => {
    try {
      const response = await fetch(`/api/admin/sources/${slug}`, { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as SourcePayload;
    } catch {
      return null;
    }
  }, []);

  const fetchJob = useCallback(async (jobId: string): Promise<JobPayload | null> => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as JobPayload;
    } catch {
      return null;
    }
  }, []);

  const finishSuccess = useCallback(() => {
    clearPoll();
    setPhaseSafe('done');
    setMessage(sourcesMessages.runComplete);
    scheduleIdleReset();
    onComplete?.();
  }, [clearPoll, onComplete, scheduleIdleReset, setPhaseSafe]);

  const finishFailure = useCallback(
    (detail?: string | null) => {
      clearPoll();
      setPhaseSafe('error');
      setMessage(detail?.trim() || sourcesMessages.runFailed);
      scheduleIdleReset();
    },
    [clearPoll, scheduleIdleReset, setPhaseSafe],
  );

  const applyJobStatus = useCallback(
    (status: ScrapeJobStatus, jobMessage: string | null) => {
      if (status === 'pending') {
        setPhaseSafe('queued');
        return;
      }

      if (status === 'running') {
        setPhaseSafe('running');
        setMessage(sourcesMessages.runInProgress);
        return;
      }

      if (status === 'completed') {
        finishSuccess();
        return;
      }

      if (status === 'failed' || status === 'skipped') {
        finishFailure(jobMessage);
      }
    },
    [finishFailure, finishSuccess, setPhaseSafe],
  );

  const pollOnce = useCallback(
    async (slug: string) => {
      if (Date.now() - queuedAtRef.current > POLL_TIMEOUT_MS) {
        clearPoll();
        setPhaseSafe('done');
        setMessage(sourcesMessages.runQueued);
        scheduleIdleReset();
        onComplete?.();
        return;
      }

      const jobId = jobIdRef.current;
      if (jobId) {
        const jobPayload = await fetchJob(jobId);
        if (jobPayload?.job) {
          applyJobStatus(jobPayload.job.status, jobPayload.job.message);
          if (jobPayload.job.status === 'completed' || jobPayload.job.status === 'failed' || jobPayload.job.status === 'skipped') {
            return;
          }
        }
      }

      const payload = await fetchSource(slug);
      const run = payload?.source.lastRun ?? null;

      if (run && isNewRun(run, baselineRunIdRef.current, queuedAtRef.current) && !run.finishedAt) {
        setPhaseSafe('running');
        setMessage(sourcesMessages.runInProgress);
        return;
      }

      if (run && isNewRun(run, baselineRunIdRef.current, queuedAtRef.current) && run.finishedAt) {
        finishSuccess();
      }
    },
    [
      applyJobStatus,
      clearPoll,
      fetchJob,
      fetchSource,
      finishSuccess,
      onComplete,
      scheduleIdleReset,
      setPhaseSafe,
    ],
  );

  const startPolling = useCallback(
    (slug: string) => {
      clearPoll();
      void pollOnce(slug);
      pollTimerRef.current = setInterval(() => {
        void pollOnce(slug);
      }, POLL_INTERVAL_MS);
    },
    [clearPoll, pollOnce],
  );

  const trigger = useCallback(
    async (slug: string, crawlMode: CrawlMode = 'incremental') => {
      clearPoll();
      clearReset();
      setPhaseSafe('submitting');
      setMessage(sourcesMessages.runSubmitting);
      queuedAtRef.current = Date.now();
      jobIdRef.current = null;

      const baseline = await fetchSource(slug);
      baselineRunIdRef.current = baseline?.source.lastRun?.id ?? null;

      try {
        const response = await fetch('/api/admin/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_slug: slug, crawl_mode: crawlMode }),
        });

        const payload = (await response.json()) as {
          job?: { id: string; status: ScrapeJobStatus; message?: string | null };
          error?: string;
        };

        if (!response.ok) {
          finishFailure(typeof payload.error === 'string' ? payload.error : null);
          return;
        }

        const job = payload.job;
        if (!job?.id) {
          finishFailure(null);
          return;
        }

        jobIdRef.current = job.id;

        if (job.status === 'skipped') {
          finishFailure(job.message ?? sourcesMessages.comingSoonRunBlocked);
          return;
        }

        setPhaseSafe('queued');
        setMessage(
          globalPause
            ? sourcesMessages.runQueuedPaused
            : baseline?.source.enabled === false
              ? sourcesMessages.runSourceDisabled
              : sourcesMessages.runWaitingWorker,
        );
        startPolling(slug);
      } catch {
        finishFailure(null);
      }
    },
    [
      clearPoll,
      clearReset,
      fetchSource,
      finishFailure,
      globalPause,
      setPhaseSafe,
      startPolling,
    ],
  );

  useEffect(() => {
    return () => {
      clearPoll();
      clearReset();
    };
  }, [clearPoll, clearReset]);

  const isActive = phase === 'submitting' || phase === 'queued' || phase === 'running';

  return {
    phase,
    message,
    isActive,
    trigger,
  };
}

export function isRunNowActivePhase(phase: RunNowPhase): boolean {
  return phase === 'submitting' || phase === 'queued' || phase === 'running';
}
