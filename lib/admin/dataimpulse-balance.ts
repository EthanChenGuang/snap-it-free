export type DataImpulseBalanceInfo = {
  balanceUsd: number | null;
  remainingGb: number | null;
  source: 'api' | 'env' | null;
  error: string | null;
};

type TokenResponse = {
  token?: string;
};

type BalanceResponse = {
  balance?: number;
};

export async function fetchDataImpulseBalanceInfo(
  fetchFn: typeof fetch = fetch,
): Promise<DataImpulseBalanceInfo> {
  const envRemainingGb = parseEnvNumber('DATAIMPULSE_REMAINING_GB');
  const envBalanceUsd = parseEnvNumber('DATAIMPULSE_BALANCE_USD');

  if (envRemainingGb != null || envBalanceUsd != null) {
    return {
      balanceUsd: envBalanceUsd,
      remainingGb: envRemainingGb,
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
      source: null,
      error: null,
    };
  }

  try {
    const tokenResponse = await fetchFn('https://api.dataimpulse.com/reseller/user/token/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
      signal: AbortSignal.timeout(8000),
    });

    if (!tokenResponse.ok) {
      return {
        balanceUsd: null,
        remainingGb: null,
        source: null,
        error: `DataImpulse token 请求失败 (${tokenResponse.status})`,
      };
    }

    const tokenPayload = (await tokenResponse.json()) as TokenResponse;
    const token = tokenPayload.token?.trim();
    if (!token) {
      return {
        balanceUsd: null,
        remainingGb: null,
        source: null,
        error: 'DataImpulse token 响应为空',
      };
    }

    const balanceResponse = await fetchFn('https://api.dataimpulse.com/reseller/user/balance', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });

    if (!balanceResponse.ok) {
      return {
        balanceUsd: null,
        remainingGb: null,
        source: null,
        error: `DataImpulse balance 请求失败 (${balanceResponse.status})`,
      };
    }

    const balancePayload = (await balanceResponse.json()) as BalanceResponse;
    const balanceUsd =
      typeof balancePayload.balance === 'number' && Number.isFinite(balancePayload.balance)
        ? balancePayload.balance
        : null;

    return {
      balanceUsd,
      remainingGb: null,
      source: 'api',
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DataImpulse API 请求失败';
    return {
      balanceUsd: null,
      remainingGb: null,
      source: null,
      error: message,
    };
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
