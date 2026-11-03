import { describe, expect, it } from 'vitest';
import {
  INITIAL_ONBOARDING_STATE,
  introStepIndex,
  onboardingReducer,
  type OnboardingAction,
  type OnboardingState,
} from './onboarding-flow';

function run(actions: OnboardingAction[], from: OnboardingState = INITIAL_ONBOARDING_STATE) {
  return actions.reduce(onboardingReducer, from);
}

describe('onboardingReducer', () => {
  it('walks welcome → how → city → alerts → paywall with a city picked', () => {
    const screens: string[] = [];
    let state = INITIAL_ONBOARDING_STATE;
    const steps: OnboardingAction[] = [
      { type: 'next' },
      { type: 'next' },
      { type: 'selectCity', city: 'padova' },
      { type: 'next' },
      { type: 'next' },
    ];
    for (const action of steps) {
      state = onboardingReducer(state, action);
      screens.push(state.screen);
    }
    expect(screens).toEqual(['how', 'city', 'city', 'alerts', 'paywall']);
    expect(state.city).toBe('padova');
  });

  it('blocks Continue on the city step until a city is chosen', () => {
    const state = run([{ type: 'next' }, { type: 'next' }, { type: 'next' }]);
    expect(state.screen).toBe('city');
  });

  it('goes back one step and never before welcome', () => {
    expect(run([{ type: 'next' }, { type: 'next' }, { type: 'back' }]).screen).toBe('how');
    expect(run([{ type: 'back' }]).screen).toBe('welcome');
  });

  it('skips from any intro step straight to the paywall', () => {
    expect(run([{ type: 'skip' }]).screen).toBe('paywall');
    expect(run([{ type: 'next' }, { type: 'next' }, { type: 'skip' }]).screen).toBe('paywall');
  });

  it('turns the CTA into the coming-soon state without leaving the paywall', () => {
    const paywall = run([{ type: 'skip' }]);
    const after = onboardingReducer(paywall, { type: 'startPurchase' });
    expect(after).toEqual({ screen: 'paywall', city: null, purchase: 'comingSoon' });
    expect(onboardingReducer(INITIAL_ONBOARDING_STATE, { type: 'startPurchase' }).purchase).toBe('idle');
  });

  it('finishes from anywhere and stays done', () => {
    const done = run([{ type: 'next' }, { type: 'finish' }]);
    expect(done.screen).toBe('done');
    expect(run([{ type: 'back' }, { type: 'next' }], done).screen).toBe('done');
  });

  it('ignores city picks outside the city step', () => {
    expect(run([{ type: 'selectCity', city: 'roma' }]).city).toBeNull();
  });
});

describe('introStepIndex', () => {
  it('numbers intro steps and excludes the paywall', () => {
    expect(['welcome', 'how', 'city', 'alerts', 'paywall'].map((s) => introStepIndex(s as never))).toEqual([
      0, 1, 2, 3, -1,
    ]);
  });
});
