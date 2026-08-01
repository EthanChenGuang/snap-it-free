import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next-path';

describe('safeNextPath', () => {
  it('blocks protocol-relative open redirect', () => {
    expect(safeNextPath('//evil.com')).toBe('/post');
  });

  it('allows same-origin paths with query strings', () => {
    expect(safeNextPath('/settings?tab=alerts')).toBe('/settings?tab=alerts');
  });

  it('returns /post when next is null or empty', () => {
    expect(safeNextPath(null)).toBe('/post');
    expect(safeNextPath('')).toBe('/post');
  });

  it('blocks paths that do not start with /', () => {
    expect(safeNextPath('https://evil.com')).toBe('/post');
    expect(safeNextPath('evil.com')).toBe('/post');
  });
});
