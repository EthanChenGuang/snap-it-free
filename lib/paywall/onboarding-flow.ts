import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { reconcileInterestSelection } from '@/lib/paywall/onboarding-interests';

/**
 * Snag-modelled onboarding (quick 261028-ob2): hook → how → interests → mobility → city →
 * preview → account → alerts → paywall. The account step is a required sign-up (Guang,
 * 2026-10-28), so there is no path to the paywall that skips it. Skip only short-circuits the
 * value-prop run and lands on the personal preview, never past the account gate.
 */
export const INTRO_STEPS = [
  'hook',
  'how',
  'interests',
  'mobility',
  'city',
  'preview',
  'account',
  'alerts',
] as const;

export type IntroStep = (typeof INTRO_STEPS)[number];
export type OnboardingScreen = IntroStep | 'paywall' | 'done';

/** How far people travel for a free item → the default feed radius. */
export type MobilityKey = 'foot' | 'bike' | 'car';
export const MOBILITY_RADIUS_KM: Record<MobilityKey, number> = { foot: 1, bike: 5, car: 15 };

/** Skip from a value-prop step lands here, never past it. */
export const SKIP_TARGET: OnboardingScreen = 'preview';

/** Default radius when the user never answers the mobility question. */
export const DEFAULT_ONBOARDING_RADIUS_KM = 10;

export type OnboardingState = {
  screen: OnboardingScreen;
  city: ConsumerCityKey | null;
  /** Interest keys from onboarding-interests; drives the feed category filter and the preview count. */
  interests: string[];
  mobility: MobilityKey | null;
  radiusKm: number;
  locationGranted: boolean;
};

export type OnboardingAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'selectCity'; city: ConsumerCityKey }
  | { type: 'toggleInterest'; interest: string }
  | { type: 'selectMobility'; mobility: MobilityKey }
  | { type: 'grantLocation' }
  | { type: 'goTo'; screen: OnboardingScreen }
  | { type: 'resume'; state: OnboardingState }
  | { type: 'finish' };

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  screen: 'hook',
  city: null,
  interests: [],
  mobility: null,
  radiusKm: DEFAULT_ONBOARDING_RADIUS_KM,
  locationGranted: false,
};

const SCREEN_ORDER: readonly OnboardingScreen[] = [...INTRO_STEPS, 'paywall', 'done'];

export function introStepIndex(screen: OnboardingScreen): number {
  return INTRO_STEPS.indexOf(screen as IntroStep);
}

/** Skip is offered only before the preview (the value moment); after that the flow is linear. */
export function isSkippable(screen: OnboardingScreen): boolean {
  const index = introStepIndex(screen);
  return index >= 0 && index < introStepIndex(SKIP_TARGET);
}

/** Back is hidden on the first step and on the paywall. */
export function canGoBack(screen: OnboardingScreen): boolean {
  const index = SCREEN_ORDER.indexOf(screen);
  return index > 0 && screen !== 'paywall' && screen !== 'done';
}

/**
 * Whether the generic footer Continue may advance. The city, interests and mobility steps each
 * require an answer; account/alerts/preview render their own controls, so they are never gated here.
 */
export function canAdvance(state: OnboardingState): boolean {
  switch (state.screen) {
    case 'city':
      return state.city !== null;
    case 'interests':
      return state.interests.length > 0;
    case 'mobility':
      return state.mobility !== null;
    default:
      return true;
  }
}

function shift(screen: OnboardingScreen, delta: 1 | -1): OnboardingScreen {
  const index = SCREEN_ORDER.indexOf(screen);
  return SCREEN_ORDER[Math.min(Math.max(index + delta, 0), SCREEN_ORDER.length - 1)];
}

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  if (state.screen === 'done' && action.type !== 'resume') return state;

  switch (action.type) {
    case 'next':
      if (state.screen === 'paywall' || !canAdvance(state)) return state;
      return { ...state, screen: shift(state.screen, 1) };
    case 'back':
      if (!canGoBack(state.screen)) return state;
      return { ...state, screen: shift(state.screen, -1) };
    case 'skip':
      if (!isSkippable(state.screen)) return state;
      return { ...state, screen: SKIP_TARGET };
    case 'goTo':
      return { ...state, screen: action.screen };
    case 'selectCity':
      if (state.screen !== 'city') return state;
      return { ...state, city: action.city };
    case 'toggleInterest':
      if (state.screen !== 'interests') return state;
      return { ...state, interests: reconcileInterestSelection(state.interests, action.interest) };
    case 'selectMobility':
      if (state.screen !== 'mobility') return state;
      return { ...state, mobility: action.mobility, radiusKm: MOBILITY_RADIUS_KM[action.mobility] };
    case 'grantLocation':
      return { ...state, locationGranted: true };
    case 'resume':
      return action.state;
    case 'finish':
      return { ...state, screen: 'done' };
  }
}

// --- Resume across the account step's OAuth / email redirect -----------------------------------

/** Bumped to v2 for the Snag-modelled flow; the account step persists here before redirecting. */
export const ONBOARDING_RESUME_STORAGE_KEY = 'shoumanwu_onboarding_resume_v2';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

export function serializeResumeState(state: OnboardingState): string {
  return JSON.stringify(state);
}

/** Tolerant parse: unknown shapes return null so a bad value never breaks the flow. */
export function parseResumeState(raw: string | null): OnboardingState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState> & { screen?: unknown };
    if (typeof parsed.screen !== 'string' || !SCREEN_ORDER.includes(parsed.screen as OnboardingScreen)) {
      return null;
    }
    return {
      screen: parsed.screen as OnboardingScreen,
      city: (parsed.city as ConsumerCityKey | null) ?? null,
      interests: Array.isArray(parsed.interests)
        ? parsed.interests.filter((key): key is string => typeof key === 'string')
        : [],
      mobility:
        parsed.mobility === 'foot' || parsed.mobility === 'bike' || parsed.mobility === 'car'
          ? parsed.mobility
          : null,
      radiusKm:
        typeof parsed.radiusKm === 'number' && Number.isFinite(parsed.radiusKm)
          ? parsed.radiusKm
          : DEFAULT_ONBOARDING_RADIUS_KM,
      locationGranted: parsed.locationGranted === true,
    };
  } catch {
    return null;
  }
}

export function persistResumeState(storage: WritableStorage | undefined, state: OnboardingState): void {
  try {
    storage?.setItem(ONBOARDING_RESUME_STORAGE_KEY, serializeResumeState(state));
  } catch {
    // Private mode / quota: resume simply won't happen; the flow restarts.
  }
}

export function readResumeState(storage: ReadableStorage | undefined): OnboardingState | null {
  try {
    return parseResumeState(storage?.getItem(ONBOARDING_RESUME_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function clearResumeState(storage: WritableStorage | undefined): void {
  try {
    storage?.removeItem(ONBOARDING_RESUME_STORAGE_KEY);
  } catch {
    // ignore
  }
}
