import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canRequestPushPermission,
  isIOS,
  isIosPushDismissed,
  isStandalonePwa,
  needsIosInstallGuide,
  setIosPushDismissed,
} from './ios-detect';

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

describe('canRequestPushPermission', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when not logged in', () => {
    expect(canRequestPushPermission(false)).toBe(false);
  });

  it('returns false on iOS non-standalone without dismiss', () => {
    expect(canRequestPushPermission(true)).toBe(false);
  });

  it('returns true on iOS standalone', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
      })),
      localStorage: { getItem: vi.fn(() => null), setItem: vi.fn() },
    });
    expect(canRequestPushPermission(true)).toBe(true);
  });

  it('returns true on iOS when guide dismissed', () => {
    setIosPushDismissed();
    expect(isIosPushDismissed()).toBe(true);
    expect(canRequestPushPermission(true)).toBe(true);
  });

  it('returns true on non-iOS when logged in', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    expect(canRequestPushPermission(true)).toBe(true);
  });
});

describe('needsIosInstallGuide', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    });
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true for iOS non-standalone without dismiss', () => {
    expect(needsIosInstallGuide()).toBe(true);
  });

  it('returns false when dismissed', () => {
    setIosPushDismissed();
    expect(needsIosInstallGuide()).toBe(false);
  });
});
