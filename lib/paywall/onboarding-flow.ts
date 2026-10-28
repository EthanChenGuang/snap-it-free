import type { ConsumerCityKey } from '@/lib/geo/italian-cities';

export const INTRO_STEPS = ['welcome', 'how', 'city', 'alerts'] as const;

export type IntroStep = (typeof INTRO_STEPS)[number];
export type OnboardingScreen = IntroStep | 'paywall' | 'done';

export type OnboardingState = {
  screen: OnboardingScreen;
  city: ConsumerCityKey | null;
};

export type OnboardingAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'selectCity'; city: ConsumerCityKey }
  | { type: 'finish' };

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  screen: 'welcome',
  city: null,
};

const SCREEN_ORDER: readonly OnboardingScreen[] = [...INTRO_STEPS, 'paywall', 'done'];

export function introStepIndex(screen: OnboardingScreen): number {
  return INTRO_STEPS.indexOf(screen as IntroStep);
}

/** The city step cannot advance until a city is picked (Skip still bypasses it). */
export function canAdvance(state: OnboardingState): boolean {
  return state.screen !== 'city' || state.city !== null;
}

function shift(screen: OnboardingScreen, delta: 1 | -1): OnboardingScreen {
  const index = SCREEN_ORDER.indexOf(screen);
  return SCREEN_ORDER[Math.min(Math.max(index + delta, 0), SCREEN_ORDER.length - 1)];
}

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  if (state.screen === 'done') return state;

  switch (action.type) {
    case 'next':
      if (state.screen === 'paywall' || !canAdvance(state)) return state;
      return { ...state, screen: shift(state.screen, 1) };
    case 'back':
      if (state.screen === 'welcome' || state.screen === 'paywall') return state;
      return { ...state, screen: shift(state.screen, -1) };
    case 'skip':
      if (state.screen === 'paywall') return state;
      return { ...state, screen: 'paywall' };
    case 'selectCity':
      if (state.screen !== 'city') return state;
      return { ...state, city: action.city };
    case 'finish':
      return { ...state, screen: 'done' };
  }
}
