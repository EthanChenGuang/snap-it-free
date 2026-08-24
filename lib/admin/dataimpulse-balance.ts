export type DataImpulseUsageInfo = {
  balanceUsd: number | null;
  remainingGb: number | null;
  monthTrafficGb: number | null;
  monthCostUsd: number | null;
  source: 'api' | 'env' | null;
  error: string | null;
};

type TokenResponse = {
  token?: string;
};

type BalanceResponse = {
  balance?: number;
};

type SubUserRow = Record<string, unknown>;

const RESIDENTIAL_USD_PER_GB = 1;

export function extractProxyUsername(proxyUrl: string | null | undefined): string | null {
  if (!proxyUrl?.trim()) {
    return null;
  }
  try {
    const username = new URL(proxyUrl.trim()).username;
    return username ? decodeURIComponent(username) : null;
  } catch {
    return null;
  }
}

function parseEnvNumber(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function readNumberField(row: SubUserRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function normalizeSubUserRows(payload: unknown): SubUserRow[] {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is SubUserRow => typeof row === 'object' && row != null);
  }
  if (typeof payload === 'object' && payload != null) {
    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'sub_users', 'subUsers', 'users', 'items', 'result']) {
      const nested = record[key];
      if (Array.isArray(nested)) {
        return nested.filter((row): row is SubUserRow => typeof row === 'object' && row != null);
      }
    }
  }
  return [];
}

export function pickSubUserRow(rows: SubUserRow[], proxyUsername: string | null): SubUserRow | null {
  if (rows.length === 0) {
    return null;
  }
  if (!proxyUsername) {
    return rows[0] ?? null;
  }

  const normalizedTarget = proxyUsername.trim().toLowerCase();
  return (
    rows.find((row) => {
      for (const key of ['login', 'username', 'user', 'label', 'name']) {
        const value = row[key];
        if (typeof value === 'string' && value.trim().toLowerCase() === normalizedTarget) {
          return true;
        }
      }
      return false;
    }) ?? rows[0] ?? null
  );
}

export function parseSubUserUsage(row: SubUserRow | null): {
  remainingGb: number | null;
  monthTrafficGb: number | null;
  monthCostUsd: number | null;
} {
  if (!row) {
    return { remainingGb: null, monthTrafficGb: null, monthCostUsd: null };
  }

  return {
    remainingGb: readNumberField(row, [
      'traffic_balance',
      'trafficBalance',
      'balance_gb',
      'balanceGb',
      'remaining_gb',
      'remainingGb',
      'traffic_left',
      'trafficLeft',
    ]),
    monthTrafficGb: readNumberField(row, [
      'traffic_used',
      'trafficUsed',
      'used_traffic',
      'usedTraffic',
      'month_traffic',
      'monthTraffic',
    ]),
    monthCostUsd: readNumberField(row, ['money_used', 'moneyUsed', 'spent', 'cost_usd', 'costUsd']),
  };
}

async function fetchDataImpulseToken(
  login: string,
  password: string,
  fetchFn: typeof fetch,
): Promise<{ token: string } | { error: string }> {
  const tokenResponse = await fetchFn('https://api.dataimpulse.com/reseller/user/token/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
    signal: AbortSignal.timeout(8000),
  });

  if (!tokenResponse.ok) {
    return { error: `DataImpulse token 请求失败 (${tokenResponse.status})` };
  }

  const tokenPayload = (await tokenResponse.json()) as TokenResponse;
  const token = tokenPayload.token?.trim();
  if (!token) {
    return { error: 'DataImpulse token 响应为空' };
  }

  return { token };
}

