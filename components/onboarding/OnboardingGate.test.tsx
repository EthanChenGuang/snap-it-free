import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, flush, render } from '@/components/test/render';
import { FILTER_PREFS_STORAGE_KEY } from '@/lib/filter-prefs/storage';
import { ONBOARDING_COMPLETED_STORAGE_KEY, markOnboardingCompleted } from '@/lib/paywall/gate';
import { click } from '@/components/test/render';
import { OnboardingGate } from './OnboardingGate';

const auth = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false }));
vi.mock('@/lib/auth/useAuthSession', () => ({ useAuthSession: () => ({ user: auth.user, email: null, loading: auth.loading }) }));
vi.mock('@/components/providers/PwaOnboardingProvider', () => ({ usePwaOnboarding: () => ({ setAutoOpenSuspended: () => {} }) }));
// The stub finishes like the real flow: marks onboarding completed, then calls onFinish.
vi.mock('next/dynamic', () => ({
  default: () =>
    function FlowStub({ onFinish }: { onFinish: () => void }) {
      return (
        <button
          data-testid="flow"
          onClick={() => {
            markOnboardingCompleted(window.localStorage);
            onFinish();
          }}
        />
      );
    },
}));

const flow = () => document.body.querySelector('[data-testid="flow"]');
const completed = () => localStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY);

async function mount(everyVisit = false) {
  await render(<OnboardingGate everyVisit={everyVisit} />, 'zh');
  await flush();
}

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  window.history.replaceState(null, '', '/');
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await cleanup();
  localStorage.clear();
});

describe.each([
  ['free mode', { onboarding: 'true', paywall: '' }, true],
  ['paid mode', { onboarding: '', paywall: 'true' }, false],
])('OnboardingGate in %s', (_name, env, free) => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', env.onboarding);
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', env.paywall);
  });

  it('opens for a first-time visitor (no session, no saved filters)', async () => {
    await mount();
    expect(flow()).not.toBeNull();
  });

  it(free ? 'skips for a signed-in user and marks onboarding completed' : 'still opens for a signed-in user', async () => {
    auth.user = { id: 'u1' };
    await mount();
    expect(flow() === null).toBe(free);
    expect(completed()).toBe(free ? '1' : null);
  });

  it(free ? 'skips when the browser has saved feed filters' : 'still opens with saved feed filters', async () => {
    localStorage.setItem(FILTER_PREFS_STORAGE_KEY, JSON.stringify({ mode: 'city', city: 'milan' }));
    await mount();
    expect(flow() === null).toBe(free);
    expect(completed()).toBe(free ? '1' : null);
  });

  it('?onboarding=1 still forces the flow for a signed-in user', async () => {
    auth.user = { id: 'u1' };
    window.history.replaceState(null, '', '/?onboarding=1');
    await mount();
    expect(flow()).not.toBeNull();
  });
});

describe('OnboardingGate free mode while the session is loading', () => {
  it('shows nothing until the session state is known, then opens for a guest', async () => {
    vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', '');
    auth.loading = true;
    await mount();
    expect(flow()).toBeNull();
    expect(completed()).toBeNull();
  });
});

describe.each([
  ['paid mode', { onboarding: '', paywall: 'true' }],
  ['free mode', { onboarding: 'true', paywall: '' }],
])('OnboardingGate finishing in %s', (_name, env) => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', env.onboarding);
    vi.stubEnv('NEXT_PUBLIC_PAYWALL_ENABLED', env.paywall);
  });

  it('closes the overlay and writes the completed flag', async () => {
    await mount();
    await click(flow());
    await flush();
    expect(flow()).toBeNull();
    expect(completed()).toBe('1');
  });

  it('with everyVisit (non-production Preview) it still stays closed after finishing', async () => {
    await mount(true);
    expect(flow()).not.toBeNull();
    await click(flow());
    await flush();
    expect(flow()).toBeNull();
    expect(completed()).toBe('1');
  });
});
