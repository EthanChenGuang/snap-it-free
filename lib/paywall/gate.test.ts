// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ONBOARDING_COMPLETED_STORAGE_KEY,
  hasOnboardingForceParam,
  isAccountSkipStubAllowed,
  isForceParamValue,
  isPaywallFlagEnabled,
  markOnboardingCompleted,
  readOnboardingCompleted,
  resolveListingAccess,
  resolveOnboardingGate,
  shouldShowOnboarding,
  urlWithoutForceParam,
} from './gate';

describe('isAccountSkipStubAllowed', () => {
  it('is OFF only in a production build', () => {
    expect(isAccountSkipStubAllowed('production')).toBe(false);
  });

  it('is ON for Vercel Preview, local dev and an undefined-local build', () => {
    expect(isAccountSkipStubAllowed('preview')).toBe(true);
    expect(isAccountSkipStubAllowed('development')).toBe(true);
    expect(isAccountSkipStubAllowed('')).toBe(true);
    expect(isAccountSkipStubAllowed(undefined)).toBe(true);
  });

  it('reads NEXT_PUBLIC_VERCEL_ENV by default so production can never skip sign-up', () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    expect(isAccountSkipStubAllowed()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
    expect(isAccountSkipStubAllowed()).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe('isPaywallFlagEnabled', () => {
  it('is on only for the exact string "true"', () => {
    expect(isPaywallFlagEnabled('true')).toBe(true);
    expect(isPaywallFlagEnabled(undefined)).toBe(false);
    expect(isPaywallFlagEnabled('')).toBe(false);
    expect(isPaywallFlagEnabled('1')).toBe(false);
    expect(isPaywallFlagEnabled('TRUE')).toBe(false);
  });

  it('defaults to off when the env var is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', '');
    expect(isPaywallFlagEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('hasOnboardingForceParam', () => {
  it('matches onboarding=1 among other params', () => {
    expect(hasOnboardingForceParam('?onboarding=1')).toBe(true);
    expect(hasOnboardingForceParam('?q=sofa&onboarding=1')).toBe(true);
    expect(hasOnboardingForceParam('')).toBe(false);
    expect(hasOnboardingForceParam('?onboarding=0')).toBe(false);
    expect(hasOnboardingForceParam('?onboarding=true')).toBe(false);
    expect(hasOnboardingForceParam('?onboarding=resume')).toBe(true);
  });
});

describe('shouldShowOnboarding', () => {
  it.each([
    [{ flagEnabled: false, forced: false, completed: false }, false],
    [{ flagEnabled: false, forced: false, completed: true }, false],
    [{ flagEnabled: true, forced: false, completed: false }, true],
    [{ flagEnabled: true, forced: false, completed: true }, false],
    [{ flagEnabled: false, forced: true, completed: true }, true],
    [{ flagEnabled: true, forced: true, completed: true }, true],
  ])('%o → %s', (input, expected) => {
    expect(shouldShowOnboarding(input)).toBe(expected);
  });
});

describe('completion storage', () => {
  afterEach(() => localStorage.clear());

  it('round-trips through the versioned key', () => {
    expect(readOnboardingCompleted(localStorage)).toBe(false);
    markOnboardingCompleted(localStorage);
    expect(localStorage.getItem('shoumanwu_onboarding_completed_v2')).toBe('1');
    expect(readOnboardingCompleted(localStorage)).toBe(true);
  });

  it('treats a missing or throwing storage as not completed', () => {
    expect(readOnboardingCompleted(undefined)).toBe(false);
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(readOnboardingCompleted(throwing)).toBe(false);
    expect(() => markOnboardingCompleted({ setItem: () => { throw new Error('quota'); } })).not.toThrow();
  });
});

describe('resolveOnboardingGate', () => {
  afterEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('stays hidden with the flag off and no param', () => {
    expect(resolveOnboardingGate(false)).toBe(false);
  });

  it('shows once with the flag on, then hides after completion', () => {
    expect(resolveOnboardingGate(true)).toBe(true);
    localStorage.setItem(ONBOARDING_COMPLETED_STORAGE_KEY, '1');
    expect(resolveOnboardingGate(true)).toBe(false);
  });

  it('forces the flow via ?onboarding=1 even when off and completed', () => {
    localStorage.setItem(ONBOARDING_COMPLETED_STORAGE_KEY, '1');
    window.history.replaceState(null, '', '/?onboarding=1');
    expect(resolveOnboardingGate(false)).toBe(true);
  });
});

describe('urlWithoutForceParam', () => {
  it('removes only the onboarding param', () => {
    expect(urlWithoutForceParam('http://localhost:3000/?onboarding=1')).toBe('/');
    expect(urlWithoutForceParam('http://localhost:3000/?q=sofa&onboarding=1#top')).toBe('/?q=sofa#top');
  });
});

describe('resolveListingAccess', () => {
  it.each([
    [{ flagEnabled: false, preview: false, subscribed: false }, 'open'],
    [{ flagEnabled: true, preview: false, subscribed: false }, 'locked'],
    [{ flagEnabled: true, preview: false, subscribed: true }, 'open'],
    [{ flagEnabled: false, preview: true, subscribed: false }, 'locked'],
    [{ flagEnabled: false, preview: true, subscribed: true }, 'open'],
  ])('%o → %s', (input, expected) => {
    expect(resolveListingAccess(input)).toBe(expected);
  });
});

describe('isForceParamValue', () => {
  it('accepts only a single "1"', () => {
    expect(isForceParamValue('1')).toBe(true);
    expect(isForceParamValue(undefined)).toBe(false);
    expect(isForceParamValue(['1', '1'])).toBe(false);
    expect(isForceParamValue('yes')).toBe(false);
  });
});
