import { afterEach, describe, expect, it, vi } from 'vitest';
import { getListingAccess } from './server-access';

describe('getListingAccess', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is open with the flag off and no preview param', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', '');
    expect(await getListingAccess({})).toBe('open');
    expect(await getListingAccess({ onboarding: '0' })).toBe('open');
  });

  it('locks a non-subscriber when the flag is on or the gate is previewed', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', 'true');
    expect(await getListingAccess({})).toBe('locked');
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', '');
    expect(await getListingAccess({ onboarding: '1' })).toBe('locked');
  });
});
