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
      { type: 'next' }, // how → weekly
      { type: 'next' }, // weekly → map
      { type: 'next' }, // map → favorites
      { type: 'next' }, // favorites → contact
      { type: 'next' }, // contact → trust
      { type: 'next' }, // trust → interests
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
      'weekly',
      'map',
      'favorites',
      'contact',
      'trust',
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
    state = onboardingReducer(state, { type: 'toggleInterest', interest: 'pets' });
    expect(state.interests).toEqual(['pets']);
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
  it('numbers the thirteen intro steps and excludes the paywall', () => {
    expect(
      ['hook', 'how', 'weekly', 'map', 'favorites', 'contact', 'trust', 'interests', 'mobility', 'city', 'preview', 'account', 'alerts', 'paywall'].map((s) =>
        introStepIndex(s as never),
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, -1]);
  });
});

describe('resume state', () => {
  it('serializes and parses round-trip', () => {
    const state: OnboardingState = {
      screen: 'alerts',
      city: 'venice',
      interests: ['books', 'pets'],
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

describe('alerts step where push cannot work in this tab', () => {
  const at = (screen: OnboardingState['screen'], alertsAvailable: boolean): OnboardingState => ({
    ...INITIAL_ONBOARDING_STATE,
    screen,
    alertsAvailable,
  });

  it('goes straight from the account step to the paywall', () => {
    expect(onboardingReducer(at('account', false), { type: 'next' }).screen).toBe('paywall');
    expect(onboardingReducer(at('account', true), { type: 'next' }).screen).toBe('alerts');
  });

  it('resuming onto the alerts step lands on the paywall and keeps this tab’s capability', () => {
    const resumed = onboardingReducer(at('hook', false), { type: 'resume', state: at('alerts', true) });
    expect(resumed.screen).toBe('paywall');
    expect(resumed.alertsAvailable).toBe(false);
  });
});

describe('city step "Other" (every city)', () => {
  it('counts as an answer so Continue works, and is stored as "all"', () => {
    let state: OnboardingState = { ...INITIAL_ONBOARDING_STATE, screen: 'city' };
    expect(onboardingReducer(state, { type: 'next' }).screen).toBe('city');
    state = onboardingReducer(state, { type: 'selectCity', city: 'all' });
    expect(state.city).toBe('all');
    expect(onboardingReducer(state, { type: 'next' }).screen).toBe('preview');
  });
});

describe('free onboarding (withPaywall: false)', () => {
  const free: OnboardingState = { ...INITIAL_ONBOARDING_STATE, withPaywall: false };
  const at = (screen: OnboardingState['screen'], extra: Partial<OnboardingState> = {}): OnboardingState => ({
    ...free,
    screen,
    ...extra,
  });

  it('finishes after the alerts step instead of reaching the paywall', () => {
    expect(onboardingReducer(at('alerts'), { type: 'next' }).screen).toBe('done');
    expect(onboardingReducer(at('account', { alertsAvailable: true }), { type: 'next' }).screen).toBe('alerts');
  });

  it('finishes straight after the account step when alerts are unavailable', () => {
    expect(onboardingReducer(at('account', { alertsAvailable: false }), { type: 'next' }).screen).toBe('done');
  });

  it('goTo paywall leads to done; other targets are unchanged', () => {
    expect(onboardingReducer(at('preview'), { type: 'goTo', screen: 'paywall' }).screen).toBe('done');
    expect(onboardingReducer(at('preview'), { type: 'goTo', screen: 'account' }).screen).toBe('account');
  });

  it('a resume state that points at the paywall (or alerts without push) ends the flow', () => {
    const saved = at('paywall', { withPaywall: undefined });
    expect(onboardingReducer(free, { type: 'resume', state: saved }).screen).toBe('done');
    const alerts = { ...INITIAL_ONBOARDING_STATE, screen: 'alerts' as const };
    const noPush = { ...free, alertsAvailable: false };
    expect(onboardingReducer(noPush, { type: 'resume', state: alerts }).screen).toBe('done');
    expect(onboardingReducer(free, { type: 'resume', state: at('account') }).screen).toBe('account');
    expect(onboardingReducer(free, { type: 'resume', state: at('account') }).withPaywall).toBe(false);
  });

  it('paid mode (default) is unchanged', () => {
    expect(onboardingReducer({ ...INITIAL_ONBOARDING_STATE, screen: 'alerts' }, { type: 'next' }).screen).toBe('paywall');
    expect(onboardingReducer({ ...INITIAL_ONBOARDING_STATE, screen: 'preview' }, { type: 'goTo', screen: 'paywall' }).screen).toBe('paywall');
    expect(onboardingReducer({ ...INITIAL_ONBOARDING_STATE, withPaywall: true, screen: 'alerts' }, { type: 'next' }).screen).toBe('paywall');
  });
});

describe('contact step (zh/en only)', () => {
  const at = (screen: OnboardingState['screen'], extra: Partial<OnboardingState> = {}): OnboardingState => ({
    ...INITIAL_ONBOARDING_STATE,
    screen,
    ...extra,
  });

  it('sits between favorites and trust', () => {
    expect(onboardingReducer(at('favorites'), { type: 'next' }).screen).toBe('contact');
    expect(onboardingReducer(at('contact'), { type: 'next' }).screen).toBe('trust');
    expect(onboardingReducer(at('trust'), { type: 'back' }).screen).toBe('contact');
    expect(onboardingReducer(at('contact'), { type: 'back' }).screen).toBe('favorites');
  });

  it('is skipped in both directions when the language has no assistant', () => {
    const it = { contactAvailable: false };
    expect(onboardingReducer(at('favorites', it), { type: 'next' }).screen).toBe('trust');
    expect(onboardingReducer(at('trust', it), { type: 'back' }).screen).toBe('favorites');
  });

  it('skip from the contact step lands on the preview, and it is skippable', () => {
    expect(isSkippable('contact')).toBe(true);
    expect(onboardingReducer(at('contact'), { type: 'skip' }).screen).toBe('preview');
  });

  it('switching to an unsupported language on the step moves on; switching back keeps the flag', () => {
    const moved = onboardingReducer(at('contact'), { type: 'setContactAvailable', available: false });
    expect(moved.screen).toBe('trust');
    expect(moved.contactAvailable).toBe(false);
    expect(onboardingReducer(at('map'), { type: 'setContactAvailable', available: false }).screen).toBe('map');
    expect(onboardingReducer(moved, { type: 'setContactAvailable', available: true }).contactAvailable).toBe(true);
  });

  it('resume onto the contact step lands on trust when unavailable, and keeps this language state', () => {
    const resumed = onboardingReducer(at('hook', { contactAvailable: false }), { type: 'resume', state: at('contact') });
    expect(resumed.screen).toBe('trust');
    expect(resumed.contactAvailable).toBe(false);
    expect(onboardingReducer(at('hook'), { type: 'resume', state: at('contact') }).screen).toBe('contact');
  });

  it('a resume state saved before this step existed still parses', () => {
    const old = JSON.stringify({ screen: 'account', city: 'venice', interests: ['books'], mobility: 'bike', radiusKm: 5, locationGranted: false });
    expect(parseResumeState(old)?.screen).toBe('account');
  });
});
