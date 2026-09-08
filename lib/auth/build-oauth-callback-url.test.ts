import { describe, expect, it } from 'vitest';
import { buildOAuthCallbackUrl } from './build-oauth-callback-url';

describe('buildOAuthCallbackUrl', () => {
  it('builds callback URL with encoded next path', () => {
    expect(buildOAuthCallbackUrl('/listing/abc', 'https://example.com')).toBe(
      'https://example.com/auth/callback?next=%2Flisting%2Fabc',
    );
  });

  it('preserves query string in next path', () => {
    expect(buildOAuthCallbackUrl('/listing/abc?openDm=1', 'http://localhost:3003')).toBe(
      'http://localhost:3003/auth/callback?next=%2Flisting%2Fabc%3FopenDm%3D1',
    );
  });
});
