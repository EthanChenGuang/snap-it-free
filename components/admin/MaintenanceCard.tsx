'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CleanupPreview, CleanupResult } from '@/lib/admin/cleanup';

type MaintenanceCardProps = {
  initialPreview: CleanupPreview | null;
};

export type MaintenanceState = {
  preview: CleanupPreview | null;
  result: CleanupResult | null;
  loading: 'preview' | 'execute' | null;
  error: string | null;
  handlePreview: () => Promise<void>;
  handleExecute: () => Promise<void>;
};

export function useMaintenance(initialPreview: CleanupPreview | null): MaintenanceState {
  const router = useRouter();
  const [preview, setPreview] = useState<CleanupPreview | null>(initialPreview);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [loading, setLoading] = useState<'preview' | 'execute' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = useCallback(async () => {
    setLoading('preview');
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/admin/cleanup');
      const payload = (await response.json()) as { preview?: CleanupPreview; error?: string };
      if (!response.ok) {
        setError(payload.error ?? 'Preview failed');
        return;
      }
      setPreview(payload.preview ?? null);
    } catch {
      setError('Preview failed');
    } finally {
      setLoading(null);
    }
  }, []);

  const handleExecute = useCallback(async () => {
    if (!preview || preview.total === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${preview.total} out-of-date records?\n\n` +
        `- Expired listings: ${preview.expiredListings}\n` +
        `- Hidden scraper listings (>${preview.auditRetentionDays}d): ${preview.hiddenScraperListings}\n` +
        `- Old scrape rejects (>${preview.auditRetentionDays}d): ${preview.oldScrapeRejects}\n` +
        `- Old scrape runs (>${preview.auditRetentionDays}d): ${preview.oldScrapeRuns}\n\n` +
        'This cannot be undone.',
    );
    if (!confirmed) {
      return;
    }

    setLoading('execute');
    setError(null);
    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json()) as {
        result?: CleanupResult;
        totalDeleted?: number;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? 'Cleanup failed');
        return;
      }
      setResult(payload.result ?? null);
      setPreview(null);
      router.refresh();
    } catch {
      setError('Cleanup failed');
    } finally {
      setLoading(null);
    }
  }, [preview, router]);

  return { preview, result, loading, error, handlePreview, handleExecute };
}

function formatPreviewLine(label: string, count: number): string {
  return `${label}: ${count}`;
}

export function MaintenanceMetric({
  preview,
  loading,
  error,
  handlePreview,
}: Pick<MaintenanceState, 'preview' | 'loading' | 'error' | 'handlePreview'>) {
  return (
    <div className="dashboard-metric-card">
      <div className="dashboard-metric-card-head">
        <span className="dashboard-metric-card-label">数据库维护</span>
        <span className="material-symbols-outlined dashboard-metric-card-icon" aria-hidden>
          cleaning_services
        </span>
      </div>

      {preview ? (
        <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-[#1d1d1f]">{preview.total}</p>
      ) : (
        <p className="mt-3 text-[13px] text-[#86868b]">清理过期 listing 与审计记录</p>
      )}

      {preview ? (
        <p className="mt-1 font-mono text-[11px] tabular-nums text-[#86868b]">待清理记录</p>
      ) : null}

      {error ? (
        <p className="mt-2 font-mono text-[11px] text-[#ff3b30]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handlePreview}
        disabled={loading !== null}
        className="dashboard-metric-action mt-3"
      >
        {loading === 'preview' ? '加载中…' : 'Preview cleanup'}
      </button>
    </div>
  );
}

export function MaintenancePanel({
  preview,
  result,
  loading,
  error,
  handlePreview,
  handleExecute,
}: MaintenanceState) {
  return (
    <section className="dashboard-service-card">
      <div className="dashboard-service-card-head">
        <div>
          <h2 className="dashboard-service-card-title">Database cleanup</h2>
          <p className="dashboard-service-card-subtitle">
            Remove expired listings and audit rows older than 30 days.
          </p>
        </div>
        <span className="dashboard-service-card-icon-wrap" aria-hidden>
          <span className="material-symbols-outlined text-[20px] text-[#ff9500]">delete_sweep</span>
        </span>
      </div>

      {preview ? (
        <ul className="mt-4 space-y-1 font-mono text-[11px] tabular-nums text-[#636366]">
          <li>{formatPreviewLine('Expired listings', preview.expiredListings)}</li>
          <li>
            {formatPreviewLine(
              `Hidden scraper listings (>${preview.auditRetentionDays}d)`,
              preview.hiddenScraperListings,
            )}
          </li>
          <li>
            {formatPreviewLine(
              `Scrape rejects (>${preview.auditRetentionDays}d)`,
              preview.oldScrapeRejects,
            )}
          </li>
          <li>
            {formatPreviewLine(
              `Scrape runs (>${preview.auditRetentionDays}d)`,
              preview.oldScrapeRuns,
            )}
          </li>
          <li className="pt-2 font-semibold text-[#1d1d1f]">Total: {preview.total}</li>
        </ul>
      ) : null}

      {result ? (
        <p className="mt-3 text-[13px] text-[#1d1d1f]">
          Deleted{' '}
          {result.deletedExpiredListings +
            result.deletedHiddenScraperListings +
            result.deletedScrapeRejects +
            result.deletedScrapeRuns}{' '}
          records.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-[13px] text-[#ff3b30]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading !== null}
          className="dashboard-metric-action"
        >
          {loading === 'preview' ? 'Loading…' : 'Preview cleanup'}
        </button>
        {preview && preview.total > 0 ? (
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading !== null}
            className="dashboard-metric-action dashboard-metric-action-primary"
          >
            {loading === 'execute' ? 'Deleting…' : 'Delete out-of-date records'}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function MaintenanceCard({ initialPreview }: MaintenanceCardProps) {
  const maintenance = useMaintenance(initialPreview);
  return <MaintenancePanel {...maintenance} />;
}