export async function fetchDataImpulseUsageInfo(
  options: { proxyUrl?: string | null } = {},
  fetchFn: typeof fetch = fetch,
): Promise<DataImpulseUsageInfo> {
  const envRemainingGb = parseEnvNumber('DATAIMPULSE_REMAINING_GB');
  const envBalanceUsd = parseEnvNumber('DATAIMPULSE_BALANCE_USD');
  const envMonthTrafficGb = parseEnvNumber('DATAIMPULSE_MONTH_TRAFFIC_GB');
  const envMonthCostUsd = parseEnvNumber('DATAIMPULSE_MONTH_COST_USD');

  if (
    envRemainingGb != null ||
    envBalanceUsd != null ||
    envMonthTrafficGb != null ||
    envMonthCostUsd != null
  ) {
    return {
      balanceUsd: envBalanceUsd,
      remainingGb: envRemainingGb ?? (envBalanceUsd != null ? envBalanceUsd / RESIDENTIAL_USD_PER_GB : null),
      monthTrafficGb: envMonthTrafficGb,
      monthCostUsd: envMonthCostUsd,
      source: 'env',
      error: null,
    };
  }

  const login = process.env.DATAIMPULSE_API_LOGIN?.trim();
  const password = process.env.DATAIMPULSE_API_PASSWORD?.trim();
  if (!login || !password) {
    return {
      balanceUsd: null,
      remainingGb: null,
      monthTrafficGb: null,
      monthCostUsd: null,
      source: null,
      error: null,
    };
  }

  try {
    const tokenResult = await fetchDataImpulseToken(login, password, fetchFn);
    if ('error' in tokenResult) {
      return {
        balanceUsd: null,
        remainingGb: null,
        monthTrafficGb: null,
        monthCostUsd: null,
        source: null,
        error: tokenResult.error,
      };
    }

    const { token } = tokenResult;
    const headers = { Authorization: `Bearer ${token}` };

    const [balanceResponse, subUserResponse] = await Promise.all([
      fetchFn('https://api.dataimpulse.com/reseller/user/balance', {
        headers,
        signal: AbortSignal.timeout(8000),
      }),
      fetchFn('https://api.dataimpulse.com/reseller/sub-user/info', {
        headers,
        signal: AbortSignal.timeout(8000),
      }).catch(() => null),
    ]);

    if (!balanceResponse.ok) {
      return {
        balanceUsd: null,
        remainingGb: null,
        monthTrafficGb: null,
        monthCostUsd: null,
        source: null,
        error: `DataImpulse balance 请求失败 (${balanceResponse.status})`,
      };
    }

    const balancePayload = (await balanceResponse.json()) as BalanceResponse;
    const balanceUsd =
      typeof balancePayload.balance === 'number' && Number.isFinite(balancePayload.balance)
        ? balancePayload.balance
        : null;

    let subUserUsage = { remainingGb: null as number | null, monthTrafficGb: null as number | null, monthCostUsd: null as number | null };
    if (subUserResponse?.ok) {
      const subUserPayload = (await subUserResponse.json()) as unknown;
      const rows = normalizeSubUserRows(subUserPayload);
      const matched = pickSubUserRow(rows, extractProxyUsername(options.proxyUrl));
      subUserUsage = parseSubUserUsage(matched);
    }

    const remainingGb =
      subUserUsage.remainingGb ??
      (balanceUsd != null ? Math.round((balanceUsd / RESIDENTIAL_USD_PER_GB) * 100) / 100 : null);

    return {
      balanceUsd,
      remainingGb,
      monthTrafficGb: subUserUsage.monthTrafficGb,
      monthCostUsd: subUserUsage.monthCostUsd ?? (subUserUsage.monthTrafficGb != null
        ? Math.round(subUserUsage.monthTrafficGb * RESIDENTIAL_USD_PER_GB * 10000) / 10000
        : null),
      source: 'api',
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DataImpulse API 请求失败';
    return {
      balanceUsd: null,
      remainingGb: null,
      monthTrafficGb: null,
      monthCostUsd: null,
      source: null,
      error: message,
    };
  }
}

/** @deprecated Use fetchDataImpulseUsageInfo */
export async function fetchDataImpulseBalanceInfo(
  fetchFn: typeof fetch = fetch,
): Promise<{
  balanceUsd: number | null;
  remainingGb: number | null;
  source: 'api' | 'env' | null;
  error: string | null;
}> {
  const usage = await fetchDataImpulseUsageInfo({}, fetchFn);
  return {
    balanceUsd: usage.balanceUsd,
    remainingGb: usage.remainingGb,
    source: usage.source,
    error: usage.error,
  };
}
