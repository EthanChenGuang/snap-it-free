import { describe, expect, it } from 'vitest';
import { buildAuthRedirectPath } from './build-auth-redirect';

describe('buildAuthRedirectPath', () => {
  it('returns pathname when search params are empty', () => {
    expect(buildAuthRedirectPath('/listing/abc', '')).toBe('/listing/abc');
  });

  it('appends query string when search params are provided', () => {
    expect(buildAuthRedirectPath('/listing/abc', 'openDm=1')).toBe('/listing/abc?openDm=1');
  });

  it('normalizes unsafe pathnames via safeNextPath', () => {
    expect(buildAuthRedirectPath('//evil.com', '')).toBe('/post');
    expect(buildAuthRedirectPath('https://evil.com', 'openDm=1')).toBe('/post');
  });

  it('strips leading ? from search params string', () => {
    expect(buildAuthRedirectPath('/listing/abc', '?openDm=1')).toBe('/listing/abc?openDm=1');
  });
});
