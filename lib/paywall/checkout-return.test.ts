// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readFilterPrefs } from '@/lib/filter-prefs/storage';
import { ONBOARDING_COMPLETED_STORAGE_KEY } from './gate';
import { persistResumeState, type OnboardingState } from './onboarding-flow';
import {
  applyCheckoutReturnChoices,
  checkoutReturnNotice,
  parseCheckoutParam,
  urlWithoutCheckoutParam,
} from './checkout-return';

describe('parseCheckoutParam', () => {
  it('accepts the three Stripe return values', () => {
    expect(parseCheckoutParam('?checkout=success')).toBe('success');
    expect(parseCheckoutParam('checkout=pending')).toBe('pending');
    expect(parseCheckoutParam('?checkout=cancel&x=1')).toBe('cancel');
  });

  it('ignores anything else', () => {
    expect(parseCheckoutParam('')).toBeNull();
    expect(parseCheckoutParam('?onboarding=1')).toBeNull();
    expect(parseCheckoutParam('?checkout=ok')).toBeNull();
  });
});

describe('checkoutReturnNotice', () => {
  it.each([
    ['open', 'success', 'success'],
    ['open', 'pending', 'success'],
    ['locked', 'success', 'pending'],
    ['locked', 'pending', 'pending'],
    ['open', 'cancel', null],
    ['locked', 'cancel', null],
    ['open', null, null],
    ['locked', null, null],
  ] as const)('access=%s checkout=%s → %s', (access, checkout, expected) => {
    expect(checkoutReturnNotice(access, checkout)).toBe(expected);
  });
});

describe('urlWithoutCheckoutParam', () => {
  it('drops only the checkout param', () => {
    expect(urlWithoutCheckoutParam('http://localhost:3000/?checkout=success')).toBe('/');
    expect(urlWithoutCheckoutParam('http://localhost:3000/?q=sofa&checkout=pending#top')).toBe('/?q=sofa#top');
  });
});

describe('applyCheckoutReturnChoices', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('marks onboarding complete and writes city, interests and radius from resume', () => {
    const resume: OnboardingState = {
      screen: 'paywall',
      city: 'venice',
      interests: ['books'],
      mobility: 'bike',
      radiusKm: 5,
      locationGranted: false,
    };
    persistResumeState(sessionStorage, resume);
    applyCheckoutReturnChoices(localStorage, sessionStorage);
    expect(localStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY)).toBe('1');
    const prefs = readFilterPrefs();
    expect(prefs.city).toBe('venice');
    expect(prefs.categories).toEqual(['libri-riviste']);
    expect(prefs.radiusKm).toBe(5);
    expect(prefs.mode).toBe('city');
    expect(sessionStorage.length).toBe(0);
  });

  it('still marks complete when there is no resume state', () => {
    applyCheckoutReturnChoices(localStorage, sessionStorage);
    expect(localStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY)).toBe('1');
  });
});
