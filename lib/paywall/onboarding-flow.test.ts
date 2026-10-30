import { describe, expect, it } from 'vitest';
import {
  INITIAL_ONBOARDING_STATE,
  MOBILITY_RADIUS_KM,
  canAdvance,
  canGoBack,
  clearResumeState,
  introStepIndex,
  isSkippable,
  onboardingReducer,
  parseResumeState,
  persistResumeState,
  readResumeState,
  serializeResumeState,
  type OnboardingAction,
  type OnboardingState,
} from './onboarding-flow';

function run(actions: OnboardingAction[], from: OnboardingState = INITIAL_ONBOARDING_STATE) {
  return actions.reduce(onboardingReducer, from);
}

describe('onboardingReducer', () => {
  it('walks the full intro spine to the paywall when each step is answered', () => {
    const screens: string[] = [];
    let state = INITIAL_ONBOARDING_STATE;
    const steps: OnboardingAction[] = [
      { type: 'next' }, // hook → how
      { type: 'next' }, // how → interests
      { type: 'toggleInterest', interest: 'books' },
      { type: 'next' }, // interests → mobility
      { type: 'selectMobility', mobility: 'bike' },
      { type: 'next' }, // mobility → city
      { type: 'selectCity', city: 'venice' },
      { type: 'next' }, // city → preview
      { type: 'next' }, // preview → account
      { type: 'next' }, // account → alerts
      { type: 'next' }, // alerts → paywall
    ];
    for (const action of steps) {
      state = onboardingReducer(state, action);
      screens.push(state.screen);
    }
    expect(screens).toEqual([
      'how',
      'interests',
      'interests',
      'mobility',
      'mobility',
      'city',
      'city',
      'preview',
      'account',
      'alerts',
      'paywall',
    ]);
    expect(state.city).toBe('venice');
    expect(state.interests).toEqual(['books']);
    expect(state.mobility).toBe('bike');
    expect(state.radiusKm).toBe(MOBILITY_RADIUS_KM.bike);
  });

  it('gates Continue on interests, mobility and city', () => {
    expect(canAdvance({ ...INITIAL_ONBOARDING_STATE, screen: 'interests', interests: [] })).toBe(false);
    expect(canAdvance({ ...INITIAL_ONBOARDING_STATE, screen: 'interests', interests: ['books'] })).toBe(true);
    expect(canAdvance({ ...INITIAL_ONBOARDING_STATE, screen: 'mobility', mobility: null })).toBe(false);
    expect(canAdvance({ ...INITIAL_ONBOARDING_STATE, screen: 'mobility', mobility: 'car' })).toBe(true);
    expect(canAdvance({ ...INITIAL_ONBOARDING_STATE, screen: 'city', city: null })).toBe(false);
    expect(canAdvance({ ...INITIAL_ONBOARDING_STATE, screen: 'city', city: 'padova' })).toBe(true);
  });

  it('toggles interests with "everything" as an exclusive choice', () => {
    let state = onboardingReducer({ ...INITIAL_ONBOARDING_STATE, screen: 'interests' }, {
      type: 'toggleInterest',
      interest: 'books',
    });
    state = onboardingReducer(state, { type: 'toggleInterest', interest: 'everything' });
    expect(state.interests).toEqual(['everything']);
    state = onboardingReducer(state, { type: 'toggleInterest', interest: 'furniture' });
    expect(state.interests).toEqual(['furniture']);
  });

  it('skip from a value-prop step lands on the preview, not past it', () => {
    expect(run([{ type: 'skip' }]).screen).toBe('preview');
    expect(run([{ type: 'next' }, { type: 'next' }, { type: 'skip' }]).screen).toBe('preview');
  });

  it('never skips past the required account step', () => {
    const atAccount = run([{ type: 'goTo', screen: 'account' }]);
    expect(isSkippable('account')).toBe(false);
    expect(onboardingReducer(atAccount, { type: 'skip' }).screen).toBe('account');
  });

  it('goes back one step but never before the hook', () => {
    expect(run([{ type: 'next' }, { type: 'next' }, { type: 'back' }]).screen).toBe('how');
    expect(run([{ type: 'back' }]).screen).toBe('hook');
    expect(canGoBack('hook')).toBe(false);
    expect(canGoBack('paywall')).toBe(false);
  });

  it('finishes from anywhere and stays done', () => {
    const done = run([{ type: 'next' }, { type: 'finish' }]);
    expect(done.screen).toBe('done');
    expect(run([{ type: 'back' }, { type: 'next' }], done).screen).toBe('done');
  });

  it('ignores answers given outside their own step', () => {
    expect(run([{ type: 'selectCity', city: 'roma' }]).city).toBeNull();
    expect(run([{ type: 'selectMobility', mobility: 'car' }]).mobility).toBeNull();
    expect(run([{ type: 'toggleInterest', interest: 'books' }]).interests).toEqual([]);
  });
});

describe('introStepIndex', () => {
  it('numbers the eight intro steps and excludes the paywall', () => {
    expect(
      ['hook', 'how', 'interests', 'mobility', 'city', 'preview', 'account', 'alerts', 'paywall'].map((s) =>
        introStepIndex(s as never),
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, -1]);
  });
});

describe('resume state', () => {
  it('serializes and parses round-trip', () => {
    const state: OnboardingState = {
      screen: 'alerts',
      city: 'venice',
      interests: ['books', 'furniture'],
      mobility: 'foot',
      radiusKm: 1,
      locationGranted: true,
    };
    expect(parseResumeState(serializeResumeState(state))).toEqual(state);
  });

  it('rejects malformed or unknown-screen payloads', () => {
    expect(parseResumeState(null)).toBeNull();
    expect(parseResumeState('not json')).toBeNull();
    expect(parseResumeState(JSON.stringify({ screen: 'nope' }))).toBeNull();
  });

  it('persists, reads and clears through storage', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const state = { ...INITIAL_ONBOARDING_STATE, screen: 'account' as const, city: 'padova' as const };
    persistResumeState(storage, state);
    expect(readResumeState(storage)?.screen).toBe('account');
    clearResumeState(storage);
    expect(readResumeState(storage)).toBeNull();
  });
});
