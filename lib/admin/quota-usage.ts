import type { SupabaseClient } from '@supabase/supabase-js';

/** Supabase Free tier limits (Aug 2026). Pro upgrades: DB 8 GB, Storage 100 GB. */
export const SUPABASE_FREE_LIMITS = {
  databaseBytes: 500 * 1024 * 1024,
  storageBytes: 1024 * 1024 * 1024,
} as const;

export type QuotaLevel = 'green' | 'yellow' | 'red';

export type QuotaTableUsage = {
  table: string;
  bytes: number;
  estimatedRows: number;
};

export type QuotaUsageSnapshot = {
  capturedAt: string;
  databaseBytes: number;
  databaseLevel: QuotaLevel;
  tables: QuotaTableUsage[];
  storage: {
    bucket: string;
    objectCount: number;
    bytes: number;
    level: QuotaLevel;
  };
  /** Egress is only visible in Supabase Dashboard → Project Settings → Usage */
  egressNote: string;
};

type RpcSnapshot = {
  captured_at?: string;
  database_bytes?: number;
  tables?: Array<{ table?: string; bytes?: number; estimated_rows?: number }>;
  storage?: { bucket?: string; object_count?: number; bytes?: number };
};

export function classifyQuotaUsage(usedBytes: number, limitBytes: number): QuotaLevel {
  const ratio = limitBytes > 0 ? usedBytes / limitBytes : 0;
  if (ratio >= 0.8) return 'red';
  if (ratio >= 0.5) return 'yellow';
  return 'green';
}

export function formatQuotaBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${Math.round(bytes)} B`;
}

export function quotaPercent(usedBytes: number, limitBytes: number): number {
  if (limitBytes <= 0) return 0;
  return Math.min(100, Math.round((usedBytes / limitBytes) * 1000) / 10);
}

function parseRpcSnapshot(raw: RpcSnapshot): QuotaUsageSnapshot {
  const databaseBytes = Number(raw.database_bytes ?? 0);
  const storageBytes = Number(raw.storage?.bytes ?? 0);

  return {
    capturedAt: raw.captured_at ?? new Date().toISOString(),
    databaseBytes,
    databaseLevel: classifyQuotaUsage(databaseBytes, SUPABASE_FREE_LIMITS.databaseBytes),
    tables: (raw.tables ?? []).map((row) => ({
      table: row.table ?? 'unknown',
      bytes: Number(row.bytes ?? 0),
      estimatedRows: Number(row.estimated_rows ?? 0),
    })),
    storage: {
      bucket: raw.storage?.bucket ?? 'ugc-photos',
      objectCount: Number(raw.storage?.object_count ?? 0),
      bytes: storageBytes,
      level: classifyQuotaUsage(storageBytes, SUPABASE_FREE_LIMITS.storageBytes),
    },
    egressNote:
      '出站流量（Egress）请在 Supabase Dashboard → Project Settings → Usage 查看（Free 限额 5 GB/月）。',
  };
}

export async function collectQuotaUsageSnapshot(
  supabase: SupabaseClient,
): Promise<QuotaUsageSnapshot> {
  const { data, error } = await supabase.rpc('get_quota_usage_snapshot');
  if (error) {
    throw new Error(`get_quota_usage_snapshot failed: ${error.message}`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('get_quota_usage_snapshot returned empty payload');
  }
  return parseRpcSnapshot(data as RpcSnapshot);
}
