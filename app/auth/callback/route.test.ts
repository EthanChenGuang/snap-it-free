import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchangeCodeForSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { exchangeCodeForSession } }) }));

import { GET } from './route';

const call = (query: string) => GET(new Request(`https://app.test/auth/callback${query}`));

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /auth/callback', () => {
  it('redirects to next after a successful exchange', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await call('?code=abc&next=%2FListing%2F1');
    expect(res.headers.get('location')).toBe('https://app.test/Listing/1');
  });

  it('adds ?auth=error to a next without a query', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad' } });
    const res = await call('?code=abc&next=%2Fsettings');
    expect(res.headers.get('location')).toBe('https://app.test/settings?auth=error');
  });

  it('keeps an existing query on next and appends with & (one question mark)', async () => {
    const res = await call('?error=access_denied&next=%2F%3Fonboarding%3Dresume');
    const location = res.headers.get('location')!;
    expect(location.split('?')).toHaveLength(2);
    const url = new URL(location);
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('onboarding')).toBe('resume');
    expect(url.searchParams.get('auth')).toBe('error');
    expect(url.searchParams.get('provider')).toBe('access_denied');
  });

  it('fails with auth=error when the code is missing', async () => {
    const res = await call('?next=%2F');
    expect(res.headers.get('location')).toBe('https://app.test/?auth=error');
  });
});
