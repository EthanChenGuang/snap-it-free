'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CleanupPreview, CleanupResult } from '@/lib/admin/cleanup';

type MaintenanceCardProps = {
  initialPreview: CleanupPreview | null;
};

function formatPreviewLine(label: string, count: number): string {
  return `${label}: ${count}`;
}

export function MaintenanceCard({ initialPreview }: MaintenanceCardProps) {
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

  return (
    <section className="mb-space-xl rounded border border-outline-variant bg-surface p-space-md">
      <div className="mb-space-md flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant pb-space-md">
        <div>
          <h2 className="text-h3 font-semibold">Database cleanup</h2>
          <p className="mt-1 text-body-md text-secondary">
            Remove expired listings and audit rows older than 30 days.
          </p>
        </div>
        <span className="material-symbols-outlined text-[24px] text-secondary" aria-hidden>
          cleaning_services
        </span>
      </div>

      {preview && (
        <ul className="mb-space-md space-y-1 font-mono text-label-sm text-primary">
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
          <li className="pt-2 font-semibold">Total: {preview.total}</li>
        </ul>
      )}

      {result && (
        <p className="mb-space-md text-body-md text-primary">
          Deleted{' '}
          {result.deletedExpiredListings +
            result.deletedHiddenScraperListings +
            result.deletedScrapeRejects +
            result.deletedScrapeRuns}{' '}
          records.
        </p>
      )}

      {error && (
        <p className="mb-space-md text-body-md text-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading !== null}
          className="rounded border border-outline-variant bg-surface px-4 py-2 text-label-md font-semibold text-primary hover:bg-surface-container-low disabled:opacity-50"
        >
          {loading === 'preview' ? 'Loading…' : 'Preview cleanup'}
        </button>
        {preview && preview.total > 0 && (
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading !== null}
            className="rounded border border-primary bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {loading === 'execute' ? 'Deleting…' : 'Delete out-of-date records'}
          </button>
        )}
      </div>
    </section>
  );
}
