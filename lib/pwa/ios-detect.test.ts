import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isIOS, isStandalonePwa } from './ios-detect';

describe('isStandalonePwa', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal('navigator', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when display-mode standalone matches', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
      })),
    });
    expect(isStandalonePwa()).toBe(true);
  });

  it('returns true when legacy navigator.standalone is true', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal('navigator', { standalone: true });
    expect(isStandalonePwa()).toBe(true);
  });
});

describe('isIOS', () => {
  it('returns true for iPhone user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    expect(isIOS()).toBe(true);
  });

  it('returns false for Android user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    expect(isIOS()).toBe(false);
  });
});
