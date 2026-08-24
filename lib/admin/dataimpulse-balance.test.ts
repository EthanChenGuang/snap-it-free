import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extractProxyUsername,
  fetchDataImpulseUsageInfo,
  parseSubUserUsage,
  pickSubUserRow,
} from './dataimpulse-balance';

describe('extractProxyUsername', () => {
  it('reads username from proxy URL', () => {
    expect(extractProxyUsername('http://alice:secret@64.137.96.74:6641')).toBe('alice');
  });
});

describe('pickSubUserRow', () => {
  it('matches sub-user by login', () => {
    const rows = [{ login: 'other' }, { login: 'alice', traffic_balance: 3.2 }];
    expect(pickSubUserRow(rows, 'alice')?.login).toBe('alice');
  });
});

describe('parseSubUserUsage', () => {
  it('reads traffic fields from sub-user payload', () => {
    expect(
      parseSubUserUsage({
        traffic_balance: 4.5,
        traffic_used: 0.8,
        money_used: 0.8,
      }),
    ).toEqual({
      remainingGb: 4.5,
      monthTrafficGb: 0.8,
      monthCostUsd: 0.8,
    });
  });
});

describe('fetchDataImpulseUsageInfo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns env overrides without calling API', async () => {
    vi.stubEnv('DATAIMPULSE_REMAINING_GB', '4.2');
    vi.stubEnv('DATAIMPULSE_MONTH_TRAFFIC_GB', '0.22');
    const fetchFn = vi.fn();
    const usage = await fetchDataImpulseUsageInfo({}, fetchFn);
    expect(usage.source).toBe('env');
    expect(usage.remainingGb).toBe(4.2);
    expect(usage.monthTrafficGb).toBe(0.22);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('maps balance USD to remaining GB when sub-user info is unavailable', async () => {
    vi.stubEnv('DATAIMPULSE_API_LOGIN', 'user');
    vi.stubEnv('DATAIMPULSE_API_PASSWORD', 'pass');

    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/token/get')) {
        return new Response(JSON.stringify({ token: 'abc' }), { status: 200 });
      }
      if (url.endsWith('/balance')) {
        return new Response(JSON.stringify({ balance: 10 }), { status: 200 });
      }
      if (url.endsWith('/sub-user/info')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const usage = await fetchDataImpulseUsageInfo({}, fetchFn);
    expect(usage.source).toBe('api');
    expect(usage.balanceUsd).toBe(10);
    expect(usage.remainingGb).toBe(10);
  });
});
