const ROME_TIMEZONE = 'Europe/Rome';

export function formatUtcTimestamp(iso: string): string {
  return `${new Date(iso).toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

export function formatRomeTooltip(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: ROME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
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

export function formatSelectorRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) {
    return '—';
  }
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(1)}%`;
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
