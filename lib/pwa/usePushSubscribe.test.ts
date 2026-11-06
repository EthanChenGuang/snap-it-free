import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }),
}));

const EDGE_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/130.0 Mobile/15E148 Safari/605.1.15';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requestPushPermissionAndSubscribe on iPhone', () => {
  it('asks for the Home Screen install (not "unsupported") in a browser tab without PushManager', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(EDGE_IOS);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect('PushManager' in window).toBe(false);
    const { requestPushPermissionAndSubscribe } = await import('./usePushSubscribe');
    await expect(requestPushPermissionAndSubscribe()).resolves.toEqual({ ok: false, reason: 'ios_not_ready' });
  });
});
