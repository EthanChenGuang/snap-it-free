const ROME_TIMEZONE = 'Europe/Rome';

const romeDateTimeFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: ROME_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** Display scrape timestamps in Italy (Europe/Rome) local time. */
export function formatUtcTimestamp(iso: string): string {
  return `${romeDateTimeFormatter.format(new Date(iso))} 罗马`;
}

/** Tooltip: original UTC instant for operators comparing with server logs. */
export function formatRomeTooltip(iso: string): string {
  return `${new Date(iso).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

export function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) {
    return '—';
  }
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) {
    return '—';
  }
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatWallTimeSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) {
    return '—';
  }
  const totalSeconds = Math.round(seconds);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}m ${remainder}s`;
}

export function formatSelectorRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) {
    return '—';
  }
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(1)}%`;
}

export function categoryUrlLabel(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const regaloIdx = parts.indexOf('regalo');
    if (regaloIdx >= 0 && parts[regaloIdx + 1]) {
      return parts[regaloIdx + 1].replace(/-/g, ' ');
    }
    return parts[parts.length - 3] ?? parts[parts.length - 1] ?? url;
  } catch {
    return url;
  }
}

export function parseUrlBreakdown(
  raw: unknown,
): import('@/lib/admin/types').ScrapeRunUrlBreakdownItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const url = typeof row.url === 'string' ? row.url : '';
      if (!url) {
        return null;
      }
      return {
        url,
        label:
          typeof row.label === 'string' && row.label.trim()
            ? row.label
            : categoryUrlLabel(url),
        listingsFound: Number(row.listingsFound ?? row.listings_found ?? 0),
        listingsSkippedAtCrawl: Number(
          row.listingsSkippedAtCrawl ?? row.listings_skipped_at_crawl ?? 0,
        ),
        blocked: Boolean(row.blocked),
        earlyStopTriggered: Boolean(row.earlyStopTriggered ?? row.early_stop_triggered),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
}

export function snippetPreview(raw: Record<string, unknown>): string {
  const title = typeof raw.title === 'string' ? raw.title : '';
  const description = typeof raw.description === 'string' ? raw.description : '';
  const combined = [title, description].filter(Boolean).join(' — ');
  if (combined) {
    return combined;
  }
  try {
    return JSON.stringify(raw);
  } catch {
    return '—';
  }
}
